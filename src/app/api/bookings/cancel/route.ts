import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cancelPendingReminders } from '@/lib/notifications';

// Parser to convert Firestore REST API formats to clean JSON objects
async function getFirestoreDocRest(collectionName: string, docId: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const result: any = {};
  const fields = data.fields || {};
  
  for (const key in fields) {
    const valObj = fields[key];
    if ('stringValue' in valObj) result[key] = valObj.stringValue;
    else if ('booleanValue' in valObj) result[key] = valObj.booleanValue;
    else if ('integerValue' in valObj) result[key] = parseInt(valObj.integerValue, 10);
    else if ('doubleValue' in valObj) result[key] = parseFloat(valObj.doubleValue);
    else if ('arrayValue' in valObj) {
      const arr = valObj.arrayValue.values || [];
      result[key] = arr.map((item: any) => {
        if (!item) return '';
        if ('stringValue' in item) return item.stringValue;
        if ('integerValue' in item) return parseInt(item.integerValue, 10);
        if ('mapValue' in item) {
          const mapFields = item.mapValue.fields || {};
          const mapRes: any = {};
          for (const mk in mapFields) {
            const mv = mapFields[mk];
            if ('stringValue' in mv) mapRes[mk] = mv.stringValue;
            else if ('booleanValue' in mv) mapRes[mk] = mv.booleanValue;
            else if ('integerValue' in mv) mapRes[mk] = parseInt(mv.integerValue, 10);
            else if ('doubleValue' in mv) mapRes[mk] = parseFloat(mv.doubleValue);
          }
          return mapRes;
        }
        return item;
      });
    } else if ('mapValue' in valObj) {
      const mapFields = valObj.mapValue.fields || {};
      const mapRes: any = {};
      for (const mk in mapFields) {
        const mv = mapFields[mk];
        if ('stringValue' in mv) mapRes[mk] = mv.stringValue;
        else if ('booleanValue' in mv) mapRes[mk] = mv.booleanValue;
        else if ('integerValue' in mv) mapRes[mk] = parseInt(mv.integerValue, 10);
        else if ('doubleValue' in mv) mapRes[mk] = parseFloat(mv.doubleValue);
      }
      result[key] = mapRes;
    }
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, token, clientMetadata } = body;

    if (!bookingId || !token || !clientMetadata) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    let booking: any = null;
    let isCredsErr = false;
    const docId = `booking-${bookingId}`;

    try {
      const bookingRef = adminDb.collection('pages').doc(docId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }
      booking = bookingSnap.data() || {};
    } catch (dbErr: any) {
      isCredsErr = dbErr.message?.includes('credentials') || dbErr.message?.includes('default credentials');
      if (process.env.NODE_ENV === 'development' && isCredsErr) {
        console.warn('Firebase Admin credentials not found. Falling back to public REST API in development.');
        booking = await getFirestoreDocRest('pages', `booking-${bookingId}`);
        if (!booking) {
          return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
        }
      } else {
        throw dbErr;
      }
    }

    if (booking.type !== 'booking' || booking.token !== token) {
      return NextResponse.json({ error: 'Access denied: Invalid token.' }, { status: 403 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'This booking has already been cancelled.' }, { status: 400 });
    }

    // Calculate Refund policy parameters
    const subtotal = booking.subtotal || 0;
    const grandTotal = booking.grandTotal || 0;
    const rawPaidToday = booking.amountPaidToday || 0;
    const rawDueLater = booking.amountDueLater || 0;
    
    // Inferred amount paid today if webhook failed to run but booking is confirmed
    const isActive = booking.status !== 'pending' && booking.status !== 'cancelled';
    const amountPaidToday = (isActive && rawPaidToday === 0)
      ? Math.max(0, grandTotal - rawDueLater)
      : rawPaidToday;

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

    const currentHistory = booking.changeHistory || [];
    let isSimulated = false;

    try {
      // 2. Update Booking Document
      const bookingRef = adminDb.collection('pages').doc(docId);
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
    } catch (writeErr: any) {
      const isWriteCredsErr = writeErr.message?.includes('credentials') || writeErr.message?.includes('default credentials');
      if (process.env.NODE_ENV === 'development' && isWriteCredsErr) {
        console.warn('Firebase Admin credentials not found. Simulating cancel database update locally in development.');
        isSimulated = true;
      } else {
        throw writeErr;
      }
    }

    return NextResponse.json({ 
      success: true, 
      simulated: isSimulated,
      refundEstimate, 
      policyApplied: policyText 
    });
  } catch (error: any) {
    console.error('Cancellation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
