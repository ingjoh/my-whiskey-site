import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

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
    console.error('Error verifying auth in share API:', error);
    return false;
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
    const { emailBody, smsText, subject, recipientEmail, recipientPhone, token } = body;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Missing recipientEmail' }, { status: 400 });
    }

    // Fetch booking details
    let bookingDetails: any = null;
    const bookingSnap = await adminDb.collection('bookings').doc(bookingId).get();
    if (bookingSnap.exists) {
      bookingDetails = bookingSnap.data();
    } else {
      const legacySnap = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
      if (legacySnap.exists) {
        bookingDetails = legacySnap.data();
      }
    }

    // Fetch trip gallery details (to get cover image if needed)
    let galleryDetails: any = null;
    const gallerySnap = await adminDb.collection('trip_galleries').doc(bookingId).get();
    if (gallerySnap.exists) {
      galleryDetails = gallerySnap.data();
    }

    // Determine the public link
    const resolvedToken = token || bookingDetails?.token || bookingId;
    const shareLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.motoryachtwhiskey.com'}/trip/${resolvedToken}`;

    // Get vessel and experience titles
    const vesselTitle = bookingDetails?.vesselTitle || 'M/Y Whiskey';
    const experienceTitle = bookingDetails?.experienceTitle || 'Private Yacht Excursion';
    const voyageDate = bookingDetails?.date || 'Recent Voyage';
    const captainTitle = bookingDetails?.captainTitle || 'Captain & Crew';

    // Get hero image URL
    let heroImageUrl = galleryDetails?.coverImageUrl || '';
    if (!heroImageUrl && galleryDetails?.media && galleryDetails.media.length > 0) {
      const firstImg = galleryDetails.media.find((m: any) => m.type === 'image');
      if (firstImg) heroImageUrl = firstImg.url;
    }

    // Format Email Body text (convert newlines to HTML breaks)
    const formattedEmailBody = (emailBody || '')
      .trim()
      .replace(/\r?\n/g, '<br />');

    // Build the Branded HTML email template
    const htmlEmailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0a0a0a;
      color: #ededed;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper {
      width: 100%;
      background-color: #0a0a0a;
      padding: 20px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #171717;
      border-top: 4px solid #d97706;
      border-radius: 8px;
      overflow: hidden;
      border-left: 1px solid #27272a;
      border-right: 1px solid #27272a;
      border-bottom: 1px solid #27272a;
    }
    .header {
      padding: 30px 20px;
      text-align: center;
      border-bottom: 1px solid #27272a;
    }
    .header h1 {
      margin: 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 24px;
      letter-spacing: 0.15em;
      color: #d97706;
      text-transform: uppercase;
      font-weight: 400;
    }
    .content {
      padding: 30px 20px;
    }
    .message-body {
      font-size: 15px;
      line-height: 1.6;
      color: #ededed;
      margin-bottom: 25px;
    }
    .details-card {
      background-color: #121416;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 25px;
    }
    .details-card h3 {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #d97706;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      color: #a1a1aa;
    }
    .detail-value {
      font-weight: 600;
      color: #ffffff;
    }
    .hero-image {
      width: 100%;
      height: auto;
      max-height: 320px;
      object-fit: cover;
      border-radius: 6px;
      margin-bottom: 25px;
      border: 1px solid #27272a;
    }
    .cta-container {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #d97706;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      font-weight: bold;
      border-radius: 6px;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.2);
    }
    .testimonial-box {
      border-top: 1px dashed #27272a;
      padding-top: 20px;
      margin-top: 25px;
      font-size: 14px;
      color: #a1a1aa;
      line-height: 1.5;
      text-align: center;
    }
    .footer {
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #a1a1aa;
      border-top: 1px solid #27272a;
      background-color: #121416;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>M/Y WHISKEY</h1>
      </div>
      <div class="content">
        <div class="message-body">
          ${formattedEmailBody}
        </div>
        
        ${heroImageUrl ? `<img class="hero-image" src="${heroImageUrl}" alt="Voyage Memories" />` : ''}

        <div class="details-card">
          <h3>Voyage Details</h3>
          <div class="detail-row">
            <span class="detail-label">Vessel Selected:</span>
            <span class="detail-value">${vesselTitle}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Experience:</span>
            <span class="detail-value">${experienceTitle}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Voyage Date:</span>
            <span class="detail-value">${voyageDate}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Captain Hired:</span>
            <span class="detail-value">${captainTitle}</span>
          </div>
        </div>

        <div class="cta-container">
          <a class="cta-button" href="${shareLink}" target="_blank">View Voyage Memories</a>
        </div>

        <div class="testimonial-box">
          We would be honored to hear about your excursion. Please share your review or leave a guest testimonial on your voyage gallery portal page.
        </div>
      </div>
      <div class="footer">
        © 2026 M/Y Whiskey. Luxury Yacht Charters & Excursions.
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // 1. Dispatch Email using Resend
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: subject || `Your Voyage Memories Aboard ${vesselTitle}`,
      html: htmlEmailTemplate
    });

    // 2. Dispatch SMS using Telnyx if phone is provided
    let smsResult = { success: true, message: 'SMS skipped (no phone number provided)' };
    if (recipientPhone && smsText) {
      smsResult = await sendSms({
        to: recipientPhone,
        text: smsText
      }) as any;
    }

    return NextResponse.json({
      success: emailResult.success && smsResult.success,
      emailSent: emailResult.success,
      smsSent: recipientPhone ? smsResult.success : false,
      emailId: emailResult.success ? emailResult.id : null,
      smsId: (recipientPhone && smsResult.success) ? (smsResult as any).id : null,
      error: !emailResult.success ? emailResult.error : (!smsResult.success ? (smsResult as any).error : null)
    });

  } catch (error: any) {
    console.error('Error in share API handler:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
