import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingId,
      amount,
      email,
      experienceTitle,
      experienceSlug,
      date,
      startTime,
      vesselTitle,
      paymentPlan,
    } = body;

    if (!bookingId || !amount || !email || !experienceSlug || !experienceTitle) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const isProd = process.env.NODE_ENV === 'production';

    // Verify secret key is set
    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Missing STRIPE_SECRET_KEY in development mode. Simulating a mock Stripe redirect.');
        const mockUrl = `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success`;
        return NextResponse.json({ url: mockUrl });
      }
      console.error('Missing STRIPE_SECRET_KEY environment variable');
      return NextResponse.json(
        { error: 'Stripe integration is not configured on the server.' },
        { status: 500 }
      );
    }

    console.log('Creating Stripe checkout session for:', {
      bookingId,
      amount,
      email,
      experienceTitle,
      paymentPlan,
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ['payment_method'],
          },
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${experienceTitle} - Charter Booking`,
              description: `Booking ID: ${bookingId} for Voyage on ${date} at ${startTime}. Vessel: ${vesselTitle}. Plan: ${paymentPlan === 'deposit' ? '20% Deposit Plan' : 'Pay in Full'}.`,
            },
            unit_amount: Math.round(amount * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      metadata: {
        bookingId,
        paymentPlan,
        experienceSlug,
      },
      success_url: `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
