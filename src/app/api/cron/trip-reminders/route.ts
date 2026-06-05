import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendScheduledNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  // Verify Vercel Cron authorization header in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Checking scheduled notification queue...');
    const now = new Date().toISOString();
    
    // Query pending notifications scheduled for now or earlier
    const pendingSnap = await adminDb.collection('scheduled_notifications')
      .where('status', '==', 'pending')
      .where('scheduledTime', '<=', now)
      .get();

    console.log(`[Cron] Found ${pendingSnap.size} pending alerts to process.`);
    
    let successCount = 0;
    for (const doc of pendingSnap.docs) {
      const notificationId = doc.id;
      const success = await sendScheduledNotification(notificationId);
      if (success) {
        successCount++;
      }
    }

    console.log(`[Cron] Queue processing finished. Sent: ${successCount}/${pendingSnap.size} messages.`);
    return NextResponse.json({ success: true, totalPending: pendingSnap.size, processed: successCount });
  } catch (error: any) {
    console.error('[Cron Queue Error] Failed to process scheduled notifications:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
