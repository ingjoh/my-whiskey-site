import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (process.env.NODE_ENV === 'development' && !serviceAccountJson) {
    return true; // Auto-authorize in local development mode without credentials
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return !!decodedToken;
  } catch (error) {
    console.error('Error verifying auth in trips API:', error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    let resolvedBookingId = bookingId;
    let bookingDetails = null;

    // Check if the input ID is a token
    if (bookingId.startsWith('tkn_')) {
      // Look up by token in pages collection
      const pagesSnap = await adminDb.collection('pages')
        .where('type', '==', 'booking')
        .where('token', '==', bookingId)
        .limit(1)
        .get();

      if (!pagesSnap.empty) {
        bookingDetails = pagesSnap.docs[0].data();
        resolvedBookingId = bookingDetails.id;
      } else {
        // Try bookings collection
        const bookingsSnap = await adminDb.collection('bookings')
          .where('token', '==', bookingId)
          .limit(1)
          .get();
        if (!bookingsSnap.empty) {
          bookingDetails = bookingsSnap.docs[0].data();
          resolvedBookingId = bookingDetails.id.replace('book_', '');
        }
      }
    } else {
      // Direct lookup in bookings collection
      const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
      bookingDetails = bookingSnap.exists ? bookingSnap.data() : null;

      // Fallback to pages collection legacy format
      if (!bookingDetails) {
        const legacySnap = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
        if (legacySnap.exists) {
          bookingDetails = legacySnap.data();
        }
      }
    }

    // Fetch associated content pages (vessel, captain, waiver, experiences)
    let vesselDetails = null;
    if (bookingDetails?.vesselSlug) {
      const vesselSnap = await adminDb.collection('pages').doc(`content-item-${bookingDetails.vesselSlug}`).get();
      if (vesselSnap.exists) {
        vesselDetails = vesselSnap.data();
      } else {
        const resourceSnap = await adminDb.collection('resources').doc(`res_${bookingDetails.vesselSlug}`).get();
        if (resourceSnap.exists) {
          vesselDetails = resourceSnap.data();
        }
      }
    }

    let captainDetails = null;
    if (bookingDetails?.captainId) {
      const captainSnap = await adminDb.collection('pages').doc(`content-item-${bookingDetails.captainId}`).get();
      if (captainSnap.exists) {
        captainDetails = captainSnap.data();
      } else {
        const resourceSnap = await adminDb.collection('resources').doc(`res_crew_${bookingDetails.captainId}`).get();
        if (resourceSnap.exists) {
          captainDetails = resourceSnap.data();
        }
      }
    }

    const waiverSnap = await adminDb.collection('pages').doc(`waiver-${resolvedBookingId}`).get();
    const waiverDetails = waiverSnap.exists ? waiverSnap.data() : null;

    const expSnap = await adminDb.collection('experiences').where('status', '==', 'published').get();
    const otherExperiences: any[] = [];
    expSnap.forEach(doc => {
      const data = doc.data();
      if (data.id !== `exp_${bookingDetails?.experienceId}`) {
        otherExperiences.push(data);
      }
    });

    const docSnap = await adminDb.collection('trip_galleries').doc(resolvedBookingId).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      // If it is not published, check if the client is authenticated
      if (data && !data.isPublished) {
        const isAuthed = await verifyAuth(request);
        if (!isAuthed) {
          return NextResponse.json({ error: 'Gallery is in draft and is not public.' }, { status: 403 });
        }
      }
      return NextResponse.json({ 
        ...data, 
        booking: bookingDetails, 
        waiver: waiverDetails, 
        vessel: vesselDetails, 
        captain: captainDetails, 
        otherExperiences 
      });
    }

    // Return empty placeholder structure if not found
    return NextResponse.json({
      id: resolvedBookingId,
      bookingId: resolvedBookingId,
      title: '',
      description: '',
      story: '',
      media: [],
      isPublished: false,
      tippingLedger: {
        totalTipped: 0,
        stripePaymentIntentIds: []
      },
      booking: bookingDetails,
      waiver: waiverDetails,
      vessel: vesselDetails,
      captain: captainDetails,
      otherExperiences
    });
  } catch (error: any) {
    console.error('Error getting trip gallery:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const isAuthed = await verifyAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, story, media, isPublished, crewIds, vesselId, stops, coverImageUrl } = body;

    const docRef = adminDb.collection('trip_galleries').doc(bookingId);
    const existingSnap = await docRef.get();
    const existingData = existingSnap.exists ? existingSnap.data() : {};

    const payload = {
      id: bookingId,
      bookingId,
      tenantId: existingData?.tenantId || 'org-whiskey',
      title: title ?? (existingData?.title || ''),
      description: description ?? (existingData?.description || ''),
      story: story ?? (existingData?.story || ''),
      media: media ?? (existingData?.media || []),
      coverImageUrl: coverImageUrl ?? (existingData?.coverImageUrl || ''),
      isPublished: isPublished ?? (existingData?.isPublished || false),
      crewIds: crewIds ?? (existingData?.crewIds || []),
      vesselId: vesselId ?? (existingData?.vesselId || ''),
      stops: stops ?? (existingData?.stops || []),
      tippingLedger: existingData?.tippingLedger || {
        totalTipped: 0,
        stripePaymentIntentIds: []
      },
      createdAt: existingData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(payload, { merge: true });
    return NextResponse.json({ success: true, gallery: payload });
  } catch (error: any) {
    console.error('Error saving trip gallery:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
