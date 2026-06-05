import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';
import * as React from 'react';
import TripReminder from '@/emails/TripReminderEmail';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization header in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting pre-trip reminders processing...');
    
    // Query Firestore for confirmed or waiver-pending bookings
    const bookingsSnap = await adminDb.collection('pages')
      .where('type', '==', 'booking')
      .where('status', 'in', ['confirmed', 'pending waiver'])
      .get();

    const now = new Date();
    // Normalize date to midnight to compare days accurately
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let processedCount = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://motoryachtwhiskey.com';

    for (const doc of bookingsSnap.docs) {
      const booking = doc.data();
      const bookingId = booking.id;
      const tripDateStr = booking.date; // Format: 'YYYY-MM-DD'
      
      if (!tripDateStr) continue;

      const tripDate = new Date(tripDateStr + 'T00:00:00');
      const tripMidnight = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate());
      
      // Calculate days difference (ignoring time)
      const diffTime = tripMidnight.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const portalUrl = `${siteUrl}/guest/portal?id=${bookingId}&token=${booking.token || ''}`;

      // 1. Send 7-day reminder
      if (diffDays === 7) {
        console.log(`[Cron] Sending 7-day reminder to booking #${bookingId} (${booking.guestEmail})`);
        
        await sendEmail({
          to: booking.guestEmail,
          subject: `7-Day Pre-Voyage Checklist - Booking #${bookingId}`,
          react: React.createElement(TripReminder, {
            bookingId,
            guestName: booking.guestName,
            experienceTitle: booking.experienceTitle,
            date: booking.date,
            startTime: booking.startTime,
            captainTitle: booking.captainTitle || 'Independent Bareboat Skipper',
            startLocationName: booking.startLocation === 'destin-harbor' ? 'Destin Harbor Slip 15' : 'Fort Walton Yacht Basin',
            portalUrl
          })
        });

        await sendSms({
          to: booking.guestPhone,
          text: `M/Y Whiskey: 7 days until your voyage! Please review your boarding checklist and waivers: ${portalUrl}`
        });

        processedCount++;
      }

      // 2. Send 24-hour reminder
      if (diffDays === 1) {
        console.log(`[Cron] Sending 24-hour reminder to booking #${bookingId} (${booking.guestEmail})`);

        await sendEmail({
          to: booking.guestEmail,
          subject: `Important: 24-Hour Boarding Instructions - Booking #${bookingId}`,
          react: React.createElement(TripReminder, {
            bookingId,
            guestName: booking.guestName,
            experienceTitle: booking.experienceTitle,
            date: booking.date,
            startTime: booking.startTime,
            captainTitle: booking.captainTitle || 'Independent Bareboat Skipper',
            startLocationName: booking.startLocation === 'destin-harbor' ? 'Destin Harbor Slip 15' : 'Fort Walton Yacht Basin',
            portalUrl
          })
        });

        await sendSms({
          to: booking.guestPhone,
          text: `M/Y Whiskey departure tomorrow at ${booking.startTime}! Meet at ${booking.startLocation === 'destin-harbor' ? 'Destin Harbor Slip 15' : 'Fort Walton Yacht Basin'}. Check details: ${portalUrl}`
        });

        processedCount++;
      }
    }

    console.log(`[Cron] Reminders execution complete. Processed ${processedCount} bookings.`);
    return NextResponse.json({ success: true, processedCount });
  } catch (error: any) {
    console.error('[Cron Error] Failure executing reminders:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
