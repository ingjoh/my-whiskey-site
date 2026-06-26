import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  // Verify Cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Checking scheduled blog posts...');
    const todayStr = new Date().toISOString().split('T')[0];
    
    let scheduledSnap;
    try {
      scheduledSnap = await adminDb.collection('blog_posts')
        .where('status', '==', 'scheduled')
        .where('publishDate', '<=', todayStr)
        .get();
    } catch (writeErr: any) {
      const isCredsErr = writeErr.message?.includes('credentials') || writeErr.message?.includes('default credentials');
      if (process.env.NODE_ENV === 'development' && isCredsErr) {
        console.warn('Firebase Admin credentials not found. Simulating cron blog publish locally.');
        return NextResponse.json({ 
          success: true, 
          publishedCount: 0,
          simulated: true
        });
      } else {
        throw writeErr;
      }
    }

    console.log(`[Cron] Found ${scheduledSnap.size} scheduled posts eligible for publication.`);
    
    let publishedCount = 0;
    const batch = adminDb.batch();
    
    scheduledSnap.forEach(docSnap => {
      const postRef = adminDb.collection('blog_posts').doc(docSnap.id);
      batch.update(postRef, {
        status: 'published',
        updatedAt: new Date().toISOString()
      });
      publishedCount++;
    });

    if (publishedCount > 0) {
      await batch.commit();
      console.log(`[Cron] Successfully published ${publishedCount} blog posts.`);
    }

    return NextResponse.json({ success: true, publishedCount });
  } catch (error: any) {
    console.error('[Cron Blog Publish Error] Failed to publish scheduled posts:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
