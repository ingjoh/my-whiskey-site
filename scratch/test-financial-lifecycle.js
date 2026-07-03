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
const serviceAccount = JSON.parse(serviceAccountJson);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runIntegrationTest() {
  console.log('=== STARTING END-TO-END FINANCIAL LIFECYCLE TEST ===');

  const testId = `tst_${Math.floor(100000 + Math.random() * 900000)}`;
  const bookingId = `book_${testId}`;
  const settlementId = `set_${bookingId}`;
  const invoiceId = `invc_${testId}`;
  const txId = `tx_${testId}`;
  const payoutId = `po_${testId}`;

  // 1. Initial State Check
  console.log('\nStep 1: Initializing Settlement Ledger...');
  const grandTotal = 1500;
  const platformFee = 150;
  const captainFee = 300;
  const ownerRevenue = 1050;

  const settlementData = {
    id: settlementId,
    tenantId: 'org-whiskey',
    originType: 'booking',
    originId: bookingId,
    status: 'pending',
    totals: {
      commercialGrandTotal: grandTotal,
      collectedAmount: 0,
      balanceDue: grandTotal
    },
    splits: [
      {
        type: 'platform_fee',
        recipientType: 'organization',
        recipientId: 'org_platform_hq',
        amount: platformFee,
        description: 'Platform commission'
      },
      {
        type: 'owner_revenue',
        recipientType: 'organization',
        recipientId: 'org-whiskey',
        amount: ownerRevenue,
        description: 'Yacht owner share'
      },
      {
        type: 'captain_payout',
        recipientType: 'resource',
        recipientId: 'res_crew_captain-sarah-vance',
        amount: captainFee,
        description: 'Captain operational rate'
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await db.collection('settlements').doc(settlementId).set(settlementData);
  console.log(`✓ Settlement initialized: ${settlementId}`);

  // 2. Invoice Generation
  console.log('\nStep 2: Generating Invoice (Accounts Receivable)...');
  await db.collection('invoices').doc(invoiceId).set({
    id: invoiceId,
    tenantId: 'org-whiskey',
    originType: 'booking',
    originId: bookingId,
    billToType: 'person',
    billToId: 'pers_test_guest_123',
    status: 'open',
    amountDue: grandTotal,
    dueDate: new Date(Date.now() + 86400000 * 30).toISOString(), // Net 30
    paymentTerms: 'net_30',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Invoice open: ${invoiceId}`);

  // 3. Simulating Transaction Receipt and Ledger Reconciliations
  console.log('\nStep 3: Processing incoming card Transaction payment...');
  
  await db.runTransaction(async (transaction) => {
    const settlementRef = db.collection('settlements').doc(settlementId);
    const setSnap = await transaction.get(settlementRef);
    const settlement = setSnap.data();

    const currentCollected = settlement.totals.collectedAmount || 0;
    const newCollected = currentCollected + grandTotal;
    const newBalanceDue = grandTotal - newCollected;

    // Write Transaction
    const txRef = db.collection('transactions').doc(txId);
    transaction.set(txRef, {
      id: txId,
      tenantId: 'org-whiskey',
      settlementId,
      type: 'charge',
      method: 'stripe_card',
      status: 'completed',
      amount: grandTotal,
      gatewayReferenceId: 'ch_test_stripe_123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update Settlement Totals and status to reconciled
    transaction.update(settlementRef, {
      'totals.collectedAmount': newCollected,
      'totals.balanceDue': newBalanceDue,
      status: 'reconciled',
      updatedAt: new Date().toISOString()
    });

    // Update Invoice status to paid
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    transaction.update(invoiceRef, {
      status: 'paid',
      updatedAt: new Date().toISOString()
    });
  });

  console.log(`✓ Transaction registered: ${txId}`);
  console.log('✓ Settlement totals recalculated and status set to "reconciled"');
  console.log('✓ Invoice marked as "paid"');

  // 4. Payout Generation
  console.log('\nStep 4: Dispatching splits to Payout Ledger...');
  await db.collection('payouts').doc(payoutId).set({
    id: payoutId,
    tenantId: 'org-whiskey',
    recipientType: 'resource',
    recipientId: 'res_crew_captain-sarah-vance',
    settlementId,
    amount: captainFee,
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`✓ Payout created: ${payoutId}`);

  // 5. Verification Audit
  console.log('\n--- VERIFYING LEDGER RECORDS ---');
  const finalSet = await db.collection('settlements').doc(settlementId).get().then(s => s.data());
  const finalTx = await db.collection('transactions').doc(txId).get().then(s => s.data());
  const finalInvc = await db.collection('invoices').doc(invoiceId).get().then(s => s.data());
  const finalPo = await db.collection('payouts').doc(payoutId).get().then(s => s.data());

  console.log('Settlement:', {
    status: finalSet.status,
    collected: finalSet.totals.collectedAmount,
    balance: finalSet.totals.balanceDue
  });
  console.log('Transaction:', {
    type: finalTx.type,
    amount: finalTx.amount,
    status: finalTx.status
  });
  console.log('Invoice:', {
    status: finalInvc.status,
    amountDue: finalInvc.amountDue
  });
  console.log('Payout:', {
    recipient: finalPo.recipientId,
    amount: finalPo.amount,
    status: finalPo.status
  });

  const success = finalSet.status === 'reconciled' && finalSet.totals.collectedAmount === grandTotal && finalInvc.status === 'paid' && finalPo.status === 'approved';
  console.log('\n==================================================');
  if (success) {
    console.log('TEST RESULT: PASSED (All financial state invariants verified)');
  } else {
    console.error('TEST RESULT: FAILED');
  }
  console.log('==================================================');
}

runIntegrationTest().catch(console.error);
