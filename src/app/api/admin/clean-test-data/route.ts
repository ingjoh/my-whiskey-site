import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== 'Tuamotu2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logOutput: string[] = [];
    logOutput.push(`Starting precise production database cleanup...`);

    const bookingToKeep = 'BK-685516';
    const customerToKeep = 'customer-oseifam19-gmail-com';

    // 1. Purge bookings collection
    logOutput.push('--- Purging bookings collection ---');
    const bookingsSnap = await adminDb.collection('bookings').get();
    let bookingsPurged = 0;
    for (const doc of bookingsSnap.docs) {
      if (doc.id !== `book_${bookingToKeep}`) {
        await doc.ref.delete();
        bookingsPurged++;
      }
    }
    logOutput.push(`✓ Deleted ${bookingsPurged} test bookings.`);

    // 2. Purge pages collection (type == booking)
    logOutput.push('--- Purging pages (type == booking) ---');
    const pageBookingsSnap = await adminDb.collection('pages').where('type', '==', 'booking').get();
    let pageBookingsPurged = 0;
    for (const doc of pageBookingsSnap.docs) {
      if (doc.id !== `booking-${bookingToKeep}`) {
        await doc.ref.delete();
        pageBookingsPurged++;
      }
    }
    logOutput.push(`✓ Deleted ${pageBookingsPurged} test booking page documents.`);

    // 3. Purge pages collection (type == customer)
    logOutput.push('--- Purging pages (type == customer) ---');
    const pageCustomersSnap = await adminDb.collection('pages').where('type', '==', 'customer').get();
    let pageCustomersPurged = 0;
    for (const doc of pageCustomersSnap.docs) {
      if (doc.id !== customerToKeep) {
        await doc.ref.delete();
        pageCustomersPurged++;
      }
    }
    logOutput.push(`✓ Deleted ${pageCustomersPurged} test customer profiles.`);

    // 4. Purge pages collection (type == waiver_signature)
    logOutput.push('--- Purging pages (type == waiver_signature) ---');
    const pageWaiversSnap = await adminDb.collection('pages').where('type', '==', 'waiver_signature').get();
    let pageWaiversPurged = 0;
    for (const doc of pageWaiversSnap.docs) {
      const data = doc.data();
      const referencesOsei = JSON.stringify(data).includes(bookingToKeep);
      if (!referencesOsei) {
        await doc.ref.delete();
        pageWaiversPurged++;
      }
    }
    logOutput.push(`✓ Deleted ${pageWaiversPurged} test waivers.`);

    // 5. Purge pages collection (type == lock)
    logOutput.push('--- Purging pages (type == lock) ---');
    const pageLocksSnap = await adminDb.collection('pages').where('type', '==', 'lock').get();
    let pageLocksPurged = 0;
    for (const doc of pageLocksSnap.docs) {
      const data = doc.data();
      const referencesOsei = JSON.stringify(data).includes(bookingToKeep);
      if (!referencesOsei) {
        await doc.ref.delete();
        pageLocksPurged++;
      }
    }
    logOutput.push(`✓ Deleted ${pageLocksPurged} test checkout locks.`);

    // 6. Cleanup legacy 'home' document in pages collection (workspaceId undefined)
    logOutput.push('--- Purging legacy home document ---');
    let legacyHomeCleaned = false;
    try {
      const docRef = adminDb.collection('pages').doc('home');
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data();
        if (data && data.workspaceId === undefined) {
          await docRef.delete();
          logOutput.push('✓ Successfully deleted legacy "home" document from target database.');
          legacyHomeCleaned = true;
        } else {
          logOutput.push('ℹ "home" document has active workspaceId, skipped deletion.');
        }
      } else {
        logOutput.push('ℹ Legacy "home" document not found in target database.');
      }
    } catch (e: any) {
      logOutput.push(`❌ Error deleting legacy "home" document: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Purge of production test data completed successfully!',
      purged: {
        bookings: bookingsPurged,
        pageBookings: pageBookingsPurged,
        customers: pageCustomersPurged,
        waivers: pageWaiversPurged,
        locks: pageLocksPurged,
        legacyHomeCleaned
      },
      log: logOutput
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
