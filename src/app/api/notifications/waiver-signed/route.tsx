import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import * as React from 'react';
import {
  Html,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Link,
  Hr,
  Button
} from '@react-email/components';

// A simple Waiver Confirmation email layout
function WaiverSignedEmail({ guestName, bookingId, date, startTime, portalUrl }: any) {
  return (
    <Html>
      <Body style={{ backgroundColor: '#121416', color: '#F4F1EA', fontFamily: 'sans-serif', padding: '20px 0' }}>
        <Container style={{ maxWidth: '580px', margin: '0 auto', background: '#1E2124', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '35px' }}>
          <Heading style={{ fontSize: '20px', color: '#FFFFFF', borderBottom: '1px solid rgba(185, 120, 59, 0.25)', paddingBottom: '10px', fontFamily: 'Georgia, serif' }}>
            Waiver Signature Confirmed
          </Heading>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#D8C7AF' }}>
            Dear {guestName},
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#D8C7AF' }}>
            This email confirms that the digital passenger release waiver for your charter booking **#{bookingId}** has been successfully signed and logged.
          </Text>
          <Text style={{ fontSize: '14px', lineHeight: '1.6', color: '#D8C7AF' }}>
            Your voyage is scheduled for **{date}** at **{startTime}**.
          </Text>
          <Hr style={{ borderColor: 'rgba(255, 255, 255, 0.06)', margin: '20px 0' }} />
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ fontSize: '13px', color: '#D8C7AF', marginBottom: '15px' }}>
              You can view your trip checklist, weather advisories, and chat with dispatch at any time:
            </Text>
            <Button href={portalUrl} style={{ backgroundColor: '#B9783B', borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none', padding: '12px 24px', display: 'inline-block' }}>
              Open Guest Portal
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // Load booking details using admin SDK
    const docId = `booking-${bookingId}`;
    const bookingRef = adminDb.collection('pages').doc(docId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingSnap.data() || {};
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://motoryachtwhiskey.com';
    const portalUrl = `${siteUrl}/guest/portal?id=${bookingId}&token=${booking.token || ''}`;

    // Send confirmation email
    console.log(`[Waiver Notification] Sending email confirmation for booking ${bookingId}`);
    await sendEmail({
      to: booking.guestEmail,
      subject: `Waiver Signed & Confirmed - Booking #${bookingId}`,
      react: React.createElement(WaiverSignedEmail, {
        guestName: booking.guestName,
        bookingId,
        date: booking.date,
        startTime: booking.startTime,
        portalUrl
      })
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Waiver Notification API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
