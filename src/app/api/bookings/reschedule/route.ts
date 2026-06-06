import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { cancelPendingReminders, enrollBookingInFlow } from '@/lib/notifications';

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

// Fetch all documents in a collection via REST API
async function getFirestoreCollectionRest(collectionName: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mywhiskey-97620';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const documents = data.documents || [];
  
  return documents.map((doc: any) => {
    const nameParts = doc.name.split('/');
    const docId = nameParts[nameParts.length - 1];
    const result: any = { id: docId };
    const fields = doc.fields || {};
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
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, token, newDate, newStartTime, clientMetadata } = body;

    if (!bookingId || !token || !newDate || !newStartTime || !clientMetadata) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    let booking: any = null;
    let conflicts: any[] = [];
    let blackouts: any[] = [];
    let locks: any[] = [];
    let isCredsErr = false;

    const docId = `booking-${bookingId}`;

    try {
      const bookingRef = adminDb.collection('pages').doc(docId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) {
        return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
      }
      booking = bookingSnap.data() || {};
      
      const conflictingBookingsSnap = await adminDb.collection('pages')
        .where('type', '==', 'booking')
        .where('vesselSlug', '==', booking.vesselSlug)
        .where('date', '==', newDate)
        .where('startTime', '==', newStartTime)
        .get();

      conflicts = conflictingBookingsSnap.docs.filter(doc => doc.id !== docId && doc.data().status !== 'cancelled').map(d => d.data());

      const blackoutsSnap = await adminDb.collection('pages')
        .where('type', '==', 'asset-blackout')
        .get();
      blackouts = blackoutsSnap.docs.map(d => d.data());

      const locksSnap = await adminDb.collection('pages')
        .where('type', '==', 'lock')
        .where('vesselSlug', '==', booking.vesselSlug)
        .where('date', '==', newDate)
        .where('startTime', '==', newStartTime)
        .get();
      locks = locksSnap.docs.map(d => d.data());

    } catch (dbErr: any) {
      isCredsErr = dbErr.message?.includes('credentials') || dbErr.message?.includes('default credentials');
      if (process.env.NODE_ENV === 'development' && isCredsErr) {
        console.warn('Firebase Admin credentials not found. Falling back to public REST API in development.');
        
        booking = await getFirestoreDocRest('pages', `booking-${bookingId}`);
        if (!booking) {
          return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
        }
        
        const allPages = await getFirestoreCollectionRest('pages');
        
        conflicts = allPages.filter((p: any) => 
          p.type === 'booking' && 
          p.vesselSlug === booking.vesselSlug && 
          p.date === newDate && 
          p.startTime === newStartTime && 
          p.status !== 'cancelled' && 
          p.id !== bookingId
        );
        
        blackouts = allPages.filter((p: any) => p.type === 'asset-blackout');
        
        locks = allPages.filter((p: any) => 
          p.type === 'lock' && 
          p.vesselSlug === booking.vesselSlug && 
          p.date === newDate && 
          p.startTime === newStartTime
        );
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
    if (conflicts.length > 0) {
      return NextResponse.json({ error: 'The requested slot is already booked.' }, { status: 409 });
    }

    // B. Check for blackouts
    const matchedBlackout = blackouts.find(b => {
      if (b.vesselSlug !== vesselSlug) return false;
      const bStart = new Date(b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`).getTime();
      const bEnd = new Date(b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`).getTime();
      
      const candStart = new Date(`${newDate}T${newStartTime}:00`).getTime();
      // Assume average charter is 4 hours
      const candEnd = candStart + 4 * 60 * 60 * 1000;

      return candStart < bEnd && candEnd > bStart;
    });

    if (matchedBlackout) {
      return NextResponse.json({ error: `The vessel is blacked out during this slot: ${matchedBlackout.title}` }, { status: 409 });
    }

    // C. Check for checkout locks (excluding locks from this guest)
    const otherLock = locks.find(l => {
      return l.holderEmail?.toLowerCase().trim() !== booking.guestEmail?.toLowerCase().trim();
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

    const currentHistory = booking.changeHistory || [];
    let isSimulated = false;

    try {
      // 4. Update the Booking Document in Firestore
      const bookingRef = adminDb.collection('pages').doc(docId);
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
      
    } catch (writeErr: any) {
      const isWriteCredsErr = writeErr.message?.includes('credentials') || writeErr.message?.includes('default credentials');
      if (process.env.NODE_ENV === 'development' && isWriteCredsErr) {
        console.warn('Firebase Admin credentials not found. Simulating database write locally in development.');
        isSimulated = true;
      } else {
        throw writeErr;
      }
    }

    return NextResponse.json({ 
      success: true, 
      simulated: isSimulated,
      simulatedDate: newDate,
      simulatedStartTime: newStartTime
    });
  } catch (error: any) {
    console.error('Reschedule API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
