/**
 * Firestore Database Migration Tool
 * Migrates data from Staging Firestore (mywhiskey-97620) to Production Firestore (mywhiskey-prod).
 *
 * Usage:
 *   node scratch/migrate_db.js --src-key=<path-to-src-key.json> --dest-key=<path-to-dest-key.json>
 *
 *   Or (falling back to REST API read for source if staging is publicly readable):
 *   node scratch/migrate_db.js --src-project=mywhiskey-97620 --dest-key=<path-to-dest-key.json>
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse CLI Arguments
const args = {};
process.argv.slice(2).forEach(arg => {
  const match = arg.match(/^--([^=]+)=(.*)$/);
  if (match) {
    args[match[1]] = match[2];
  }
});

const srcKeyPath = args['src-key'];
const destKeyPath = args['dest-key'];
const srcProjectId = args['src-project'] || 'mywhiskey-97620';
const destProjectId = args['dest-project'];

if (!destKeyPath && !destProjectId) {
  console.error('Error: Destination credentials or project ID must be provided.');
  console.log('\nUsage:');
  console.log('  node scratch/migrate_db.js --src-key=keys/staging-key.json --dest-key=keys/prod-key.json');
  console.log('  node scratch/migrate_db.js --src-project=mywhiskey-97620 --dest-key=keys/prod-key.json');
  process.exit(1);
}

// Global configuration
const COLLECTIONS_TO_MIGRATE = [
  'pages',
  'settings',
  'templates',
  'assets',
  'content_types',
  'content_items'
];

async function initializeApp(name, keyPath, projectId) {
  if (keyPath) {
    const keyFile = path.resolve(keyPath);
    if (!fs.existsSync(keyFile)) {
      throw new Error(`Credential file not found at ${keyFile}`);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    }, name);
  } else {
    // Initialize with project ID (uses application default credentials or REST fallback)
    return admin.initializeApp({
      projectId: projectId
    }, name);
  }
}

async function runMigration() {
  console.log('====================================================');
  console.log('           FIRESTORE DATABASE MIGRATION');
  console.log('====================================================');

  let srcApp, destApp;
  let useRestSource = false;

  // Initialize Destination
  console.log(`Initializing Destination App...`);
  try {
    destApp = await initializeApp('destination', destKeyPath, destProjectId);
    console.log(`✓ Target initialized with project: ${destApp.options.projectId || destProjectId}`);
  } catch (error) {
    console.error('✗ Failed to initialize destination application:', error.message);
    process.exit(1);
  }

  const destDb = destApp.firestore();

  // Initialize Source
  if (srcKeyPath) {
    console.log(`Initializing Source App via Service Account...`);
    try {
      srcApp = await initializeApp('source', srcKeyPath, srcProjectId);
      console.log(`✓ Source initialized with project: ${srcApp.options.projectId}`);
    } catch (error) {
      console.error('✗ Source key initialization failed, trying REST fallback:', error.message);
      useRestSource = true;
    }
  } else {
    console.log(`No Source Key provided. Using REST API fallback for reading from Staging (${srcProjectId})...`);
    useRestSource = true;
  }

  const sourceDocuments = {};

  if (!useRestSource) {
    const srcDb = srcApp.firestore();
    console.log(`\n--- Reading from Source Firestore (Admin SDK) ---`);
    for (const colName of COLLECTIONS_TO_MIGRATE) {
      console.log(`Reading collection: ${colName}...`);
      const ref = srcDb.collection(colName);
      const snapshot = await ref.get();
      sourceDocuments[colName] = [];
      snapshot.forEach(doc => {
        sourceDocuments[colName].push({
          id: doc.id,
          data: doc.data()
        });
      });
      console.log(`  Found ${sourceDocuments[colName].length} documents.`);
    }
  } else {
    console.log(`\n--- Reading from Source Staging REST API (${srcProjectId}) ---`);
    // Fetch via Firestore REST API
    for (const colName of COLLECTIONS_TO_MIGRATE) {
      console.log(`Fetching collection via REST: ${colName}...`);
      sourceDocuments[colName] = [];
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${srcProjectId}/databases/(default)/documents/${colName}?pageSize=300`;
        const response = await fetch(url);
        if (response.ok) {
          const result = await response.json();
          if (result.documents) {
            result.documents.forEach(doc => {
              // Parse Firestore REST document format to normal JS object
              const docId = doc.name.split('/').pop();
              const parsedData = parseRestDocument(doc.fields || {});
              sourceDocuments[colName].push({
                id: docId,
                data: parsedData
              });
            });
          }
        } else {
          console.warn(`  Warning: Could not fetch collection ${colName} (Status: ${response.status})`);
        }
      } catch (error) {
        console.warn(`  Warning: Error fetching ${colName}:`, error.message);
      }
      console.log(`  Fetched ${sourceDocuments[colName].length} documents.`);
    }
  }

  // Perform writes to Destination
  console.log(`\n--- Writing to Destination Firestore (${destApp.options.projectId || destProjectId}) ---`);
  let totalCopied = 0;
  for (const colName of COLLECTIONS_TO_MIGRATE) {
    const docs = sourceDocuments[colName] || [];
    if (docs.length === 0) {
      console.log(`Skipping empty/missing collection: ${colName}`);
      continue;
    }

    console.log(`Writing collection: ${colName} (${docs.length} documents)...`);
    const batchSize = 100;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = destDb.batch();
      const chunk = docs.slice(i, i + batchSize);

      chunk.forEach(docInfo => {
        const docRef = destDb.collection(colName).doc(docInfo.id);
        // Use set with no merge or merge depending on preference, we want exact copies
        batch.set(docRef, docInfo.data);
      });

      await batch.commit();
      totalCopied += chunk.length;
      console.log(`  Committed batch ${Math.floor(i / batchSize) + 1} (${chunk.length} docs)`);
    }
  }

  console.log('\n====================================================');
  console.log(`Migration Completed successfully!`);
  console.log(`Total Documents Copied: ${totalCopied}`);
  console.log('====================================================');
  process.exit(0);
}

// Helper to parse Firestore REST fields structure to plain JavaScript objects
function parseRestDocument(fields) {
  const result = {};
  for (const key in fields) {
    result[key] = parseRestValue(fields[key]);
  }
  return result;
}

function parseRestValue(valueObj) {
  const type = Object.keys(valueObj)[0];
  const value = valueObj[type];

  switch (type) {
    case 'stringValue':
      return value;
    case 'booleanValue':
      return value;
    case 'integerValue':
      return parseInt(value, 10);
    case 'doubleValue':
      return parseFloat(value);
    case 'timestampValue':
      return value;
    case 'nullValue':
      return null;
    case 'arrayValue':
      return (value.values || []).map(v => parseRestValue(v));
    case 'mapValue':
      return parseRestDocument(value.fields || {});
    case 'geoPointValue':
      return { latitude: value.latitude, longitude: value.longitude };
    default:
      return value;
  }
}

runMigration().catch(err => {
  console.error('\n✗ Migration Failed:', err);
  process.exit(1);
});
