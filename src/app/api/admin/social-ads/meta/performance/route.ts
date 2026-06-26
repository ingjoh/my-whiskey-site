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
          id: 'mock_ad_1',
          name: 'Stunning Destin Sunset Cruise',
          campaignName: 'M/Y Whiskey - Evergreen Yacht Charters',
          adsetName: 'US Luxury Travelers - Broad (25-65+)',
          impressions: 14205,
          clicks: 612,
          spend: 452.80,
          ctr: 4.31,
          cpc: 0.74,
          status: 'ACTIVE'
        },
        {
          id: 'mock_ad_2',
          name: 'Luxury Corporate Retreat Package',
          campaignName: 'M/Y Whiskey - Evergreen Yacht Charters',
          adsetName: 'US Luxury Travelers - Broad (25-65+)',
          impressions: 8450,
          clicks: 310,
          spend: 320.15,
          ctr: 3.67,
          cpc: 1.03,
          status: 'ACTIVE'
        },
        {
          id: 'mock_ad_3',
          name: 'Weekend Yacht Getaways',
          campaignName: 'M/Y Whiskey - Evergreen Yacht Charters',
          adsetName: 'US Luxury Travelers - Broad (25-65+)',
          impressions: 3120,
          clicks: 88,
          spend: 98.40,
          ctr: 2.82,
          cpc: 1.12,
          status: 'PAUSED'
        },
        {
          id: 'mock_ad_4',
          name: 'Old Summer Promotion (Archived)',
          campaignName: 'M/Y Whiskey - Evergreen Yacht Charters',
          adsetName: 'US Luxury Travelers - Broad (25-65+)',
          impressions: 48200,
          clicks: 1940,
          spend: 1250.00,
          ctr: 4.02,
          cpc: 0.64,
          status: 'ARCHIVED'
        }
      ]);
    }

    let normalizedAdAccountId = metaAdAccountId.trim();
    if (!normalizedAdAccountId.startsWith('act_')) {
      normalizedAdAccountId = 'act_' + normalizedAdAccountId;
    }

    // 1. Fetch ads
    const adsUrl = `https://graph.facebook.com/v20.0/${normalizedAdAccountId}/ads?fields=name,status,campaign{name},adset{name}&access_token=${metaDeveloperToken}&limit=250`;
    const adsRes = await fetch(adsUrl);
    const adsData = await adsRes.json();

    if (!adsRes.ok) {
      console.error('[Meta API] Ads fetch error:', JSON.stringify(adsData));
      return NextResponse.json({ error: adsData.error?.message || 'Failed to fetch ads from Meta' }, { status: adsRes.status });
    }

    const adsList = adsData.data || [];

    // 2. Fetch insights
    const insightsUrl = `https://graph.facebook.com/v20.0/${normalizedAdAccountId}/insights?level=ad&fields=ad_id,impressions,clicks,spend,ctr,cpc&date_preset=this_month&access_token=${metaDeveloperToken}&limit=250`;
    const insightsRes = await fetch(insightsUrl);
    const insightsData = await insightsRes.json();

    if (!insightsRes.ok) {
      // Log error but don't fail, we'll map with empty insights
      console.warn('[Meta API] Insights fetch failed:', JSON.stringify(insightsData));
    }

    const insightsList = insightsData.data || [];
    const insightsMap = new Map<string, any>();
    insightsList.forEach((insight: any) => {
      insightsMap.set(insight.ad_id, insight);
    });

    // 3. Merge metrics with ads list
    const performanceData = adsList.map((ad: any) => {
      const insight = insightsMap.get(ad.id) || {};
      return {
        id: ad.id,
        name: ad.name,
        campaignName: ad.campaign?.name || 'N/A',
        adsetName: ad.adset?.name || 'N/A',
        impressions: parseInt(insight.impressions || '0', 10),
        clicks: parseInt(insight.clicks || '0', 10),
        spend: parseFloat(insight.spend || '0'),
        ctr: parseFloat(insight.ctr || '0'),
        cpc: parseFloat(insight.cpc || '0'),
        status: ad.status
      };
    });

    return NextResponse.json(performanceData);

  } catch (error: any) {
    console.error('Error in meta performance GET route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
