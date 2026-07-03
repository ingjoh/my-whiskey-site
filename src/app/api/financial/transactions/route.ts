import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settlementId = searchParams.get('settlementId');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (!settlementId) {
      return NextResponse.json({ error: 'Missing settlementId parameter' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('transactions')
      .where('tenantId', '==', tenantId)
      .where('settlementId', '==', settlementId)
      .get();

    const transactions = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      settlementId,
      type, // 'charge' | 'refund' | 'payout' | 'adjustment'
      method, // 'stripe_card' | 'stripe_ach' | 'bank_transfer' | 'cash'
      status = 'completed',
      amount, // positive for incoming, negative for outgoing
      gatewayReferenceId,
      notes,
      tenantId = 'org-whiskey'
    } = body;

    if (!settlementId || !type || !method || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: settlementId, type, method, amount' }, { status: 400 });
    }

    const transactionId = `tx_${Math.floor(100000 + Math.random() * 900000)}`;

    // Reconcile Settlement totals atomically inside transaction (ADR-007)
    const result = await adminDb.runTransaction(async (transaction) => {
      const settlementRef = adminDb.collection('settlements').doc(settlementId);
      const settlementSnap = await transaction.get(settlementRef);

      if (!settlementSnap.exists) {
        throw new Error(`SETTLEMENT_NOT_FOUND: Settlement ${settlementId} does not exist`);
      }

      const settlement = settlementSnap.data() || {};
      const grandTotal = settlement.totals.commercialGrandTotal || 0;
      const currentCollected = settlement.totals.collectedAmount || 0;

      // Calculate new totals
      // If completed charge, add to collected. If completed refund, subtract from collected.
      let delta = 0;
      if (status === 'completed') {
        if (type === 'charge' || (type === 'adjustment' && amount > 0)) {
          delta = amount;
        } else if (type === 'refund' || (type === 'adjustment' && amount < 0)) {
          delta = amount; // amount is negative for refunds anyway
        }
      }

      const newCollected = Math.max(0, currentCollected + delta);
      const newBalanceDue = Math.max(0, grandTotal - newCollected);

      // Write Transaction document
      const txRef = adminDb.collection('transactions').doc(transactionId);
      const txData = {
        id: transactionId,
        tenantId,
        settlementId,
        type,
        method,
        status,
        amount,
        gatewayReferenceId: gatewayReferenceId || '',
        notes: notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transaction.set(txRef, txData);

      // Update Settlement document
      transaction.update(settlementRef, {
        'totals.collectedAmount': newCollected,
        'totals.balanceDue': newBalanceDue,
        status: newBalanceDue === 0 ? 'reconciled' : 'posted',
        updatedAt: new Date().toISOString()
      });

      return { transaction: txData, totals: { collectedAmount: newCollected, balanceDue: newBalanceDue } };
    });

    return NextResponse.json({ success: true, message: 'Transaction registered successfully', data: result });
  } catch (error: any) {
    if (error.message.startsWith('SETTLEMENT_NOT_FOUND:')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
