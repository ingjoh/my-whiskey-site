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

const serviceAccount = JSON.parse(serviceAccountJson);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runMigration() {
  console.log('=== STARTING EPIC 3: OPERATIONAL LAYER MIGRATION ===');

  // 1. Migrate Assets to Resources
  console.log('\n--- Migrating Assets to Resources ---');
  const pagesSnap = await db.collection('pages').get();
  let assetCount = 0;
  let staffCount = 0;
  let blackoutCount = 0;

  for (const doc of pagesSnap.docs) {
    const data = doc.data();
    
    // Check if it's a legacy ContentItem of type asset
    if (doc.id.startsWith('content-item-') && data.contentType === 'asset') {
      const resourceId = `res_${data.id}`;
      const isVessel = data.isVessel || data.category === 'yacht' || data.category === 'tender';
      
      await db.collection('resources').doc(resourceId).set({
        id: resourceId,
        tenantId: 'org-whiskey',
        name: data.title || data.name,
        type: isVessel ? 'vessel' : 'gear',
        category: data.category || 'other',
        status: data.status === 'published' ? 'active' : 'offline',
        physicalConfig: {
          capacity: data.capacity || 12,
          homeLocation: data.location || 'baytowne-marina',
          relocationSpeed: isVessel ? 18 : 0
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Migrated Asset "${data.title}" -> Resource: ${resourceId}`);
      assetCount++;
    }

    // Check if it's a legacy ContentItem of type staff
    if (doc.id.startsWith('content-item-') && data.contentType === 'staff') {
      const personId = `pers_staff_${data.slug || data.id}`;
      const resourceId = `res_crew_${data.slug || data.id}`;

      // Ensure Person profile exists
      await db.collection('people').doc(personId).set({
        id: personId,
        email: data.email || `${data.slug}@example.com`,
        firstName: data.title.split(' ')[1] || data.title,
        lastName: data.title.split(' ')[2] || '',
        phone: data.phone || '555-0199',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Create Crew Resource
      await db.collection('resources').doc(resourceId).set({
        id: resourceId,
        tenantId: 'org-whiskey',
        name: data.title,
        type: 'crew',
        category: 'person',
        status: data.status === 'published' ? 'active' : 'offline',
        humanConfig: {
          personId: personId,
          capabilities: data.isCaptain ? ['captain'] : ['crew']
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Migrated Staff "${data.title}" -> Crew Resource: ${resourceId}`);
      staffCount++;
    }

    // Check if it's a legacy AssetBlackout
    if (data.type === 'asset_blackout') {
      const allocationId = `inv_blk_${data.id}`;
      const startAt = `${data.startDate}T${data.startTime || '00:00'}:00.000Z`;
      const endAt = `${data.endDate}T${data.endTime || '23:59'}:59.000Z`;

      await db.collection('inventory_allocations').doc(allocationId).set({
        id: allocationId,
        tenantId: 'org-whiskey',
        resourceId: `res_${data.vesselSlug}`,
        allocationType: 'maintenance',
        referenceId: data.id,
        startAt,
        endAt,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`✓ Migrated Blackout "${data.title}" -> Allocation: ${allocationId}`);
      blackoutCount++;
    }
  }

  // 2. Migrate Bookings to Operational Itineraries and Capacity Allocations
  console.log('\n--- Generating Operational Itineraries for Bookings ---');
  let bookingCount = 0;
  
  // Fetch new bookings
  const newBookingsSnap = await db.collection('bookings').get();
  for (const docSnap of newBookingsSnap.docs) {
    const booking = docSnap.data();
    
    // Try to retrieve corresponding accepted Offer to get resource context
    let vesselResourceId = 'res_my-whiskey-yacht'; // Default fallback
    let startAt = new Date().toISOString();
    let endAt = new Date(Date.now() + 14400000).toISOString(); // 4 hrs default

    if (booking.acceptedOfferId) {
      const offerSnap = await db.collection('offers').doc(booking.acceptedOfferId).get();
      if (offerSnap.exists) {
        const offer = offerSnap.data();
        if (offer.schedulingSnapshot) {
          const date = offer.schedulingSnapshot.date;
          const startTime = offer.schedulingSnapshot.startTime || '09:00';
          const duration = offer.schedulingSnapshot.durationMinutes || 240;
          
          startAt = `${date}T${startTime}:00.000Z`;
          const endMs = new Date(startAt).getTime() + (duration * 60000);
          endAt = new Date(endMs).toISOString();
        }
      }
    }

    const itineraryId = `opit_${booking.id}`;
    await db.collection('operational_itineraries').doc(itineraryId).set({
      id: itineraryId,
      tenantId: booking.tenantId || 'org-whiskey',
      bookingId: booking.id,
      vesselResourceId,
      stops: [
        {
          name: 'Baytowne Marina',
          targetArrival: startAt,
          targetDeparture: new Date(new Date(startAt).getTime() + 15 * 60000).toISOString() // 15 mins embark
        },
        {
          name: 'Destin Harbor',
          targetArrival: new Date(new Date(startAt).getTime() + 120 * 60000).toISOString(),
          targetDeparture: new Date(new Date(startAt).getTime() + 180 * 60000).toISOString()
        },
        {
          name: 'Baytowne Marina',
          targetArrival: endAt,
          targetDeparture: endAt
        }
      ],
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Create corresponding Inventory Allocation for vessel
    const allocationId = `inv_bk_${booking.id}`;
    await db.collection('inventory_allocations').doc(allocationId).set({
      id: allocationId,
      tenantId: booking.tenantId || 'org-whiskey',
      resourceId: vesselResourceId,
      allocationType: 'booking',
      referenceId: booking.id,
      startAt,
      endAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log(`✓ Generated Itinerary: ${itineraryId} and Allocation: ${allocationId} for Booking ${booking.id}`);
    bookingCount++;
  }

  console.log('\n==================================================');
  console.log('EPIC 3 MIGRATION COMPLETION SUMMARY:');
  console.log(`  - Assets Migrated: ${assetCount}`);
  console.log(`  - Staff Migrated: ${staffCount}`);
  console.log(`  - Blackouts Migrated: ${blackoutCount}`);
  console.log(`  - Bookings Scheduled: ${bookingCount}`);
  console.log('==================================================');
}

runMigration().catch(console.error);
