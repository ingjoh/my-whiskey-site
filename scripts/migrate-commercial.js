const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading configuration from .env.local...');
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

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const adminDb = admin.firestore();
adminDb.settings({ ignoreUndefinedProperties: true });
console.log(`Firebase Admin SDK initialized. Project: ${serviceAccount.project_id}`);

function generateUUID(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

async function runCommercialMigration() {
  console.log('\n--- Starting Commercial Layer Migration ---');

  const PAGE_COLLECTION = 'pages';

  // Step 1: Query legacy adventures
  console.log('\nStep 1: Migrating legacy adventures to Experience and Listing models...');
  const pagesSnap = await adminDb.collection(PAGE_COLLECTION).get();
  
  const legacyAdventures = [];
  const legacyBookings = [];

  pagesSnap.forEach(doc => {
    const data = doc.data();
    const docId = doc.id;
    if (docId.startsWith('content-item-') && data.contentType === 'adventure') {
      legacyAdventures.push({ id: docId.replace('content-item-', ''), ...data });
    } else if (data.type === 'booking') {
      legacyBookings.push({ id: docId.replace('booking-', ''), ...data });
    }
  });

  console.log(`  - Found ${legacyAdventures.length} legacy adventure(s).`);
  console.log(`  - Found ${legacyBookings.length} legacy booking(s).`);

  const experienceIdMap = new Map(); // legacyId -> new expId
  const listingIdMap = new Map();    // legacyId -> new listingId

  for (const adv of legacyAdventures) {
    const expId = `exp_${adv.id}`;
    const listingId = `list_${adv.id}`;
    
    // Create Experience Document
    await adminDb.collection('experiences').doc(expId).set({
      id: expId,
      title: adv.title || 'Excursion',
      shortDescription: adv.shortDescription || '',
      description: adv.description || '',
      heroImage: adv.heroImage || '',
      gallery: adv.gallery || [],
      status: adv.status || 'published',
      createdAt: adv.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    experienceIdMap.set(adv.id, expId);
    console.log(`  - Created Experience: ${adv.title} -> ${expId}`);

    // Create Default Itinerary Template
    const templateId = `itemp_${adv.id}_default`;
    const duration = adv.guestDurationMinutes || 240;
    await adminDb.collection('experiences').doc(expId).collection('itinerary_templates').doc(templateId).set({
      id: templateId,
      experienceId: expId,
      name: 'Default Itinerary',
      durationMinutes: duration,
      stops: [
        {
          name: adv.startLocation || 'Departure Marina',
          durationMinutes: 30,
          description: 'Boarding and safety briefing'
        },
        {
          name: adv.location || 'Excursion Anchor Point',
          durationMinutes: duration - 60,
          description: 'Snorkeling, paddleboarding, and sandbar leisure'
        },
        {
          name: adv.endLocation || 'Return Dock',
          durationMinutes: 30,
          description: 'Return cruise and disembarkation'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`    - Created Itinerary Template: ${templateId}`);

    // Create Listing Document under tenant org-whiskey
    const baseRate = adv.experienceBaseCost || 800;
    await adminDb.collection('listings').doc(listingId).set({
      id: listingId,
      tenantId: 'org-whiskey',
      experienceId: expId,
      status: 'active',
      pricing: {
        baseRate,
        extraGuestRate: 0,
        depositAmount: 500,
        taxRate: 0.07
      },
      schedulingConfig: {
        leadTimeMinutes: adv.leadTimeMinutes || 1440,
        allowedVesselCategories: ['yacht']
      },
      createdAt: adv.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    listingIdMap.set(adv.id, listingId);
    console.log(`    - Created Listing: ${listingId} under org-whiskey (Base Rate: $${baseRate})`);
  }

  // Step 2: Migrate legacy Bookings to Proposals, Offers, and Bookings
  console.log('\nStep 2: Migrating legacy bookings into transactional records...');
  
  for (const b of legacyBookings) {
    const bookId = `book_${b.id}`;
    const offerId = `off_${b.id}`;
    const propId = `prop_${b.id}`;

    const expId = experienceIdMap.get(b.experienceId) || `exp_${b.experienceId}`;
    const listingId = listingIdMap.get(b.experienceId) || `list_${b.experienceId}`;
    const templateId = `itemp_${b.experienceId}_default`;

    // 2.1 Resolve guest person ID
    let guestId = '';
    const peopleSnap = await adminDb.collection('people')
      .where('email', '==', (b.guestEmail || '').toLowerCase().trim())
      .limit(1)
      .get();
      
    if (!peopleSnap.empty) {
      guestId = peopleSnap.docs[0].id;
    } else {
      guestId = generateUUID('pers');
      await adminDb.collection('people').doc(guestId).set({
        id: guestId,
        email: (b.guestEmail || '').toLowerCase().trim(),
        firstName: b.guestFirstName || b.guestName?.split(' ')[0] || 'Guest',
        lastName: b.guestLastName || b.guestName?.split(' ').slice(1).join(' ') || '',
        phone: b.guestPhone || '',
        createdAt: b.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`  - Created missing Person record: ${b.guestEmail} -> ${guestId}`);
    }

    // 2.2 Create Proposal document
    await adminDb.collection('proposals').doc(propId).set({
      id: propId,
      tenantId: 'org-whiskey',
      recipientId: guestId,
      senderId: 'pers_system_migration',
      status: 'accepted',
      expiresAt: b.createdAt || new Date().toISOString(),
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2.3 Create Offer document
    await adminDb.collection('offers').doc(offerId).set({
      id: offerId,
      tenantId: 'org-whiskey',
      proposalId: propId,
      experienceId: expId,
      itineraryTemplateId: templateId,
      listingId: listingId,
      status: 'accepted',
      isAccepted: true,
      pricingSnapshot: {
        subtotal: b.subtotal || 0,
        taxes: b.salesTax || 0,
        grandTotal: b.grandTotal || 0,
        depositRequired: b.paymentPlan === 'deposit' ? 500 : (b.grandTotal || 0),
        listingBaseRateSnapshot: b.subtotal || 0,
        listingExtraGuestRateSnapshot: 0,
        listingTaxRateSnapshot: 0.07,
        listingCancelPolicySnapshot: 'Standard 48 Hour policy'
      },
      schedulingSnapshot: {
        date: b.date || '',
        startTime: b.startTime || '',
        endTime: '',
        durationMinutes: b.guestDurationMinutes || 240
      },
      resourcePreferences: {
        vesselCategory: b.vesselSlug || 'yacht',
        crewCountRequired: b.guestCount || 1
      },
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2.4 Create Booking document
    await adminDb.collection('bookings').doc(bookId).set({
      id: bookId,
      tenantId: 'org-whiskey',
      acceptedOfferId: offerId,
      guestId: guestId,
      status: b.status === 'confirmed' ? 'confirmed' : 'pending_waiver',
      paymentStatus: b.amountDueLater > 0 ? 'deposit_paid' : 'fully_paid',
      stripePaymentIntentId: b.stripePaymentIntentId || '',
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`  - Migrated Booking transaction: legacyId=${b.id} -> newBookingId=${bookId}`);

    // Flag legacy booking document in /pages collection to mark it migrated
    await adminDb.collection(PAGE_COLLECTION).doc(`booking-${b.id}`).update({
      migrated: true,
      newBookingRef: bookId
    });
  }

  console.log('\n--- Commercial Layer Migration Finished Successfully ---');
}

runCommercialMigration().catch(err => {
  console.error('Migration failed with error:', err);
  process.exit(1);
});
