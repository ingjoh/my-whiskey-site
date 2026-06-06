import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cancelPendingReminders } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, token, clientMetadata } = body;

    if (!bookingId || !token || !clientMetadata) {
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

    // Calculate Refund policy parameters
    const subtotal = booking.subtotal || 0;
    const grandTotal = booking.grandTotal || 0;
    const amountPaidToday = booking.amountPaidToday || 0;
    const hasInsurance = booking.cancellationInsurance || false;
    const insuranceCost = hasInsurance ? subtotal * 0.05 : 0;

    const tripDate = new Date(`${booking.date}T${booking.startTime || '00:00'}:00`);
    const now = new Date();
    const diffTime = tripDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    let refundPercent = 0;
    let refundEstimate = 0;
    let policyText = '';

    if (hasInsurance) {
      if (diffHours >= 48) {
        refundPercent = 100;
        refundEstimate = Math.max(0, amountPaidToday - insuranceCost);
        policyText = 'With Cancellation Insurance (> 48 hours prior): 100% refund of amount paid, excluding the insurance premium.';
      } else {
        refundPercent = 50;
        const customerLiability = 0.5 * (grandTotal - insuranceCost) + insuranceCost;
        refundEstimate = Math.max(0, amountPaidToday - customerLiability);
        policyText = 'With Cancellation Insurance (< 48 hours prior): 50% refund of total charter cost, excluding the insurance premium.';
      }
    } else {
      if (diffDays >= 14) {
        refundPercent = 100;
        refundEstimate = amountPaidToday;
        policyText = 'Without Cancellation Insurance (> 14 days prior): 100% refund of amount paid.';
      } else if (diffDays >= 7 && diffDays < 14) {
        refundPercent = 50;
        const customerLiability = 0.5 * grandTotal;
        refundEstimate = Math.max(0, amountPaidToday - customerLiability);
        policyText = 'Without Cancellation Insurance (7 to 14 days prior): 50% refund of total charter cost.';
      } else {
        refundPercent = 0;
        refundEstimate = 0;
        policyText = 'Without Cancellation Insurance (< 7 days prior): No refund.';
      }
    }

    // Round refund estimate to 2 decimal places
    refundEstimate = Math.round(refundEstimate * 100) / 100;

    // 1. Prepare Change History Audit Entry
    const auditEntry = {
      action: 'cancel',
      timestamp: new Date().toISOString(),
      oldValue: { date: booking.date, startTime: booking.startTime, status: booking.status },
      newValue: { date: booking.date, startTime: booking.startTime, status: 'cancelled' },
      refundEstimate,
      policyApplied: policyText,
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

    // 2. Update Booking Document
    const currentHistory = booking.changeHistory || [];
    await bookingRef.set({
      status: 'cancelled',
      refundStatus: 'pending_manual_refund',
      refundEstimate: refundEstimate,
      amountDueLater: 0, // cancelled bookings do not have outstanding balances
      changeHistory: [...currentHistory, auditEntry],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✓ Cancelled booking ${bookingId}. Estimated refund: $${refundEstimate} (Applied: ${policyText})`);

    // 3. Cancel Scheduled Reminders
    await cancelPendingReminders(bookingId, '');
    console.log(`✓ Cancelled all pending notifications for ${bookingId}`);

    return NextResponse.json({ 
      success: true, 
      refundEstimate, 
      policyApplied: policyText 
    });
  } catch (error: any) {
    console.error('Cancellation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
