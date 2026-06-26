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

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await checkIsAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const metaAdAccountId = adsSettings.metaAdAccountId || process.env.META_AD_ACCOUNT_ID || '';
    const metaDeveloperToken = adsSettings.metaDeveloperToken || process.env.META_DEVELOPER_TOKEN || '';

    const isSimulated = !metaAdAccountId || !metaDeveloperToken || 
                        metaAdAccountId === 'mock_id' || metaAdAccountId === 'mock_account_id' || 
                        metaDeveloperToken === 'mock_token' || !metaDeveloperToken.startsWith('EAA');

    if (isSimulated) {
      return NextResponse.json([
        {
          id: 'mock_camp_1',
          name: 'M/Y Whiskey - Evergreen Yacht Charters',
          status: 'ACTIVE',
          adsets: [
            {
              id: 'mock_adset_1a',
              name: 'US Luxury Travelers - Broad (25-65+)',
              status: 'ACTIVE'
            },
            {
              id: 'mock_adset_1b',
              name: 'Florida Local High Net Worth',
              status: 'PAUSED'
            }
          ]
        },
        {
          id: 'mock_camp_2',
          name: 'M/Y Whiskey - Fall & Winter Seasons',
          status: 'PAUSED',
          adsets: [
            {
              id: 'mock_adset_2a',
              name: 'Corporate Retainers & Offsites',
              status: 'PAUSED'
            }
          ]
        }
      ]);
    }

    let normalizedAdAccountId = metaAdAccountId.trim();
    if (!normalizedAdAccountId.startsWith('act_')) {
      normalizedAdAccountId = 'act_' + normalizedAdAccountId;
    }

    // 1. Fetch campaigns
    const campaignsUrl = `https://graph.facebook.com/v20.0/${normalizedAdAccountId}/campaigns?fields=name,status,objective&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&access_token=${metaDeveloperToken}&limit=100`;
    const campaignsRes = await fetch(campaignsUrl);
    const campaignsData = await campaignsRes.json();

    if (!campaignsRes.ok) {
      console.error('[Meta API] Campaigns fetch error:', JSON.stringify(campaignsData));
      return NextResponse.json({ error: campaignsData.error?.message || 'Failed to fetch campaigns from Meta' }, { status: campaignsRes.status });
    }

    const campaignsList = campaignsData.data || [];

    // 2. Fetch adsets
    const adsetsUrl = `https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adsets?fields=name,campaign_id,status&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&access_token=${metaDeveloperToken}&limit=250`;
    const adsetsRes = await fetch(adsetsUrl);
    const adsetsData = await adsetsRes.json();

    if (!adsetsRes.ok) {
      console.error('[Meta API] Adsets fetch error:', JSON.stringify(adsetsData));
      return NextResponse.json({ error: adsetsData.error?.message || 'Failed to fetch adsets from Meta' }, { status: adsetsRes.status });
    }

    const adsetsList = adsetsData.data || [];

    // 3. Nest adsets inside campaigns
    const campaigns = campaignsList.map((camp: any) => {
      const campAdsets = adsetsList
        .filter((adset: any) => adset.campaign_id === camp.id)
        .map((adset: any) => ({
          id: adset.id,
          name: adset.name,
          status: adset.status
        }));

      return {
        id: camp.id,
        name: camp.name,
        status: camp.status,
        adsets: campAdsets
      };
    });

    return NextResponse.json(campaigns);

  } catch (error: any) {
    console.error('Error in meta campaigns GET route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
