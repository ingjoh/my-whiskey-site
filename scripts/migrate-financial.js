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
db.settings({ ignoreUndefinedProperties: true });

async function runMigration() {
  console.log('=== STARTING EPIC 4: FINANCIAL & SETTLEMENT LAYER MIGRATION ===');

  const bookingsSnap = await db.collection('bookings').get();
  let settlementCount = 0;
  let transactionCount = 0;
  let payoutCount = 0;

  for (const docSnap of bookingsSnap.docs) {
    const booking = docSnap.data();
    const bookingId = booking.id;

    // Retrieve accepted Offer to get pricing details
    let subtotal = 2000;
    let salesTax = 146.25;
    let grandTotal = 2146.25;
    let depositRequired = 500;

    if (booking.acceptedOfferId) {
      const offerSnap = await db.collection('offers').doc(booking.acceptedOfferId).get();
      if (offerSnap.exists) {
        const offer = offerSnap.data();
        if (offer.pricingSnapshot) {
          subtotal = offer.pricingSnapshot.subtotal || subtotal;
          salesTax = offer.pricingSnapshot.taxes || salesTax;
          grandTotal = offer.pricingSnapshot.grandTotal || grandTotal;
          depositRequired = offer.pricingSnapshot.depositRequired || depositRequired;
        }
      }
    }

    // Determine collections
    let collectedAmount = 0;
    let balanceDue = grandTotal;
    if (booking.paymentStatus === 'fully_paid') {
      collectedAmount = grandTotal;
      balanceDue = 0;
    } else if (booking.paymentStatus === 'deposit_paid') {
      collectedAmount = depositRequired;
      balanceDue = grandTotal - depositRequired;
    }

    const settlementId = `set_${bookingId}`;

    // Calculate splits deterministically
    const platformFee = Math.round(subtotal * 0.10); // 10%
    const captainPayout = Math.round(subtotal * 0.20); // 20%
    const ownerRevenue = subtotal - platformFee - captainPayout; // Rest

    const splits = [
      {
        type: 'platform_fee',
        recipientType: 'organization',
        recipientId: 'org_platform_hq',
        amount: platformFee,
        description: 'Platform service commission (10%)'
      },
      {
        type: 'owner_revenue',
        recipientType: 'organization',
        recipientId: booking.tenantId || 'org-whiskey',
        amount: ownerRevenue,
        description: 'Vessel owner payout'
      },
      {
        type: 'captain_payout',
        recipientType: 'resource',
        recipientId: 'res_crew_captain-sarah-vance', // Seed captain resource
        amount: captainPayout,
        description: 'Captain operational fee'
      },
      {
        type: 'tax',
        recipientType: 'organization',
        recipientId: 'gov_tax_collector',
        amount: salesTax,
        description: 'State tourism and sales tax'
      }
    ];

    // 1. Create Settlement document
    await db.collection('settlements').doc(settlementId).set({
      id: settlementId,
      tenantId: booking.tenantId || 'org-whiskey',
      originType: 'booking',
      originId: bookingId,
      status: booking.status === 'confirmed' ? 'posted' : 'pending',
      totals: {
        commercialGrandTotal: grandTotal,
        collectedAmount,
        balanceDue
      },
      splits,
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    settlementCount++;

    // 2. Create Transaction document if payment has occurred
    if (collectedAmount > 0) {
      const transactionId = `tx_init_${bookingId}`;
      await db.collection('transactions').doc(transactionId).set({
        id: transactionId,
        tenantId: booking.tenantId || 'org-whiskey',
        settlementId,
        type: 'charge',
        method: 'stripe_card',
        status: 'completed',
        amount: collectedAmount,
        gatewayReferenceId: booking.stripePaymentIntentId || 'legacy_import',
        createdAt: booking.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      transactionCount++;
    }

    // 3. Create Payout documents for Captain and Owner splits
    const payoutStatus = booking.paymentStatus === 'fully_paid' ? 'approved' : 'draft';
    
    // Captain Payout
    const poCaptainId = `po_capt_${bookingId}`;
    await db.collection('payouts').doc(poCaptainId).set({
      id: poCaptainId,
      tenantId: booking.tenantId || 'org-whiskey',
      recipientType: 'resource',
      recipientId: 'res_crew_captain-sarah-vance',
      settlementId,
      amount: captainPayout,
      status: payoutStatus,
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    payoutCount++;

    // Owner Payout
    const poOwnerId = `po_owner_${bookingId}`;
    await db.collection('payouts').doc(poOwnerId).set({
      id: poOwnerId,
      tenantId: booking.tenantId || 'org-whiskey',
      recipientType: 'organization',
      recipientId: booking.tenantId || 'org-whiskey',
      settlementId,
      amount: ownerRevenue,
      status: payoutStatus,
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    payoutCount++;

    console.log(`✓ Seeded Settlement, Transactions, and Payouts for Booking: ${bookingId}`);
  }

  console.log('\n==================================================');
  console.log('EPIC 4 MIGRATION COMPLETION SUMMARY:');
  console.log(`  - Settlements Created: ${settlementCount}`);
  console.log(`  - Transactions Registered: ${transactionCount}`);
  console.log(`  - Payout Entries Generated: ${payoutCount}`);
  console.log('==================================================');
}

runMigration().catch(console.error);
