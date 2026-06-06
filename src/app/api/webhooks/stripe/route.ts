import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import * as React from 'react';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import { enrollBookingInFlow, parseMarkdownToHtml } from '@/lib/notifications';
import MasterEmailWrapper from '@/components/emails/MasterEmailWrapper';

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
        const isBalancePayment = session.metadata?.isBalancePayment === 'true';
        const paymentIntentId = session.payment_intent as string;

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
          isBalancePayment,
        });

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
        
        let amountPaidTodayCalculated = amountPaid;
        let amountDueLaterCalculated = 0;
        
        if (isBalancePayment) {
          amountPaidTodayCalculated = (existingData.amountPaidToday || 0) + amountPaid;
          amountDueLaterCalculated = Math.max(0, (existingData.amountDueLater || 0) - amountPaid);
        } else {
          amountDueLaterCalculated = paymentPlan === 'deposit' ? (existingData.grandTotal - amountPaid) : 0;
        }

        // Retain current status (e.g. 'confirmed') if balance payment
        let targetStatus = existingData.status || 'pending waiver';
        if (!isBalancePayment) {
          targetStatus = 'pending waiver';
          if (isEft && paymentStatus !== 'paid') {
            targetStatus = 'pending_funds_verification';
          }
        }
        
        // Update booking document
        await bookingRef.set({
          status: targetStatus,
          amountPaidToday: amountPaidTodayCalculated,
          amountDueLater: amountDueLaterCalculated,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId || '',
          stripePaymentStatus: paymentStatus,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`✓ Updated booking ${bookingId} status to "${targetStatus}". Paid: $${amountPaidTodayCalculated}, Due Later: $${amountDueLaterCalculated}`);

        // Send notifications via Flow Manager (only on initial booking)
        if (!isBalancePayment && targetStatus === 'pending waiver') {
          try {
            await enrollBookingInFlow(bookingId, 'standard_bareboat_flow');
          } catch (flowErr) {
            console.error('Failed to enroll booking in standard bareboat flow:', flowErr);
          }
        } else if (!isBalancePayment && targetStatus === 'pending_funds_verification') {
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://motoryachtwhiskey.com';
          const portalUrl = `${siteUrl}/guest/portal?id=${bookingId}&token=${existingData.token || ''}`;
          try {
            const settingsDoc = await adminDb.collection('settings').doc('global').get();
            const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
            const branding = settings.theme || {};
            const htmlBody = parseMarkdownToHtml(`Dear ${existingData.guestName},\n\nYour bank payment of $${Number(amountPaid).toLocaleString()} is processing. Your reservation is temporarily held under booking ID **#${bookingId}**.\n\nWe will send your voyage confirmation link as soon as the funds clear.`);

            await sendEmail({
              to: existingData.guestEmail,
              subject: `Payment Processing - Booking #${bookingId}`,
              react: React.createElement(MasterEmailWrapper, {
                previewText: `Payment Processing - Booking #${bookingId}`,
                logoUrl: branding.logoUrl,
                primaryColor: branding.primaryColor || '#B9783B',
                backgroundColor: branding.backgroundColor || '#121416',
                surfaceColor: branding.surfaceColor || '#1E2124',
                foregroundColor: branding.foregroundColor || '#F4F1EA',
                mutedColor: branding.mutedColor || '#D8C7AF',
                children: React.createElement('div', { dangerouslySetInnerHTML: { __html: htmlBody } })
              })
            });

            await sendSms({
              to: existingData.guestPhone,
              text: `M/Y Whiskey: Your bank payment is processing. Your reservation is temporarily held under booking ID ${bookingId}.`
            });
          } catch (notifErr) {
            console.error('Failed to send processing alerts:', notifErr);
          }
        }
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

              // Enroll in the standard bareboat flow now that payment cleared!
              try {
                await enrollBookingInFlow(bookingId, 'standard_bareboat_flow');
              } catch (flowErr) {
                console.error('Failed to enroll booking in standard bareboat flow on payment intent success:', flowErr);
              }
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const bookingId = charge.metadata?.bookingId;
        if (bookingId) {
          const refundAmount = (charge.amount_refunded || 0) / 100;
          console.log(`Processing charge.refunded for booking ${bookingId}: $${refundAmount}`);
          const docId = `booking-${bookingId}`;
          const bookingRef = adminDb.collection('pages').doc(docId);
          const bookingSnap = await bookingRef.get();
          
          if (bookingSnap.exists) {
            const existingData = bookingSnap.data() || {};
            const oldAmountPaid = existingData.amountPaidToday || 0;
            const newAmountPaid = Math.max(0, oldAmountPaid - refundAmount);
            
            await bookingRef.set({
              refundStatus: 'refunded',
              amountRefunded: refundAmount,
              amountPaidToday: newAmountPaid,
              stripeRefundId: charge.refunds?.data[0]?.id || 'unknown',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log(`✓ Sync: Booking ${bookingId} marked as refunded for $${refundAmount} via webhook.`);
          }
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
