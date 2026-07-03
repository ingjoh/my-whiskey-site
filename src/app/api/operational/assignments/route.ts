import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itineraryId = searchParams.get('itineraryId');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (!itineraryId) {
      return NextResponse.json({ error: 'Missing itineraryId parameter' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('assignments')
      .where('tenantId', '==', tenantId)
      .where('itineraryId', '==', itineraryId)
      .get();

    const assignments = snapshot.docs.map(doc => doc.data());
    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      itineraryId,
      bookingId,
      resourceId,
      requiredCapability,
      startAt,
      endAt,
      tenantId = 'org-whiskey'
    } = body;

    if (!itineraryId || !bookingId || !resourceId || !startAt || !endAt) {
      return NextResponse.json({ error: 'Missing required fields: itineraryId, bookingId, resourceId, startAt, endAt' }, { status: 400 });
    }

    const reqStart = new Date(startAt).getTime();
    const reqEnd = new Date(endAt).getTime();

    if (isNaN(reqStart) || isNaN(reqEnd) || reqStart >= reqEnd) {
      return NextResponse.json({ error: 'Invalid startAt or endAt timestamp values' }, { status: 400 });
    }

    // 1. Verify Resource Capabilities (if it is a crew resource)
    const resourceRef = adminDb.collection('resources').doc(resourceId);
    const resourceSnap = await resourceRef.get();
    if (!resourceSnap.exists) {
      return NextResponse.json({ error: `Resource ${resourceId} does not exist` }, { status: 404 });
    }
    const resource = resourceSnap.data() || {};

    if (resource.type === 'crew' && requiredCapability) {
      const caps = resource.humanConfig?.capabilities || [];
      if (!caps.includes(requiredCapability)) {
        return NextResponse.json({
          error: `Capability verification failed: Resource "${resource.name}" does not possess the required "${requiredCapability}" qualification.`
        }, { status: 400 });
      }
    }

    const assignmentId = `asg_${Math.floor(100000 + Math.random() * 900000)}`;
    const allocationId = `inv_asg_${assignmentId}`;

    // 2. Perform atomic conflict check and write assignment/allocation documents inside a transaction (ADR-006)
    const result = await adminDb.runTransaction(async (transaction) => {
      const querySnapshot = await transaction.get(
        adminDb.collection('inventory_allocations').where('resourceId', '==', resourceId)
      );

      for (const doc of querySnapshot.docs) {
        const alloc = doc.data();
        const allocStart = new Date(alloc.startAt).getTime();
        const allocEnd = new Date(alloc.endAt).getTime();

        // Conflict check
        if (reqStart < allocEnd && reqEnd > allocStart) {
          throw new Error(`CONFL_OVERLAP: Resource "${resource.name}" is already allocated from ${alloc.startAt} to ${alloc.endAt}`);
        }
      }

      // Write Assignment document
      const assignmentRef = adminDb.collection('assignments').doc(assignmentId);
      const assignmentData = {
        id: assignmentId,
        tenantId,
        itineraryId,
        bookingId,
        resourceId,
        requiredCapability: requiredCapability || '',
        status: 'assigned',
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transaction.set(assignmentRef, assignmentData);

      // Write Allocation document in the capacity ledger
      const allocationRef = adminDb.collection('inventory_allocations').doc(allocationId);
      const allocationData = {
        id: allocationId,
        tenantId,
        resourceId,
        allocationType: 'assignment',
        referenceId: assignmentId,
        startAt,
        endAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transaction.set(allocationRef, allocationData);

      return { assignment: assignmentData, allocation: allocationData };
    });

    return NextResponse.json({ success: true, message: 'Resource assigned successfully', data: result });
  } catch (error: any) {
    if (error.message.startsWith('CONFL_OVERLAP:')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
