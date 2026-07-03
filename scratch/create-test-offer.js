const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (match[1].trim() !== 'FIREBASE_SERVICE_ACCOUNT') {
        value = value.replace(/\\n/g, '\n');
      }
      process.env[match[1].trim()] = value;
    }
  });
}

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT environment variable is not defined.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error('CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const adminDb = admin.firestore();

async function createTestOffer() {
  console.log('--- Generating Test Proposal and Offer Documents ---');

  // 1. Create a test Person profile
  const personId = 'pers_test_guest_123';
  await adminDb.collection('people').doc(personId).set({
    id: personId,
    email: 'test-guest@example.com',
    firstName: 'Test',
    lastName: 'Guest',
    phone: '555-0199',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Ensured Person exists: ${personId}`);

  // 2. Create a Proposal container
  const propId = 'prop_test_proposal_999';
  await adminDb.collection('proposals').doc(propId).set({
    id: propId,
    tenantId: 'org-whiskey',
    recipientId: personId,
    senderId: 'pers_system_test',
    status: 'sent',
    expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days expiry
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Created Proposal: ${propId}`);

  // 3. Create Offer A (Sunset Excursion)
  const offerAId = 'off_sunset_option_aaa';
  await adminDb.collection('offers').doc(offerAId).set({
    id: offerAId,
    tenantId: 'org-whiskey',
    proposalId: propId,
    experienceId: 'exp_sunset-snacks-cruise-baytowne',
    itineraryTemplateId: 'itemp_sunset-snacks-cruise-baytowne_default',
    listingId: 'list_sunset-snacks-cruise-baytowne',
    status: 'pending',
    isAccepted: false,
    pricingSnapshot: {
      subtotal: 1200,
      taxes: 90,
      grandTotal: 1290,
      depositRequired: 500,
      listingBaseRateSnapshot: 1200,
      listingExtraGuestRateSnapshot: 0,
      listingTaxRateSnapshot: 0.075,
      listingCancelPolicySnapshot: 'Standard 48 Hour policy'
    },
    schedulingSnapshot: {
      date: '2026-08-15',
      startTime: '17:00',
      endTime: '21:00',
      durationMinutes: 240
    },
    resourcePreferences: {
      vesselCategory: 'yacht',
      crewCountRequired: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Created Offer A (Sunset Excursion): ${offerAId}`);

  // 4. Create Offer B (Coastal Snorkel)
  const offerBId = 'off_snorkel_option_bbb';
  await adminDb.collection('offers').doc(offerBId).set({
    id: offerBId,
    tenantId: 'org-whiskey',
    proposalId: propId,
    experienceId: 'exp_destin-private-coastal-adventure',
    itineraryTemplateId: 'itemp_destin-private-coastal-adventure_default',
    listingId: 'list_destin-private-coastal-adventure',
    status: 'pending',
    isAccepted: false,
    pricingSnapshot: {
      subtotal: 800,
      taxes: 60,
      grandTotal: 860,
      depositRequired: 300,
      listingBaseRateSnapshot: 800,
      listingExtraGuestRateSnapshot: 0,
      listingTaxRateSnapshot: 0.075,
      listingCancelPolicySnapshot: 'Standard 48 Hour policy'
    },
    schedulingSnapshot: {
      date: '2026-08-16',
      startTime: '09:00',
      endTime: '13:00',
      durationMinutes: 240
    },
    resourcePreferences: {
      vesselCategory: 'yacht',
      crewCountRequired: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Created Offer B (Coastal Snorkel): ${offerBId}`);

  console.log('\n--- Test Data Seeded Successfully ---');
  console.log('\nTo simulate checkout, execute the following PowerShell command:');
  console.log(`
Invoke-RestMethod -Uri "http://localhost:3000/api/checkout" -Method Post -ContentType "application/json" -Body '{"offerId": "${offerAId}", "paymentPlan": "full", "email": "test-guest@example.com"}'
  `);
}

createTestOffer().catch(console.error);
