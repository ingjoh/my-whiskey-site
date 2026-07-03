/**
 * Firestore Image URL Healing Tool
 * Scans Firestore collections and replaces staging storage URLs with production storage URLs.
 * 
 * Usage:
 *   node scratch/heal_image_urls.js --project=my-whiskey-prod --key=path/to/service-account.json
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

const keyPath = args['key'];
const projectId = args['project'] || 'my-whiskey-prod';
const srcBucket = 'mywhiskey-97620.firebasestorage.app';
const destBucket = 'my-whiskey-prod.firebasestorage.app';

if (!keyPath) {
  console.error('Error: Please provide a service account JSON file path.');
  console.log('\nUsage:');
  console.log('  node scratch/heal_image_urls.js --key="path/to/prod-key.json" --project="my-whiskey-prod"');
  process.exit(1);
}

const keyFile = path.resolve(keyPath);
if (!fs.existsSync(keyFile)) {
  console.error(`Error: Service account file not found at ${keyFile}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const COLLECTIONS_TO_SCAN = [
  'pages',
  'settings',
  'templates',
  'assets',
  'content_types',
  'content_items'
];

function recursiveReplace(val) {
  if (typeof val === 'string') {
    if (val.includes(srcBucket)) {
      return val.replace(new RegExp(srcBucket, 'g'), destBucket);
    }
    return val;
  } else if (Array.isArray(val)) {
    return val.map(recursiveReplace);
  } else if (val && typeof val === 'object') {
    const res = {};
    for (const k in val) {
      res[k] = recursiveReplace(val[k]);
    }
    return res;
  }
  return val;
}

async function run() {
  console.log('====================================================');
  console.log(`           HEALING IMAGE STORAGE LINKS`);
  console.log(`Project:     ${projectId}`);
  console.log(`Replacing:   ${srcBucket}`);
  console.log(`With:        ${destBucket}`);
  console.log('====================================================\n');

  let totalUpdated = 0;

  for (const colName of COLLECTIONS_TO_SCAN) {
    console.log(`Scanning collection: ${colName}...`);
    const snapshot = await db.collection(colName).get();
    
    let updatedInCollection = 0;
    const batch = db.batch();
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const stringifiedBefore = JSON.stringify(data);
      const healedData = recursiveReplace(data);
      const stringifiedAfter = JSON.stringify(healedData);

      if (stringifiedBefore !== stringifiedAfter) {
        const docRef = db.collection(colName).doc(docSnap.id);
        batch.set(docRef, healedData, { merge: true });
        updatedInCollection++;
      }
    });

    if (updatedInCollection > 0) {
      await batch.commit();
      totalUpdated += updatedInCollection;
      console.log(`  ✓ Updated ${updatedInCollection} documents.`);
    } else {
      console.log(`  No documents needed updates.`);
    }
  }

  console.log('\n====================================================');
  console.log(`Healing Completed successfully!`);
  console.log(`Total Documents Updated: ${totalUpdated}`);
  console.log('====================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('\n✗ Healing Failed:', err);
  process.exit(1);
});
