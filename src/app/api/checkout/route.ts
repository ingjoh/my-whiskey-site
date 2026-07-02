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
      offerId,
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

    // --- NEW DECOUPLED OFFER PATHWAY ---
    if (offerId) {
      console.log(`[Checkout] Resolving offer checkout for offerId: ${offerId}`);
      const offerRef = adminDb.collection('offers').doc(offerId);
      const offerSnap = await offerRef.get();
      if (!offerSnap.exists) {
        return NextResponse.json({ error: 'Offer record not found.' }, { status: 404 });
      }

      const offerData = offerSnap.data() || {};
      if (offerData.isAccepted || offerData.status === 'accepted') {
        return NextResponse.json({ error: 'This offer has already been accepted.' }, { status: 400 });
      }

      const proposalId = offerData.proposalId;
      const proposalRef = adminDb.collection('proposals').doc(proposalId);
      const proposalSnap = await proposalRef.get();
      const proposalData = proposalSnap.exists ? proposalSnap.data() || {} : {};

      const guestId = proposalData.recipientId || '';
      let guestEmail = email || '';
      let guestName = '';

      if (guestId) {
        const guestSnap = await adminDb.collection('people').doc(guestId).get();
        if (guestSnap.exists) {
          const guestData = guestSnap.data() || {};
          guestEmail = guestData.email || guestEmail;
          guestName = `${guestData.firstName || ''} ${guestData.lastName || ''}`.trim();
        }
      }

      const expRef = adminDb.collection('experiences').doc(offerData.experienceId);
      const expSnap = await expRef.get();
      const expData = expSnap.exists ? expSnap.data() || {} : {};
      const calculatedSlug = experienceSlug || expData.id?.replace('exp_', '') || 'sunset-snacks-cruise-baytowne';
      const calculatedTitle = experienceTitle || expData.title || 'Yacht Excursion';

      const finalAmount = paymentPlan === 'deposit'
        ? offerData.pricingSnapshot.depositRequired
        : offerData.pricingSnapshot.grandTotal;

      // Mock checkout in development mode when Stripe key is missing
      if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
        console.warn('Missing STRIPE_SECRET_KEY. Simulating a mock Stripe redirect for Offer.');

        const generatedBookingId = `BK_${Math.floor(100000 + Math.random() * 900000)}`;

        // Atomic update transaction
        await adminDb.runTransaction(async (transaction) => {
          // Set Offer to accepted
          transaction.set(offerRef, {
            status: 'accepted',
            isAccepted: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Expire other offers for this proposal
          if (proposalId) {
            const siblingOffers = await adminDb.collection('offers')
              .where('proposalId', '==', proposalId)
              .get();
            siblingOffers.forEach((siblingDoc) => {
              if (siblingDoc.id !== offerId) {
                transaction.set(siblingDoc.ref, {
                  status: 'expired',
                  updatedAt: new Date().toISOString()
                }, { merge: true });
              }
            });
            transaction.set(proposalRef, {
              status: 'accepted',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }

          // Create new Booking
          const newBookingRef = adminDb.collection('bookings').doc(generatedBookingId);
          transaction.set(newBookingRef, {
            id: generatedBookingId,
            tenantId: offerData.tenantId || 'org-whiskey',
            acceptedOfferId: offerId,
            guestId: guestId,
            status: 'confirmed',
            paymentStatus: paymentPlan === 'deposit' ? 'deposit_paid' : 'fully_paid',
            stripePaymentIntentId: 'mock_intent_id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          // Create legacy stub inside /pages for component compatibility
          const legacyRef = adminDb.collection('pages').doc(`booking-${generatedBookingId}`);
          transaction.set(legacyRef, {
            id: generatedBookingId,
            type: 'booking',
            migrated: true,
            newBookingRef: generatedBookingId,
            updatedAt: new Date().toISOString()
          });
        });

        const mockSuccessUrl = `${origin}/experiences/${calculatedSlug}?bookingId=${generatedBookingId}&status=success`;
        return NextResponse.json({ url: mockSuccessUrl });
      }

      // Create Stripe session for Offer
      const successUrl = `${origin}/experiences/${calculatedSlug}?bookingId={CHECKOUT_SESSION_ID}&status=success`;
      const cancelUrl = `${origin}/experiences/${calculatedSlug}?status=cancelled`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'us_bank_account'],
        payment_method_options: {
          us_bank_account: {
            financial_connections: { permissions: ['payment_method'] }
          }
        },
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${calculatedTitle} - Charter Booking`,
                description: `Plan: ${paymentPlan === 'deposit' ? 'Deposit Plan' : 'Pay in Full'}. Date: ${offerData.schedulingSnapshot.date} at ${offerData.schedulingSnapshot.startTime}.`,
              },
              unit_amount: Math.round(finalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: guestEmail,
        metadata: {
          offerId,
          paymentPlan,
          experienceSlug: calculatedSlug,
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
    }

    // --- LEGACY BACKWARDS-COMPATIBLE PATHWAY ---
    if (!bookingId || !amount || !email || !experienceSlug || !experienceTitle) {
      return NextResponse.json(
        { error: 'Missing required parameters.' },
        { status: 400 }
      );
    }

    const bookingRef = adminDb.collection('pages').doc(`booking-${bookingId}`);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      return NextResponse.json(
        { error: 'Booking record not found.' },
        { status: 404 }
      );
    }
    const bookingData = bookingSnap.data() || {};

    let finalAmount = amount;

    const settingsSnap = await adminDb.collection('settings').doc('global').get();
    const settings = settingsSnap.exists ? settingsSnap.data() || {} : {};
    const financial = settings.financial || {};
    const isConvenienceFeeEnabled = financial.enableConvenienceFee ?? true;
    const convenienceFeeRate = financial.convenienceFeePercentage ?? 3.5;
    const depositPercentage = financial.depositPercentage ?? 20;

    if (!isBalancePayment) {
      const subtotal = bookingData.subtotal || 0;
      const captainFee = bookingData.captainFee || 0;
      
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
      
      const baseAmountDueToday = bookingData.paymentPlan === 'deposit'
        ? (grandTotalWithoutInsurance * (depositPercentage / 100)) + insuranceCost
        : grandTotalWithoutInsurance + insuranceCost;
        
      const baseAmountDueLater = bookingData.paymentPlan === 'deposit'
        ? grandTotalWithoutInsurance * ((100 - depositPercentage) / 100)
        : 0;

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

      await bookingRef.set({
        discountAmount: serverDiscountAmount,
        salesTax: Math.round(salesTax * 100) / 100,
        grandTotal: calculatedGrandTotal,
        amountDueLater: finalAmountDueLater,
        convenienceFeeAmount: calculatedConvenienceFeeTotal,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[Server Calc] Booking ${bookingId} verified. Today: $${finalAmountDueToday}, Later: $${finalAmountDueLater}`);
    } else {
      finalAmount = bookingData.amountDueLater || 0;
      console.log(`[Server Calc] Booking ${bookingId} Balance payment verified. Amount: $${finalAmount}`);
    }

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_dummy') {
      console.warn('Missing STRIPE_SECRET_KEY in development mode. Simulating a mock Stripe redirect.');
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
          
          console.log(`✓ [Mock Checkout] Saved booking ${bookingId}`);
        }
      } catch (dbErr) {
        console.error('[Mock Checkout] Failed to update local booking data:', dbErr);
      }

      const mockUrl = isBalancePayment
        ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=success`
        : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success`;
      return NextResponse.json({ url: mockUrl });
    }

    const successUrl = isBalancePayment
      ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=success&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = isBalancePayment
      ? `${origin}/guest/portal?id=${bookingId}&token=${bookingToken || ''}&status=cancelled`
      : `${origin}/experiences/${experienceSlug}?bookingId=${bookingId}&status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] }
        }
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: isBalancePayment ? `Remaining Balance - Charter Booking ${bookingId}` : `${experienceTitle} - Charter Booking`,
              description: isBalancePayment 
                ? `Outstanding Balance Payment for Charter booking ID: ${bookingId}.`
                : `Booking ID: ${bookingId} for Voyage on ${date} at ${startTime}. Vessel: ${vesselTitle}.`,
            },
            unit_amount: Math.round(finalAmount * 100),
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
