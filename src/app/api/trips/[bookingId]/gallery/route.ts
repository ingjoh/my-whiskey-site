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

    const docSnap = await adminDb.collection('trip_galleries').doc(bookingId).get();
    if (docSnap.exists) {
      const data = docSnap.data();
      // If it is not published, check if the client is authenticated
      if (data && !data.isPublished) {
        const isAuthed = await verifyAuth(request);
        if (!isAuthed) {
          return NextResponse.json({ error: 'Gallery is in draft and is not public.' }, { status: 403 });
        }
      }
      return NextResponse.json(data);
    }

    // Return empty placeholder structure if not found
    return NextResponse.json({
      id: bookingId,
      bookingId,
      title: '',
      description: '',
      story: '',
      media: [],
      isPublished: false,
      tippingLedger: {
        totalTipped: 0,
        stripePaymentIntentIds: []
      }
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
    const { title, description, story, media, isPublished, crewIds, vesselId, stops } = body;

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
