import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const tenantId = searchParams.get('tenantId') || 'org-whiskey';

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId parameter' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('operational_itineraries')
      .where('tenantId', '==', tenantId)
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ success: true, data: null });
    }

    const itinerary = snapshot.docs[0].data();
    return NextResponse.json({ success: true, data: itinerary });
  } catch (error: any) {
    console.error('Error fetching operational itinerary:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      bookingId,
      vesselResourceId,
      stops = [],
      status = 'scheduled',
      tenantId = 'org-whiskey'
    } = body;

    if (!bookingId || !vesselResourceId) {
      return NextResponse.json({ error: 'Missing required fields: bookingId, vesselResourceId' }, { status: 400 });
    }

    const itineraryId = id || `opit_${bookingId}`;
    const docRef = adminDb.collection('operational_itineraries').doc(itineraryId);
    const existing = await docRef.get();
    const now = new Date().toISOString();

    const data = {
      id: itineraryId,
      tenantId,
      bookingId,
      vesselResourceId,
      stops,
      status,
      createdAt: existing.exists ? existing.data()?.createdAt : now,
      updatedAt: now
    };

    await docRef.set(data);
    return NextResponse.json({ success: true, message: 'Operational itinerary saved successfully', data });
  } catch (error: any) {
    console.error('Error saving operational itinerary:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
