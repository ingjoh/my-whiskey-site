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

    const { conceptName, message, mediaUrls = [], publishTo } = await request.json();

    if (!message || !publishTo) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Load settings from Firestore to retrieve Facebook Credentials
    let fbPageId = '';
    let fbPageToken = '';
    
    try {
      const docSnap = await adminDb.collection('settings').doc('social_ads').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        fbPageId = data?.fbPageId || '';
        fbPageToken = data?.fbPageToken || '';
      }
    } catch (dbError) {
      console.error('Error loading social ads settings from DB:', dbError);
    }

    // Fallback to env variables if not in Firestore settings
    fbPageId = fbPageId || process.env.FB_PAGE_ID || '';
    fbPageToken = fbPageToken || process.env.FB_PAGE_TOKEN || '';

    // If both credentials are missing OR set to mock placeholders, run in simulated mode
    const isSimulated = !fbPageId || !fbPageToken || fbPageId === 'mock_id' || fbPageToken === 'mock_token' || !fbPageToken.startsWith('EAAB');

    if (isSimulated) {
      console.log('\n--- [Facebook Graph API Simulation] Publishing Page Post ---');
      console.log(`Concept:   ${conceptName || 'N/A'}`);
      console.log(`Message:   ${message}`);
      if (mediaUrls.length > 0) {
        console.log(`Media:     ${mediaUrls.join(', ')}`);
      } else {
        console.log('Media:     None (Text-only)');
      }
      console.log(`Target:    Facebook Page (${fbPageId || 'simulated_page_id'})`);
      console.log('------------------------------------------------------------\n');
      
      return NextResponse.json({ 
        success: true, 
        simulated: true, 
        postId: 'simulated_fb_post_id_' + Math.random().toString(36).substring(2, 9) 
      });
    }

    // Execute real Graph API publish
    let response: Response;
    const mediaUrl = mediaUrls[0]; // Take first bound image if exists

    if (mediaUrl) {
      // Publish image post
      const url = `https://graph.facebook.com/v20.0/${fbPageId}/photos`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: mediaUrl,
          message: message,
          access_token: fbPageToken
        })
      });
    } else {
      // Publish text-only post
      const url = `https://graph.facebook.com/v20.0/${fbPageId}/feed`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          access_token: fbPageToken
        })
      });
    }

    const resJson = await response.json();

    if (!response.ok) {
      console.error('[Facebook Graph API] Error publishing post:', JSON.stringify(resJson));
      return NextResponse.json({ 
        error: resJson.error?.message || 'Facebook API responded with an error.' 
      }, { status: response.status });
    }

    console.log(`[Facebook Graph API] Post successfully published. ID: ${resJson.id || resJson.post_id}`);
    return NextResponse.json({ 
      success: true, 
      postId: resJson.id || resJson.post_id 
    });

  } catch (error: any) {
    console.error('Error in social ads publish route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
