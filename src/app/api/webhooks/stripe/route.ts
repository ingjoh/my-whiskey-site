import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    console.error('Webhook verification failed: Missing signature or endpoint secret.');
    return NextResponse.json(
      { error: 'Missing stripe-signature or webhook signing secret.' },
      { status: 400 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Error reading request body: ${err.message}` },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`Received Stripe Webhook Event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.bookingId;
        const paymentPlan = session.metadata?.paymentPlan;

        if (!bookingId) {
          console.log('Skipping session: No bookingId found in metadata.');
          break;
        }

        const amountPaid = (session.amount_total || 0) / 100; // convert cents to dollars
        const paymentStatus = session.payment_status; // 'paid', 'unpaid', 'no_payment_required'
        const isEft = session.payment_method_types?.includes('us_bank_account');

        console.log(`Processing checkout.session.completed for booking ${bookingId}:`, {
          amountPaid,
          paymentStatus,
          isEft,
        });

        // Determine booking status
        // If payment cleared instantly (e.g. Card), status becomes 'pending waiver'
        // If ACH direct debit is pending verification, status becomes 'pending_funds_verification'
        let targetStatus: 'pending waiver' | 'pending_funds_verification' = 'pending waiver';
        if (isEft && paymentStatus !== 'paid') {
          targetStatus = 'pending_funds_verification';
        }

        const docId = `booking-${bookingId}`;
        const bookingRef = adminDb.collection('pages').doc(docId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
          console.error(`Booking ${bookingId} not found in database.`);
          return NextResponse.json(
            { error: `Booking ${bookingId} not found` },
            { status: 404 }
          );
        }

        const existingData = bookingSnap.data() || {};
        
        // Update booking document
        await bookingRef.set({
          status: targetStatus,
          amountPaidToday: amountPaid,
          // Calculate amount due later based on payment plan
          amountDueLater: paymentPlan === 'deposit' ? (existingData.grandTotal - amountPaid) : 0,
          stripeSessionId: session.id,
          stripePaymentStatus: paymentStatus,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`✓ Updated booking ${bookingId} status to "${targetStatus}".`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          console.log(`Processing payment_intent.succeeded for booking ${bookingId}`);
          const docId = `booking-${bookingId}`;
          const bookingRef = adminDb.collection('pages').doc(docId);
          const bookingSnap = await bookingRef.get();

          if (bookingSnap.exists) {
            const data = bookingSnap.data() || {};
            // If it was ACH/EFT pending funds, mark it as 'pending waiver' now that payment cleared
            if (data.status === 'pending_funds_verification') {
              await bookingRef.set({
                status: 'pending waiver',
                stripePaymentStatus: 'paid',
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              console.log(`✓ Funds cleared for booking ${bookingId}. Status updated to "pending waiver".`);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const bookingId = paymentIntent.metadata?.bookingId;

        if (bookingId) {
          console.log(`Processing payment_intent.payment_failed for booking ${bookingId}`);
          const docId = `booking-${bookingId}`;
          const bookingRef = adminDb.collection('pages').doc(docId);
          await bookingRef.set({
            status: 'cancelled',
            stripePaymentFailureReason: paymentIntent.last_payment_error?.message || 'Unknown failure',
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          console.log(`✗ Updated booking ${bookingId} status to "cancelled" due to payment failure.`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook execution failure:', error);
    return NextResponse.json(
      { error: `Webhook handler failed: ${error.message}` },
      { status: 500 }
    );
  }
}
