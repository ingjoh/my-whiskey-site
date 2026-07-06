import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { triggerAdminNotification } from '@/lib/admin-notifications';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const { rating, text, guestName, experienceTitle, media } = await request.json();

    if (!rating || !text) {
      return NextResponse.json({ error: 'Missing rating or review text' }, { status: 400 });
    }

    const docId = `tst_${bookingId}`;
    const payload = {
      id: docId,
      bookingId,
      guestName: guestName || 'Anonymous Guest',
      experienceTitle: experienceTitle || 'Yacht Excursion',
      rating: Number(rating),
      text,
      media: media || [],
      status: 'pending_moderation',
      featured: false,
      createdAt: new Date().toISOString()
    };

    await adminDb.collection('testimonials').doc(docId).set(payload, { merge: true });

    // Trigger Admin Notification
    try {
      await triggerAdminNotification({
        title: 'New Guest Testimonial',
        message: `Guest ${payload.guestName} rated their voyage ${payload.rating} stars: "${payload.text.substring(0, 60)}..."`,
        type: 'testimonial',
        link: `/admin/content`
      });
    } catch (notifErr) {
      console.error('Failed to trigger admin review notification:', notifErr);
    }

    return NextResponse.json({ success: true, testimonial: payload });
  } catch (error: any) {
    console.error('Error saving guest testimonial:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
