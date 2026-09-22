import { adminDb } from './firebase-admin';
import { sendEmail } from './email';
import * as React from 'react';
import BookingConfirmationReceiptEmail from '@/components/emails/BookingConfirmationReceiptEmail';

export interface BookingReceiptData {
  bookingId: string;
  formattedBookingId: string;
  experienceTitle: string;
  experienceDescription?: string;
  date: string;
  formattedDate: string;
  startTime: string;
  endTime?: string;
  duration?: string;
  status: string;
  paymentStatus: 'fully_paid' | 'deposit_paid' | 'pending';
  portalUrl: string;
  token?: string;
  createdAt: string;

  guest: {
    name: string;
    email: string;
    phone: string;
    guestCount: number;
    specialConsiderations?: string;
  };

  vessel: {
    title: string;
    model: string;
    length: string;
    capacity: string;
    imageUrl?: string;
    features: string[];
    description: string;
    tagline?: string;
  };

  location: {
    title: string;
    marina: string;
    address: string;
    slip?: string;
    arrivalInstructions: string;
    parkingInstructions: string;
    mapUrl: string;
    imageUrl?: string;
    tagline?: string;
  };

  captain: {
    name: string;
    title: string;
    credentials: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
    tagline?: string;
  };

  financials: {
    subtotal: number;
    salesTax: number;
    cancellationInsurance: boolean;
    insuranceAmount: number;
    grandTotal: number;
    amountPaidToday: number;
    amountDueLater: number;
    balanceDueDate?: string;
    paymentMethod: string;
    stripePaymentIntentId?: string;
    paidAt?: string;
  };

  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    surfaceColor?: string;
    backgroundColor?: string;
  };
}

export function formatBookingId(id: string): string {
  if (!id) return '';
  return id.startsWith('BK-') ? id : `BK-${id.replace(/^BK_/, '')}`;
}

export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return 'Date Pending';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Strips raw markdown syntax, extracts top-level header as a tagline,
 * and produces a clean, readable text snippet.
 */
function cleanMarkdownText(md?: string): { tagline?: string; text: string } {
  if (!md) return { text: '' };
  const normalized = md.replace(/\r\n/g, '\n').trim();
  const headerMatch = normalized.match(/^#{1,6}\s+([^\n]+)\n*([\s\S]*)$/);
  if (headerMatch) {
    const tagline = headerMatch[1].trim();
    const remaining = headerMatch[2]
      .replace(/^#{1,6}\s+[^\n]*\n*/gm, '') // strip inner headers
      .replace(/^[*-]\s+/gm, '') // strip bullet markers
      .replace(/\n{2,}/g, ' ')
      .trim();
    return { tagline, text: remaining || tagline };
  }
  const text = normalized
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[*-]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .trim();
  return { text };
}

/**
 * Compiles comprehensive booking, vessel, location, captain, and financial data for confirmation receipts.
 */
export async function getBookingReceiptData(bookingId: string): Promise<BookingReceiptData | null> {
  try {
    const cleanId = bookingId.replace(/^booking-/, '');
    
    // 1. Fetch booking document
    let bData: any = null;
    const pageDoc = await adminDb.collection('pages').doc(`booking-${cleanId}`).get();
    if (pageDoc.exists) {
      bData = pageDoc.data();
    } else {
      const bDoc = await adminDb.collection('bookings').doc(cleanId).get();
      if (bDoc.exists) {
        bData = bDoc.data();
      }
    }

    if (!bData) {
      console.error(`[Receipt] Booking ${cleanId} not found.`);
      return null;
    }

    // 2. Fetch Global Settings & Branding
    const settingsDoc = await adminDb.collection('settings').doc('global').get();
    const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const theme = settings.theme || {};
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.motoryachtwhiskey.com';

    // 3. Resolve Vessel Details from Asset Profile
    const vesselSlug = bData.vesselSlug || 'my-whiskey-yacht';
    let vesselTitle = bData.vesselTitle || 'M/Y Whiskey';
    let vesselModel = "40' Ocean Yachts Super Sport";
    let vesselLength = "40 Ft";
    let vesselCapacity = "Up to 12 Guests";
    let vesselImage = "https://firebasestorage.googleapis.com/v0/b/my-whiskey-prod.firebasestorage.app/o/library%2F1781805444338_IMG_20260618_124752_cropped.webp?alt=media&token=913aafff-e6ad-485f-b051-60072d43523f";
    let vesselFeatures = [
      "Climate-Controlled Cabin (AC)",
      "Panoramic Flybridge Observation Deck",
      "Private Restroom (Head) & Hot Shower",
      "Full Galley & Refrigeration",
      "Bluetooth Surround Audio",
      "Swim Platform & Boarding Ladder"
    ];
    let vesselTagline = "Unparalleled Luxury on the Gulf Coast";
    let vesselDescription = "Custom-built luxury flybridge yacht designed for comfort, entertainment, and smooth cruising with premium leather salon seating and 360-degree flybridge views.";

    try {
      const assetDoc = await adminDb.collection('pages').doc(`content-item-${vesselSlug}`).get();
      if (assetDoc.exists) {
        const aData = assetDoc.data() || {};
        vesselTitle = aData.title || vesselTitle;
        if (aData.heroImage) vesselImage = aData.heroImage;
        else if (aData.imageUrl) vesselImage = aData.imageUrl;

        if (aData.make && aData.model) {
          vesselModel = `${aData.make} ${aData.model}`;
        } else if (aData.model) {
          vesselModel = aData.model;
        }

        if (aData.specifications?.Length) {
          vesselLength = aData.specifications.Length;
        }

        if (aData.description) {
          const parsed = cleanMarkdownText(aData.description);
          if (parsed.tagline) vesselTagline = parsed.tagline;
          if (parsed.text) vesselDescription = parsed.text;
        } else if (aData.shortDescription) {
          vesselDescription = aData.shortDescription;
        }
      }
    } catch (vesselErr) {
      console.warn('[Receipt] Could not load specific vessel doc, using luxury defaults:', vesselErr);
    }

    // 4. Resolve Start Location Details from Location Profile
    const startLocationKey = (bData.startLocation || 'destin-harbor').toLowerCase();
    let locationTitle = 'Destin Harbor Slip 15';
    let locationMarina = 'Destin Harbor Boardwalk';
    let locationAddress = '102 Harbor Blvd, Slip 15, Destin, FL 32541';
    let locationSlip = 'Slip 15';
    let arrivalInstructions = 'Please arrive 15 minutes before your scheduled boarding time. Your captain will greet you on the dock.';
    let parkingInstructions = 'Public parking is available at the HarborWalk Village parking complex or city lots along Harbor Blvd.';
    let mapUrl = 'https://maps.google.com/?q=102+Harbor+Blvd+Destin+FL+32541';
    let locationImage = 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779490705357_IMG_4093__1_.webp?alt=media&token=f538dd74-1810-4585-8e81-f0f558f83d34';
    let locationTagline = '';

    if (startLocationKey.includes('baytowne') || startLocationKey.includes('sandestin')) {
      locationTitle = 'Baytowne Marina';
      locationMarina = 'Sandestin Golf and Beach Resort';
      locationAddress = '9300 Emerald Coast Pkwy, Miramar Beach, FL 32550';
      locationSlip = 'Marina Dock G';
      arrivalInstructions = 'Please proceed through the Sandestin South security gate. Advise security you are boarding M/Y Whiskey at Baytowne Marina. Arrive 15 minutes prior to departure.';
      parkingInstructions = 'Complimentary visitor marina parking is located adjacent to the marina dock house.';
      mapUrl = 'https://maps.google.com/?q=Baytowne+Marina+Sandestin+FL';
      locationImage = 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779910268613_Marina-thumbs-up.webp?alt=media&token=eb68caa0-bad1-42f7-8e84-b90f3ce47f6f';
      locationTagline = 'The elegant gateway dock at Sandestin Golf and Beach Resort.';
    }

    try {
      const locDoc = await adminDb.collection('pages').doc(`content-item-${bData.startLocation}`).get();
      if (locDoc.exists) {
        const lData = locDoc.data() || {};
        locationTitle = lData.title || locationTitle;
        if (lData.heroImage) locationImage = lData.heroImage;
        else if (lData.imageUrl) locationImage = lData.imageUrl;
        if (lData.address && !locationAddress) locationAddress = lData.address;
        if (lData.shortDescription) locationTagline = lData.shortDescription;
      }
    } catch (locErr) {
      console.warn('[Receipt] Could not load specific location doc, using verified defaults:', locErr);
    }

    // 5. Resolve Captain Details from Staff Profile
    let captainName = bData.captainTitle || 'Captain Ingemar Johnsson';
    let captainTitle = 'USCG Licensed Master Captain';
    let captainCredentials = 'USCG 100-Ton Master • Bareboat Charter Specialist • CPR/First Aid Certified';
    let captainAvatar = 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779485083651_Ingemar_Johnsson_2020.webp?alt=media&token=612c094b-245b-4d2e-8538-a13bd6c35be5';
    let captainBio = 'Extensive experience navigating Choctawhatchee Bay, Destin Pass, and the Gulf of Mexico, dedicated to an unmatched luxury experience.';
    let captainPhone = bData.captainPhone || '(850) 360-3590';

    const captainKey = bData.captainId || (bData.captainTitle ? bData.captainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '');
    if (captainKey) {
      try {
        const staffDoc = await adminDb.collection('pages').doc(`content-item-${captainKey}`).get();
        if (staffDoc.exists) {
          const sData = staffDoc.data() || {};
          captainName = sData.title || captainName;
          if (sData.heroImage) captainAvatar = sData.heroImage;
          else if (sData.avatarUrl) captainAvatar = sData.avatarUrl;
          if (sData.phone) captainPhone = sData.phone;
          if (sData.role) captainTitle = `USCG Licensed ${sData.role}`;
          if (sData.shortDescription) {
            captainBio = sData.shortDescription;
          } else if (sData.description) {
            const parsed = cleanMarkdownText(sData.description);
            captainBio = parsed.text;
          }
        } else {
          const resDoc = await adminDb.collection('resources').doc(bData.captainId).get();
          if (resDoc.exists) {
            const rData = resDoc.data() || {};
            captainName = rData.name || captainName;
            if (rData.avatarUrl) captainAvatar = rData.avatarUrl;
            if (rData.photoUrl) captainAvatar = rData.photoUrl;
          }
        }
      } catch (capErr) {
        console.warn('[Receipt] Could not load specific captain doc, using verified defaults:', capErr);
      }
    }

    // 6. Compute Financials
    const subtotal = Number(bData.subtotal || 0);
    const salesTax = Number(bData.salesTax || 0);
    const grandTotal = Number(bData.grandTotal || (subtotal + salesTax));
    const rawPaidToday = Number(bData.amountPaidToday || 0);
    const amountDueLater = Number(bData.amountDueLater || 0);
    const cancellationInsurance = !!bData.cancellationInsurance;
    const insuranceAmount = cancellationInsurance ? (bData.insuranceAmount || 150) : 0;

    let amountPaidToday = rawPaidToday;
    if (amountPaidToday === 0 && (bData.status === 'confirmed' || bData.status === 'pending waiver')) {
      amountPaidToday = grandTotal - amountDueLater;
    }

    let paymentStatus: 'fully_paid' | 'deposit_paid' | 'pending' = 'fully_paid';
    if (amountDueLater > 0) {
      paymentStatus = 'deposit_paid';
    } else if (amountPaidToday === 0) {
      paymentStatus = 'pending';
    }

    let balanceDueDate: string | undefined = undefined;
    if (bData.date && amountDueLater > 0) {
      try {
        const tripDate = new Date(bData.date + 'T00:00:00');
        tripDate.setDate(tripDate.getDate() - 7);
        balanceDueDate = tripDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        balanceDueDate = undefined;
      }
    }

    let paymentMethod = 'Stripe Credit Card';
    if (bData.paymentMethod === 'eft' || bData.stripePaymentMethodType === 'us_bank_account') {
      paymentMethod = 'Bank Account / ACH Transfer';
    }

    const portalUrl = `${siteUrl}/guest/portal?id=${cleanId}&token=${bData.token || ''}`;

    return {
      bookingId: cleanId,
      formattedBookingId: formatBookingId(cleanId),
      experienceTitle: bData.experienceTitle || 'Private Coastal Adventure',
      experienceDescription: bData.experienceDescription,
      date: bData.date || '',
      formattedDate: formatFriendlyDate(bData.date),
      startTime: bData.startTime || '09:30 AM',
      endTime: bData.endTime,
      duration: bData.guestDurationMinutes ? `${Math.round(bData.guestDurationMinutes / 60)} Hours` : '4 Hours',
      status: bData.status || 'confirmed',
      paymentStatus,
      portalUrl,
      token: bData.token || '',
      createdAt: bData.createdAt || new Date().toISOString(),

      guest: {
        name: bData.guestName || 'Valued Guest',
        email: bData.guestEmail || '',
        phone: bData.guestPhone || '',
        guestCount: Number(bData.guestCount) || 1,
        specialConsiderations: bData.specialConsiderations
      },

      vessel: {
        title: vesselTitle,
        model: vesselModel,
        length: vesselLength,
        capacity: vesselCapacity,
        imageUrl: vesselImage,
        features: vesselFeatures,
        tagline: vesselTagline,
        description: vesselDescription
      },

      location: {
        title: locationTitle,
        marina: locationMarina,
        address: locationAddress,
        slip: locationSlip,
        imageUrl: locationImage,
        tagline: locationTagline,
        arrivalInstructions,
        parkingInstructions,
        mapUrl
      },

      captain: {
        name: captainName,
        title: captainTitle,
        credentials: captainCredentials,
        phone: bData.captainPhone || '(850) 360-3590',
        avatarUrl: captainAvatar,
        bio: captainBio
      },

      financials: {
        subtotal,
        salesTax,
        cancellationInsurance,
        insuranceAmount,
        grandTotal,
        amountPaidToday,
        amountDueLater,
        balanceDueDate,
        paymentMethod,
        stripePaymentIntentId: bData.stripePaymentIntentId || '',
        paidAt: bData.updatedAt || new Date().toISOString()
      },

      branding: {
        logoUrl: theme.logoUrl || "https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/settings%2F1778774194015_MY_Whiskey_Rectangular_Logo.jpg?alt=media&token=2c019952-c295-4381-afe5-cd63de4570ee",
        primaryColor: theme.primaryColor || '#B9783B',
        surfaceColor: theme.surfaceColor || '#1E2124',
        backgroundColor: theme.backgroundColor || '#121416'
      }
    };
  } catch (error) {
    console.error(`[Receipt] Failed compiling receipt for ${bookingId}:`, error);
    return null;
  }
}

/**
 * Dispatches the luxury booking confirmation and payment receipt email.
 */
export async function sendBookingConfirmationReceiptEmail(
  bookingId: string,
  options?: { customRecipient?: string }
): Promise<{ success: boolean; id?: string; error?: any }> {
  try {
    const data = await getBookingReceiptData(bookingId);
    if (!data) {
      return { success: false, error: 'Booking not found or failed to compile receipt data.' };
    }

    const recipient = options?.customRecipient || data.guest.email;
    if (!recipient) {
      return { success: false, error: 'No recipient email available for booking.' };
    }

    const subject = `Voyage Confirmed & Payment Receipt: ${data.experienceTitle} (${data.formattedBookingId})`;

    const emailComponent = React.createElement(BookingConfirmationReceiptEmail, { data });

    const res = await sendEmail({
      to: recipient,
      subject,
      react: emailComponent
    });

    if (res.success) {
      // Record confirmation timestamp in the booking document
      const cleanId = bookingId.replace(/^booking-/, '');
      const stamp = {
        receiptSentAt: new Date().toISOString(),
        receiptSentTo: recipient,
        receiptLastStatus: 'sent'
      };
      await adminDb.collection('pages').doc(`booking-${cleanId}`).set(stamp, { merge: true });
      await adminDb.collection('bookings').doc(cleanId).set(stamp, { merge: true });
      console.log(`[Receipt] Confirmation receipt successfully dispatched to ${recipient} for ${data.formattedBookingId}`);
      return { success: true, id: res.id };
    } else {
      console.error(`[Receipt] Dispatch error to ${recipient}:`, res.error);
      return { success: false, error: res.error };
    }
  } catch (err: any) {
    console.error(`[Receipt] Exception sending confirmation receipt:`, err);
    return { success: false, error: err.message || err };
  }
}
