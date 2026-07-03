import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (id) {
      const docRef = adminDb.collection('invoices').doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists) {
        return NextResponse.json({ error: `Invoice ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: docSnap.data() });
    }

    const snapshot = await adminDb.collection('invoices')
      .where('tenantId', '==', tenantId)
      .get();

    const invoices = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originType,
      originId,
      billToType,
      billToId,
      amountDue,
      dueDate,
      paymentTerms = 'due_on_receipt',
      tenantId = 'org-whiskey'
    } = body;

    if (!originType || !originId || !billToType || !billToId || amountDue === undefined || !dueDate) {
      return NextResponse.json({ error: 'Missing required fields: originType, originId, billToType, billToId, amountDue, dueDate' }, { status: 400 });
    }

    const invoiceId = `invc_${Math.floor(100000 + Math.random() * 900000)}`;
    const docRef = adminDb.collection('invoices').doc(invoiceId);
    
    const data = {
      id: invoiceId,
      tenantId,
      originType,
      originId,
      billToType,
      billToId,
      status: 'open',
      amountDue,
      dueDate,
      paymentTerms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(data);
    return NextResponse.json({ success: true, message: 'Invoice generated successfully', data });
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
