import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

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
      isBalancePayment,
      bookingToken,
    } = body;

    if (!bookingId || !amount || !email || !experienceSlug || !experienceTitle) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const isProd = process.env.NODE_ENV === 'production';

    // Read attribution cookies
    const referredById = request.cookies.get('whiskey_referred_by_id')?.value;
    const referredByType = request.cookies.get('whiskey_referred_by_type')?.value;
    const utmSource = request.cookies.get('whiskey_utm_source')?.value;
    const utmMedium = request.cookies.get('whiskey_utm_medium')?.value;
    const utmCampaign = request.cookies.get('whiskey_utm_campaign')?.value;
    const fbp = request.cookies.get('_fbp')?.value;
    const fbc = request.cookies.get('_fbc')?.value;

    // Fetch and load the actual booking from Firestore
    const bookingRef = adminDb.collection('pages').doc(`booking-${bookingId}`);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json(
        { error: 'Booking record not found.' },
        { status: 404 }
      );
    }
    const bookingData = bookingSnap.data() || {};

    let finalAmount = amount; // fallback if calculation fails

    // Load site settings to get financial config
    const settingsSnap = await adminDb.collection('settings').doc('global').get();
    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
    const financial = settings.financial || {};
    const isConvenienceFeeEnabled = financial.enableConvenienceFee ?? true;
    const convenienceFeeRate = financial.convenienceFeePercentage ?? 3.5;
    const depositPercentage = financial.depositPercentage ?? 20;

    if (!isBalancePayment) {
      const subtotal = bookingData.subtotal || 0;
      const captainFee = bookingData.captainFee || 0;
      
      // Verify & Calculate discount code server-side
      let serverDiscountAmount = 0;
      if (bookingData.discountCode) {
        const discountRef = adminDb.collection('pages').doc(`discount-${bookingData.discountCode.toUpperCase()}`);
        const discountSnap = await discountRef.get();
        if (discountSnap.exists && discountSnap.data()?.type === 'discount' && discountSnap.data()?.active) {
          const discountVal = discountSnap.data() || {};
          
          let isExpired = false;
          if (discountVal.expirationDate) {
            const today = new Date();
            today.setHours(0,0,0,0);
            const expDate = new Date(discountVal.expirationDate + 'T23:59:59');
            if (today.getTime() > expDate.getTime()) {
              isExpired = true;
            }
          }
          
          if (!isExpired) {
            serverDiscountAmount = discountVal.discountType === 'percent'
              ? subtotal * (discountVal.value / 100)
              : Math.min(subtotal, discountVal.value);
          }
        }
      }

      const discountedSubtotal = Math.max(0, subtotal - serverDiscountAmount);
      const salesTax = discountedSubtotal * 0.075;
      const insuranceCost = bookingData.cancellationInsurance ? discountedSubtotal * 0.05 : 0;
      
      const grandTotalWithoutInsurance = discountedSubtotal + salesTax + captainFee;
      
      // Calculate split payments
      const baseAmountDueToday = bookingData.paymentPlan === 'deposit'
        ? (grandTotalWithoutInsurance * (depositPercentage / 100)) + insuranceCost
        : grandTotalWithoutInsurance + insuranceCost;
        
      const baseAmountDueLater = bookingData.paymentPlan === 'deposit'
        ? grandTotalWithoutInsurance * ((100 - depositPercentage) / 100)
        : 0;

      // Card convenience fees
      const convenienceFeeToday = isConvenienceFeeEnabled && bookingData.paymentMethod === 'card'
        ? (baseAmountDueToday * (convenienceFeeRate / 100))
        : 0;
        
      const convenienceFeeLater = isConvenienceFeeEnabled && bookingData.paymentMethod === 'card'
        ? (baseAmountDueLater * (convenienceFeeRate / 100))
        : 0;

      const finalAmountDueToday = Math.round((baseAmountDueToday + convenienceFeeToday) * 100) / 100;
      const finalAmountDueLater = Math.round((baseAmountDueLater + convenienceFeeLater) * 100) / 100;
      const calculatedGrandTotal = Math.round((baseAmountDueToday + baseAmountDueLater + convenienceFeeToday + convenienceFeeLater) * 100) / 100;
      const calculatedConvenienceFeeTotal = Math.round((convenienceFeeToday + convenienceFeeLater) * 100) / 100;

      finalAmount = finalAmountDueToday;

      // Update Firestore document with correct verified figures
      await bookingRef.set({
        discountAmount: serverDiscountAmount,
        salesTax: Math.round(salesTax * 100) / 100,
        grandTotal: calculatedGrandTotal,
        amountDueLater: finalAmountDueLater,
        convenienceFeeAmount: calculatedConvenienceFeeTotal,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[Server Calc] Booking ${bookingId} verified. Subtotal: $${subtotal}, Discount: -$${serverDiscountAmount}, Today: $${finalAmountDueToday}, Later: $${finalAmountDueLater}`);
    } else {
      // Balance payment
      finalAmount = bookingData.amountDueLater || 0;
      console.log(`[Server Calc] Booking ${bookingId} Balance payment verified. Amount: $${finalAmount}`);
    }

    // Verify secret key is set
    if (!process.env.STRIPE_SECRET_KEY) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Missing STRIPE_SECRET_KEY in development mode. Simulating a mock Stripe redirect.');
        
        // Simulating the database write that would happen in the Stripe Webhook
        try {
          if (bookingSnap.exists) {
            const bData = await bookingRef.get().then(snap => snap.data() || {});
            let commissionRate = 0;
            let commissionAmount = 0;
            let commissionStatus: 'pending_charter' | 'n/a' = 'n/a';

            if (referredById && referredByType) {
              const referrerDoc = await adminDb.collection('pages').doc(`content-item-${referredById}`).get();
              if (referrerDoc.exists) {
                const rData = referrerDoc.data() || {};
                commissionRate = Number(rData.defaultCommissionRate || rData.commissionRate) || 10;
                const subtotal = bData.subtotal || 0;
                commissionAmount = (subtotal * commissionRate) / 100;
                commissionStatus = 'pending_charter';
              }
            }

            const paidToday = isBalancePayment 
              ? (bData.amountPaidToday || 0) + finalAmount 
              : finalAmount;
            const dueLater = isBalancePayment 
              ? Math.max(0, (bData.amountDueLater || 0) - finalAmount)
              : (paymentPlan === 'deposit' ? (bData.grandTotal - finalAmount) : 0);

            await bookingRef.set({
              status: isBalancePayment ? (bData.status || 'pending waiver') : 'pending waiver',
              amountPaidToday: paidToday,
              amountDueLater: dueLater,
              referredById: referredById || '',
              referredByType: referredByType || '',
              commissionRate,
              commissionAmount,
              commissionStatus,
              utmSource: utmSource || '',
              utmMedium: utmMedium || '',
              utmCampaign: utmCampaign || '',
              updatedAt: new Date().toISOString()
            }, { merge: true });
            
            console.log(`✓ [Mock Checkout] Saved booking ${bookingId} with status 'pending waiver' and commission $${commissionAmount}`);
          }
        } catch (dbErr) {
          console.error('[Mock Checkout] Failed to update local booking data:', dbErr);
        }

        const mockUrl = isBalancePayment
          ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=success`
          : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success`;
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
      amount: finalAmount,
      email,
      experienceTitle,
      paymentPlan,
      isBalancePayment,
    });

    const successUrl = isBalancePayment
      ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=success&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isBalancePayment
      ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=cancelled`
      : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=cancelled`;

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
              name: isBalancePayment ? `Remaining Balance - Charter Booking ${bookingId}` : `${experienceTitle} - Charter Booking`,
              description: isBalancePayment 
                ? `Outstanding Balance Payment for Charter booking ID: ${bookingId} on ${date}.`
                : `Booking ID: ${bookingId} for Voyage on ${date} at ${startTime}. Vessel: ${vesselTitle}. Plan: ${paymentPlan === 'deposit' ? '20% Deposit Plan' : 'Pay in Full'}.`,
            },
            unit_amount: Math.round(finalAmount * 100), // in cents
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
        isBalancePayment: isBalancePayment ? 'true' : 'false',
        referredById: referredById || '',
        referredByType: referredByType || '',
        utmSource: utmSource || '',
        utmMedium: utmMedium || '',
        utmCampaign: utmCampaign || '',
        fbp: fbp || '',
        fbc: fbc || '',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
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
