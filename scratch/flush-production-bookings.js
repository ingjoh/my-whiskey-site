/**
 * Production Database Flush Script
 * 
 * This script safely deletes all bookings, waivers, and scheduled notifications
 * from the production Firestore database ('my-whiskey-prod') and resets
 * customer trip histories.
 * 
 * Safety features:
 * 1. Checks that the initialized project ID is strictly 'my-whiskey-prod'.
 * 2. Requires interactive terminal confirmation (typing "FLUSH PRODUCTION BOOKINGS").
 * 3. Supports `--dry-run` to preview changes without making database modifications.
 * 
 * Usage:
 *   Dry Run:      node scratch/flush-production-bookings.js --dry-run
 *   Real Run:     node scratch/flush-production-bookings.js
 */

const admin = require('firebase-admin');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

const TARGET_PROJECT = 'my-whiskey-prod';
const tempCredsFile = path.join(__dirname, 'temp-gcp-creds.json');

console.log('====================================================');
console.log('       PRODUCTION DATABASE FLUSH TOOL               ');
console.log('====================================================');
if (dryRun) {
  console.log('*** RUNNING IN DRY-RUN MODE (No modifications will be made) ***');
}
console.log('');

// Setup dynamic credentials from CLI config
let hasTempCreds = false;
try {
  const configPath = path.join('C:', 'Users', 'ingem', '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Firebase CLI config file not found at: ${configPath}. Run "firebase login" first.`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const tokens = config.tokens || {};
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) {
    throw new Error('No refresh token found in firebase-tools.json. Please run "firebase login" first.');
  }

  const credentialsContent = {
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: refreshToken,
    type: 'authorized_user'
  };

  fs.writeFileSync(tempCredsFile, JSON.stringify(credentialsContent, null, 2), 'utf8');
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempCredsFile;
  hasTempCreds = true;
  console.log('Successfully configured temporary application credentials from Firebase CLI.');
} catch (err) {
  console.error('Credentials Configuration Error:', err.message);
  process.exit(1);
}

function cleanup() {
  if (hasTempCreds && fs.existsSync(tempCredsFile)) {
    try {
      fs.unlinkSync(tempCredsFile);
    } catch (e) {}
  }
}

// Ensure cleanup on termination
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
  process.exit(1);
});

// Initialize Firebase Admin pointing strictly to the production project
try {
  admin.initializeApp({
    projectId: TARGET_PROJECT
  });
} catch (e) {
  console.error('Failed to initialize Firebase Admin SDK:', e.message);
  cleanup();
  process.exit(1);
}

const db = admin.firestore();

// Double check the project ID resolved by the Admin SDK
const activeProject = admin.app().options.projectId;
if (activeProject !== TARGET_PROJECT) {
  console.error(`ERROR: Safety Block triggered.`);
  console.error(`Attempted to run script on project: "${activeProject}"`);
  console.error(`This script is hardcoded to only run on production: "${TARGET_PROJECT}"`);
  console.error('Aborting execution.');
  cleanup();
  process.exit(1);
}

// Set up readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const confirmationMessage = 'FLUSH PRODUCTION BOOKINGS';

console.log(`WARNING: You are about to wipe bookings, related waivers, and scheduled notifications`);
console.log(`from the PRODUCTION database (${TARGET_PROJECT}).`);
console.log(`All customer profiles will also have their booking and waiver history cleared.`);
console.log(`This action is permanent and CANNOT be undone.`);
console.log('');

rl.question(`To confirm, please type exactly "${confirmationMessage}": `, async (answer) => {
  rl.close();
  
  if (answer.trim() !== confirmationMessage) {
    console.log('');
    console.log('Confirmation failed. Aborting database flush.');
    cleanup();
    process.exit(0);
  }
  
  console.log('');
  console.log('Confirmation accepted. Starting database operations...');
  console.log('');
  
  try {
    // 1. Fetch bookings
    console.log('Fetching bookings...');
    const bookingsSnap = await db.collection('pages')
      .where('type', '==', 'booking')
      .get();
    console.log(`Found ${bookingsSnap.size} bookings.`);
    
    // 2. Fetch waivers
    console.log('Fetching waiver signatures...');
    const waiversSnap = await db.collection('pages')
      .where('type', '==', 'waiver_signature')
      .get();
    console.log(`Found ${waiversSnap.size} waivers.`);
    
    // 3. Fetch scheduled notifications
    console.log('Fetching scheduled notifications...');
    const notificationsSnap = await db.collection('scheduled_notifications')
      .get();
    console.log(`Found ${notificationsSnap.size} scheduled notifications.`);
    
    // 4. Fetch customer profiles
    console.log('Fetching customer profiles...');
    const customersSnap = await db.collection('pages')
      .where('type', '==', 'customer')
      .get();
    console.log(`Found ${customersSnap.size} customer profiles.`);
    
    console.log('');
    console.log('----------------------------------------------------');
    
    // Execute Deletions
    if (bookingsSnap.size > 0) {
      console.log(`${dryRun ? '[Dry-Run] Would delete' : 'Deleting'} bookings...`);
      for (const doc of bookingsSnap.docs) {
        console.log(`  - Booking document: ${doc.id} (${doc.data().guestName || 'Unnamed'})`);
      }
      const deletedBookings = await deleteInBatches(db, bookingsSnap, dryRun);
      console.log(`Successfully ${dryRun ? 'would delete' : 'deleted'} ${deletedBookings} bookings.`);
    } else {
      console.log('No bookings to delete.');
    }
    
    if (waiversSnap.size > 0) {
      console.log(`${dryRun ? '[Dry-Run] Would delete' : 'Deleting'} waivers...`);
      for (const doc of waiversSnap.docs) {
        console.log(`  - Waiver document: ${doc.id} (${doc.data().name || 'Unnamed'})`);
      }
      const deletedWaivers = await deleteInBatches(db, waiversSnap, dryRun);
      console.log(`Successfully ${dryRun ? 'would delete' : 'deleted'} ${deletedWaivers} waivers.`);
    } else {
      console.log('No waivers to delete.');
    }
    
    if (notificationsSnap.size > 0) {
      console.log(`${dryRun ? '[Dry-Run] Would delete' : 'Deleting'} scheduled notifications...`);
      for (const doc of notificationsSnap.docs) {
        console.log(`  - Notification document: ${doc.id} (Booking: ${doc.data().bookingId || 'N/A'})`);
      }
      const deletedNotifications = await deleteInBatches(db, notificationsSnap, dryRun);
      console.log(`Successfully ${dryRun ? 'would delete' : 'deleted'} ${deletedNotifications} notifications.`);
    } else {
      console.log('No scheduled notifications to delete.');
    }
    
    // Update customer profiles
    if (customersSnap.size > 0) {
      console.log(`${dryRun ? '[Dry-Run] Would reset' : 'Resetting'} customer profiles booking/waiver references...`);
      for (const doc of customersSnap.docs) {
        console.log(`  - Resetting customer: ${doc.id} (${doc.data().email})`);
      }
      const resetCustomers = await resetCustomerBookingHistory(db, customersSnap, dryRun);
      console.log(`Successfully ${dryRun ? 'would reset' : 'reset'} ${resetCustomers} customer profiles.`);
    } else {
      console.log('No customer profiles to reset.');
    }
    
    console.log('----------------------------------------------------');
    console.log('');
    console.log(dryRun ? 'DRY-RUN COMPLETE. No database changes were made.' : 'PRODUCTION FLUSH COMPLETE successfully!');
    cleanup();
    process.exit(0);
    
  } catch (err) {
    console.error('Fatal error during database flush:', err);
    cleanup();
    process.exit(1);
  }
});

/**
 * Batched deletion utility
 */
async function deleteInBatches(db, querySnapshot, dryRun) {
  let count = 0;
  if (querySnapshot.empty) return count;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const doc of querySnapshot.docs) {
    if (!dryRun) {
      batch.delete(doc.ref);
    }
    count++;
    batchCount++;
    
    if (batchCount >= 400) {
      if (!dryRun) {
        await batch.commit();
        batch = db.batch();
      }
      batchCount = 0;
    }
  }
  
  if (batchCount > 0 && !dryRun) {
    await batch.commit();
  }
  
  return count;
}

/**
 * Batched update utility for customer profiles
 */
async function resetCustomerBookingHistory(db, querySnapshot, dryRun) {
  let count = 0;
  if (querySnapshot.empty) return count;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const doc of querySnapshot.docs) {
    if (!dryRun) {
      batch.update(doc.ref, {
        bookingIds: [],
        waiverSignatures: [],
        updatedAt: new Date().toISOString()
      });
    }
    count++;
    batchCount++;
    
    if (batchCount >= 400) {
      if (!dryRun) {
        await batch.commit();
        batch = db.batch();
      }
      batchCount = 0;
    }
  }
  
  if (batchCount > 0 && !dryRun) {
    await batch.commit();
  }
  
  return count;
}
