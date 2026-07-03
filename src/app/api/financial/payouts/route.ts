import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (id) {
      const docRef = adminDb.collection('payouts').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: `Payout ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: docSnap.data() });
    }

    const snapshot = await adminDb.collection('payouts')
      .where('tenantId', '==', tenantId)
      .get();

    const payouts = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: payouts });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      recipientType,
      recipientId,
      settlementId,
      amount,
      status = 'draft',
      gatewayTransferId,
      releasedAt,
      tenantId = 'org-whiskey'
    } = body;

    if (!recipientType || !recipientId || !settlementId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: recipientType, recipientId, settlementId, amount' }, { status: 400 });
    }

    const payoutId = id || `po_${Math.floor(100000 + Math.random() * 900000)}`;
    const docRef = adminDb.collection('payouts').doc(payoutId);
    const existing = await docRef.get();
    const now = new Date().toISOString();

    const data = {
      id: payoutId,
      tenantId,
      recipientType,
      recipientId,
      settlementId,
      amount,
      status,
      ...(gatewayTransferId && { gatewayTransferId }),
      releasedAt: releasedAt || (status === 'paid' ? now : null),
      createdAt: existing.exists ? existing.data()?.createdAt : now,
      updatedAt: now
    };

    await docRef.set(data);
    return NextResponse.json({ success: true, message: 'Payout saved successfully', data });
  } catch (error: any) {
    console.error('Error saving payout:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
