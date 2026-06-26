import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function checkIsAdmin(request: NextRequest): Promise<boolean> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (process.env.NODE_ENV === 'development' && !serviceAccountJson) {
    console.warn('Development mode: Firebase Admin credentials not found. Bypassing checkIsAdmin verification.');
    return true;
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.admin === true;
  } catch (error) {
    console.error('Error verifying admin token:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkIsAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adId, status } = await request.json();

    if (!adId || !status) {
      return NextResponse.json({ error: 'Missing adId or status' }, { status: 400 });
    }

    if (status !== 'ACTIVE' && status !== 'PAUSED') {
      return NextResponse.json({ error: 'Invalid status. Must be ACTIVE or PAUSED.' }, { status: 400 });
    }

    if (adId.startsWith('mock_')) {
      console.log(`\n--- [Meta Ads API Simulation] Ad Status Update ---`);
      console.log(`Ad ID:       ${adId}`);
      console.log(`New Status:  ${status}`);
      console.log(`--------------------------------------------------\n`);
      return NextResponse.json({ success: true, simulated: true, newStatus: status });
    }

    // Load credentials from Firestore settings
    let adsSettings: any = {};
    try {
      const docSnap = await adminDb.collection('settings').doc('social_ads').get();
      if (docSnap.exists) {
        adsSettings = docSnap.data() || {};
      }
    } catch (dbError) {
      console.error('Error loading social ads settings from DB:', dbError);
    }

    const metaDeveloperToken = adsSettings.metaDeveloperToken || process.env.META_DEVELOPER_TOKEN || '';

    if (!metaDeveloperToken || metaDeveloperToken === 'mock_token') {
      return NextResponse.json({ error: 'Missing Meta Developer Token for status update' }, { status: 400 });
    }

    const url = `https://graph.facebook.com/v20.0/${adId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: status,
        access_token: metaDeveloperToken
      })
    });

    const resJson = await response.json();
    if (!response.ok) {
      console.error('[Meta Ads API] Status update error:', JSON.stringify(resJson));
      return NextResponse.json({ 
        error: resJson.error?.message || 'Meta Ads API responded with an error.' 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, newStatus: status });

  } catch (error: any) {
    console.error('Error in meta status POST route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
