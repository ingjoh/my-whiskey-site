/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const { amount } = await request.json(); // amount in dollars (e.g. 150)
    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid tip amount' }, { status: 400 });
    }

    // 1. Fetch Booking
    let resolvedBookingId = bookingId;
    let booking = null;

    if (bookingId.startsWith('tkn_')) {
      const pagesSnap = await adminDb.collection('pages')
        .where('type', '==', 'booking')
        .where('token', '==', bookingId)
        .limit(1)
        .get();

      if (!pagesSnap.empty) {
        booking = pagesSnap.docs[0].data();
        resolvedBookingId = booking.id;
      } else {
        const bookingsSnap = await adminDb.collection('bookings')
          .where('token', '==', bookingId)
          .limit(1)
          .get();
        if (!bookingsSnap.empty) {
          booking = bookingsSnap.docs[0].data();
          resolvedBookingId = booking.id.replace('book_', '');
        }
      }
    } else {
      const bookingDoc = await adminDb.collection('bookings').doc(bookingId).get();
      booking = bookingDoc.exists ? bookingDoc.data() : null;

      if (!booking) {
        const legacyDoc = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
        if (legacyDoc.exists) {
          booking = legacyDoc.data();
        }
      }
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const email = booking.guestEmail;

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const isMock = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy';

    // Mock Mode fallback for local testing
    if (isMock) {
      console.warn('[Tipping] Stripe is not configured. Simulating successful tip payment in development.');
      
      // Update tipping ledger in Firestore immediately
      const galleryRef = adminDb.collection('trip_galleries').doc(resolvedBookingId);
      const gallerySnap = await galleryRef.get();
      const galleryData = gallerySnap.exists ? gallerySnap.data() : {};
      
      const currentLedger = galleryData?.tippingLedger || { totalTipped: 0, stripePaymentIntentIds: [] };
      const updatedLedger = {
        totalTipped: (currentLedger.totalTipped || 0) + (amount * 100),
        stripePaymentIntentIds: [...(currentLedger.stripePaymentIntentIds || []), `mock_intent_${Date.now()}`]
      };

      await galleryRef.set({ tippingLedger: updatedLedger }, { merge: true });
      return NextResponse.json({ url: `${origin}/trip/${booking.token || bookingId}?tipStatus=success&amount=${amount}` });
    }

    // 2. Lookup existing Stripe customer by email
    let customerId = booking.stripeCustomerId || '';
    if (!customerId && email) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
        }
      } catch (e) {
        console.warn('Failed to query Stripe customer list:', e);
      }
    }

    // 3. Create Stripe Checkout Session for Tipping
    const sessionPayload: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Crew Appreciation Gratuity - Voyage ${resolvedBookingId}`,
              description: `Direct crew tip for booking ID: ${resolvedBookingId} on ${booking.date || 'your recent excursion'}.`,
            },
            unit_amount: Math.round(amount * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        type: 'tip',
        bookingId: resolvedBookingId,
        amount: String(amount)
      },
      success_url: `${origin}/trip/${booking.token || bookingId}?tipStatus=success&amount=${amount}`,
      cancel_url: `${origin}/trip/${booking.token || bookingId}?tipStatus=cancelled`,
    };

    if (customerId) {
      sessionPayload.customer = customerId;
    } else if (email) {
      sessionPayload.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error generating tip checkout session:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
