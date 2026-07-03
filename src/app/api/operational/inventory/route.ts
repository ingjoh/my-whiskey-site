import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (!resourceId) {
      return NextResponse.json({ error: 'Missing resourceId parameter' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('inventory_allocations')
      .where('tenantId', '==', tenantId)
      .where('resourceId', '==', resourceId)
      .get();

    const allocations = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: allocations });
  } catch (error: any) {
    console.error('Error fetching inventory allocations:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      resourceId,
      allocationType,
      referenceId,
      startAt,
      endAt,
      tenantId = 'org-whiskey'
    } = body;

    if (!resourceId || !allocationType || !startAt || !endAt) {
      return NextResponse.json({ error: 'Missing required fields: resourceId, allocationType, startAt, endAt' }, { status: 400 });
    }

    const reqStart = new Date(startAt).getTime();
    const reqEnd = new Date(endAt).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd) || reqStart >= reqEnd) {
      return NextResponse.json({ error: 'Invalid startAt or endAt timestamp values' }, { status: 400 });
    }

    const allocationId = `inv_${Math.floor(100000 + Math.random() * 900000)}`;

    // Perform atomic transaction conflict check (ADR-006)
    const result = await adminDb.runTransaction(async (transaction) => {
      const querySnapshot = await transaction.get(
        adminDb.collection('inventory_allocations').where('resourceId', '==', resourceId)
      );

      for (const doc of querySnapshot.docs) {
        const alloc = doc.data();
        const allocStart = new Date(alloc.startAt).getTime();
        const allocEnd = new Date(alloc.endAt).getTime();

        // Conflict: reqStart < allocEnd && reqEnd > allocStart
        if (reqStart < allocEnd && reqEnd > allocStart) {
          throw new Error(`CONFL_OVERLAP: Resource ${resourceId} is already allocated from ${alloc.startAt} to ${alloc.endAt}`);
        }
      }

      const docRef = adminDb.collection('inventory_allocations').doc(allocationId);
      const data = {
        id: allocationId,
        tenantId,
        resourceId,
        allocationType,
        referenceId: referenceId || '',
        startAt,
        endAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      transaction.set(docRef, data);
      return data;
    });

    return NextResponse.json({ success: true, message: 'Inventory allocated successfully', data: result });
  } catch (error: any) {
    if (error.message.startsWith('CONFL_OVERLAP:')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error creating inventory allocation:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
