import { NextRequest, NextResponse } from 'next/server';
import { adminDb, admin } from '@/lib/firebase-admin';
import { cancelPendingReminders, enrollBookingInFlow } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, token, newDate, newStartTime, clientMetadata } = body;

    if (!bookingId || !token || !newDate || !newStartTime || !clientMetadata) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const docId = `booking-${bookingId}`;
    const bookingRef = adminDb.collection('pages').doc(docId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const booking = bookingSnap.data() || {};

    if (booking.type !== 'booking' || booking.token !== token) {
      return NextResponse.json({ error: 'Access denied: Invalid token.' }, { status: 403 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking has already been cancelled.' }, { status: 400 });
    }

    // 1. Verify reschedule time window (must be > 7 days prior to scheduled departure)
    const tripDate = new Date(`${booking.date}T${booking.startTime || '00:00'}:00`);
    const now = new Date();
    const diffTime = tripDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 7) {
      return NextResponse.json({ 
        error: 'Voyages cannot be rescheduled within 7 days of departure. Please contact concierge.' 
      }, { status: 400 });
    }

    const vesselSlug = booking.vesselSlug;

    // 2. Server-side availability validation
    // A. Check for conflicting bookings (same date/time, same vessel, status !== cancelled, excluding self)
    const conflictingBookingsSnap = await adminDb.collection('pages')
      .where('type', '==', 'booking')
      .where('vesselSlug', '==', vesselSlug)
      .where('date', '==', newDate)
      .where('startTime', '==', newStartTime)
      .get();

    const conflicts = conflictingBookingsSnap.docs.filter(doc => doc.id !== docId && doc.data().status !== 'cancelled');
    if (conflicts.length > 0) {
      return NextResponse.json({ error: 'The requested slot is already booked.' }, { status: 409 });
    }

    // B. Check for blackouts
    const blackoutsSnap = await adminDb.collection('pages')
      .where('type', '==', 'asset-blackout')
      .get();

    const matchedBlackout = blackoutsSnap.docs.find(doc => {
      const b = doc.data();
      if (b.vesselSlug !== vesselSlug) return false;
      const bStart = new Date(b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`).getTime();
      const bEnd = new Date(b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`).getTime();
      
      const candStart = new Date(`${newDate}T${newStartTime}:00`).getTime();
      // Assume average charter is 4 hours
      const candEnd = candStart + 4 * 60 * 60 * 1000;

      return candStart < bEnd && candEnd > bStart;
    });

    if (matchedBlackout) {
      return NextResponse.json({ error: `The vessel is blacked out during this slot: ${matchedBlackout.data().title}` }, { status: 409 });
    }

    // C. Check for checkout locks (excluding locks from this guest)
    const locksSnap = await adminDb.collection('pages')
      .where('type', '==', 'lock')
      .where('vesselSlug', '==', vesselSlug)
      .where('date', '==', newDate)
      .where('startTime', '==', newStartTime)
      .get();

    const otherLock = locksSnap.docs.find(doc => {
      const l = doc.data();
      return l.holderEmail.toLowerCase().trim() !== booking.guestEmail.toLowerCase().trim();
    });

    if (otherLock) {
      return NextResponse.json({ error: 'This slot is temporarily held in another checkout.' }, { status: 409 });
    }

    // 3. Prepare Change History Audit Entry
    const auditEntry = {
      action: 'reschedule',
      timestamp: new Date().toISOString(),
      oldValue: { date: booking.date, startTime: booking.startTime, status: booking.status },
      newValue: { date: newDate, startTime: newStartTime, status: booking.status },
      ip: clientMetadata.ip || 'Unknown',
      city: clientMetadata.city || 'Unknown',
      region: clientMetadata.region || 'Unknown',
      country: clientMetadata.country || 'Unknown',
      loc: clientMetadata.loc || 'Unknown',
      userAgent: clientMetadata.userAgent || 'Unknown',
      browser: clientMetadata.browser || 'Unknown',
      os: clientMetadata.os || 'Unknown',
      device: clientMetadata.device || 'Unknown',
    };

    // 4. Update the Booking Document in Firestore
    const currentHistory = booking.changeHistory || [];
    await bookingRef.set({
      date: newDate,
      startTime: newStartTime,
      changeHistory: [...currentHistory, auditEntry],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✓ Rescheduled booking ${bookingId} to ${newDate} @ ${newStartTime}`);

    // 5. Cancel Scheduled Reminders
    await cancelPendingReminders(bookingId, '');
    console.log(`✓ Cancelled old pending notifications for ${bookingId}`);

    // 6. Re-enroll in Flow
    await enrollBookingInFlow(bookingId, 'standard_bareboat_flow');
    console.log(`✓ Re-enrolled booking ${bookingId} in notification flow`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reschedule API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
