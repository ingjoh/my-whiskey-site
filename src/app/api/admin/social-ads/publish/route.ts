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

    const {
      conceptName,
      message,
      mediaUrls = [],
      ratioImages = null,
      publishTo,
      dailyBudget,
      durationDays,
      targetAudience,
      headlines = [],
      descriptions = [],
      keywords = [],
      negativeKeywords = [],
      longHeadlines = [],
      campaignMode = 'new',
      existingAdSetId,
      destinationUrl
    } = await request.json();

    if (!publishTo) {
      return NextResponse.json({ error: 'Missing publishTo channel parameter' }, { status: 400 });
    }

    if (publishTo !== 'google_search' && publishTo !== 'google_pmax' && !message) {
      return NextResponse.json({ error: 'Missing required parameter: message copy' }, { status: 400 });
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

    // Map Facebook & Meta credentials
    const fbPageId = adsSettings.fbPageId || process.env.FB_PAGE_ID || '';
    const fbPageToken = adsSettings.fbPageToken || process.env.FB_PAGE_TOKEN || '';
    const metaAdAccountId = adsSettings.metaAdAccountId || process.env.META_AD_ACCOUNT_ID || '';
    const metaDeveloperToken = adsSettings.metaDeveloperToken || process.env.META_DEVELOPER_TOKEN || '';

    // Map Google Ads credentials
    const googleDeveloperToken = adsSettings.googleDeveloperToken || process.env.GOOGLE_DEVELOPER_TOKEN || '';
    const googleCustomerId = adsSettings.googleCustomerId || process.env.GOOGLE_CUSTOMER_ID || '';
    const googleClientId = adsSettings.googleClientId || process.env.GOOGLE_CLIENT_ID || '';
    const googleClientSecret = adsSettings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    const googleRefreshToken = adsSettings.googleRefreshToken || process.env.GOOGLE_REFRESH_TOKEN || '';

    // Determine simulation mode for the target channel
    let isSimulated = false;

    if (publishTo === 'facebook') {
      isSimulated = !fbPageId || !fbPageToken || fbPageId === 'mock_id' || fbPageToken === 'mock_token' || !fbPageToken.startsWith('EAA');
    } else if (publishTo === 'meta_ads') {
      isSimulated = !metaAdAccountId || !metaDeveloperToken || metaAdAccountId === 'mock_id' || metaAdAccountId === 'mock_account_id' || metaDeveloperToken === 'mock_token' || !metaDeveloperToken.startsWith('EAA');
    } else if (publishTo === 'google_search' || publishTo === 'google_pmax') {
      isSimulated = !googleDeveloperToken || !googleCustomerId || !googleClientId || !googleClientSecret || !googleRefreshToken ||
                    googleDeveloperToken.includes('mock') || googleCustomerId.includes('mock') || googleClientId.includes('mock') ||
                    googleClientSecret.includes('mock') || googleRefreshToken.includes('mock');
    }

    const timestamp = new Date().toISOString();

    if (isSimulated) {
      if (publishTo === 'facebook') {
        console.log('\n--- [Facebook Graph API Simulation] Publishing Page Post ---');
        console.log(`Concept:   ${conceptName || 'N/A'}`);
        console.log(`Message:   ${message}`);
        console.log(`Media:     ${mediaUrls.length > 0 ? mediaUrls.join(', ') : 'None (Text-only)'}`);
        if (ratioImages) {
          console.log(`Ratio Media: ${JSON.stringify(ratioImages)}`);
        }
        console.log(`Target:    Facebook Page (${fbPageId || 'simulated_page_id'})`);
        console.log('------------------------------------------------------------\n');
        
        return NextResponse.json({ 
          success: true, 
          simulated: true, 
          postId: 'simulated_fb_post_id_' + Math.random().toString(36).substring(2, 9) 
        });
      } else if (publishTo === 'meta_ads') {
        console.log('\n--- [Meta Ads API Simulation] Creating Campaign/Ad ---');
        console.log(`Concept:         ${conceptName || 'N/A'}`);
        if (campaignMode === 'consolidated') {
          console.log(`Mode:            Consolidated (Andromeda)`);
          console.log(`Existing Ad Set: ${existingAdSetId || 'simulated_ad_set_id'}`);
        } else {
          console.log(`Mode:            Dedicated Campaign & Ad Set`);
          console.log(`Campaign Name:   ${conceptName || 'Campaign'} - ${targetAudience || 'Audience'} - ${timestamp.split('T')[0]}`);
          console.log(`Daily Budget:    $${dailyBudget || 10}`);
          console.log(`Duration:        ${durationDays || 7} days`);
        }
        console.log(`Target Audience: ${targetAudience || 'General'}`);
        console.log(`Ad Creative:`);
        console.log(`  - Primary Text:  ${message}`);
        console.log(`  - Headlines:     ${headlines.join(' | ') || 'N/A'}`);
        console.log(`  - Descriptions:  ${descriptions.join(' | ') || 'N/A'}`);
        console.log(`  - Media URLs:    ${mediaUrls.join(', ') || 'None'}`);
        if (ratioImages) {
          console.log(`  - Ratio Medias:  ${JSON.stringify(ratioImages)}`);
        }
        console.log(`Ad Account:      act_${metaAdAccountId || 'simulated_account_id'}`);
        console.log('----------------------------------------------------\n');

        return NextResponse.json({
          success: true,
          simulated: true,
          campaignId: campaignMode === 'consolidated' ? 'simulated_meta_campaign_id_consolidated' : 'simulated_meta_campaign_id_' + Math.random().toString(36).substring(2, 9),
          adSetId: campaignMode === 'consolidated' ? existingAdSetId : 'simulated_meta_adset_id_' + Math.random().toString(36).substring(2, 9),
          adId: 'simulated_meta_ad_id_' + Math.random().toString(36).substring(2, 9)
        });
      } else if (publishTo === 'google_search') {
        console.log('\n--- [Google Ads API Search Simulation] Creating Campaign ---');
        console.log(`Concept:         ${conceptName || 'N/A'}`);
        console.log(`Campaign Name:   ${conceptName || 'Campaign'} - Search - ${timestamp.split('T')[0]}`);
        console.log(`Daily Budget:    $${dailyBudget || 10}`);
        console.log(`Duration:        ${durationDays || 7} days`);
        console.log(`Target Audience: ${targetAudience || 'General'}`);
        console.log(`Responsive Search Ad:`);
        console.log(`  - Headlines:     ${headlines.join(' | ') || 'N/A'}`);
        console.log(`  - Descriptions:  ${descriptions.join(' | ') || 'N/A'}`);
        console.log(`Keywords:        ${keywords.join(', ') || 'N/A'}`);
        console.log(`Negative Kws:    ${negativeKeywords.join(', ') || 'N/A'}`);
        console.log(`Customer ID:     ${googleCustomerId || 'simulated_customer_id'}`);
        console.log('------------------------------------------------------------\n');

        return NextResponse.json({
          success: true,
          simulated: true,
          campaignId: 'simulated_google_search_campaign_id_' + Math.random().toString(36).substring(2, 9)
        });
      } else if (publishTo === 'google_pmax') {
        console.log('\n--- [Google Ads API PMax Simulation] Creating Campaign ---');
        console.log(`Concept:         ${conceptName || 'N/A'}`);
        console.log(`Campaign Name:   ${conceptName || 'Campaign'} - PMax - ${timestamp.split('T')[0]}`);
        console.log(`Daily Budget:    $${dailyBudget || 10}`);
        console.log(`Duration:        ${durationDays || 7} days`);
        console.log(`Target Audience: ${targetAudience || 'General'}`);
        console.log(`PMax Asset Group:`);
        console.log(`  - Headlines:       ${headlines.join(' | ') || 'N/A'}`);
        console.log(`  - Descriptions:    ${descriptions.join(' | ') || 'N/A'}`);
        console.log(`  - Long Headlines:  ${longHeadlines.join(' | ') || 'N/A'}`);
        console.log(`  - Media URLs:      ${mediaUrls.join(', ') || 'None'}`);
        if (ratioImages) {
          console.log(`  - Ratio Medias:    ${JSON.stringify(ratioImages)}`);
        }
        console.log(`Customer ID:     ${googleCustomerId || 'simulated_customer_id'}`);
        console.log('----------------------------------------------------------\n');

        return NextResponse.json({
          success: true,
          simulated: true,
          campaignId: 'simulated_google_pmax_campaign_id_' + Math.random().toString(36).substring(2, 9)
        });
      }
    }

    // Execute Real API Publish
    if (publishTo === 'facebook') {
      let response: Response;
      const variant0Ratios = (ratioImages && typeof ratioImages === 'object')
        ? (ratioImages['0'] || ratioImages[0] || null)
        : ratioImages;
      const finalMediaUrl = variant0Ratios?.feed_4_5 || variant0Ratios?.square_1_1 || variant0Ratios?.story_9_16 || mediaUrls[0];

      // Resolve Page Access Token from the System User token to avoid publish_actions deprecation
      let pageAccessToken = fbPageToken;
      try {
        console.log(`[Facebook Graph API] Resolving Page Access Token for Page ID: ${fbPageId}`);
        const tokenUrl = `https://graph.facebook.com/v20.0/${fbPageId}?fields=access_token&access_token=${fbPageToken}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        if (tokenRes.ok && tokenData.access_token) {
          pageAccessToken = tokenData.access_token;
          console.log('[Facebook Graph API] Successfully resolved Page Access Token.');
        } else {
          console.warn('[Facebook Graph API] Could not resolve Page Access Token, using provided token:', JSON.stringify(tokenData));
        }
      } catch (tokenErr) {
        console.error('[Facebook Graph API] Exception resolving Page Access Token:', tokenErr);
      }

      if (finalMediaUrl) {
        const url = `https://graph.facebook.com/v20.0/${fbPageId}/photos`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: finalMediaUrl,
            message: message,
            access_token: pageAccessToken
          })
        });
      } else {
        const url = `https://graph.facebook.com/v20.0/${fbPageId}/feed`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            access_token: pageAccessToken
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

      return NextResponse.json({ 
        success: true, 
        postId: resJson.id || resJson.post_id 
      });

    } else if (publishTo === 'meta_ads') {
      let normalizedAdAccountId = metaAdAccountId.trim();
      if (!normalizedAdAccountId.startsWith('act_')) {
        normalizedAdAccountId = 'act_' + normalizedAdAccountId;
      }

      let campaignId = '';
      let adSetId = '';

      if (campaignMode === 'consolidated') {
        if (!existingAdSetId) {
          return NextResponse.json({ error: 'Missing existingAdSetId for consolidated campaign' }, { status: 400 });
        }
        adSetId = existingAdSetId;
        // Optionally fetch campaign ID to return in the response
        try {
          const adsetDetailsRes = await fetch(`https://graph.facebook.com/v20.0/${existingAdSetId}?fields=campaign&access_token=${metaDeveloperToken}`);
          if (adsetDetailsRes.ok) {
            const adsetDetailsJson = await adsetDetailsRes.json();
            campaignId = adsetDetailsJson?.campaign?.id || '';
          }
        } catch (err) {
          console.error('[Meta Ads] Failed to fetch campaign for existing ad set:', err);
        }
      } else {
        // 1. Create Campaign
        const campaignName = `${conceptName || 'Campaign'} - Paid Meta Ads - ${timestamp.split('T')[0]}`;
        const campaignRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaignName,
            objective: 'OUTCOME_TRAFFIC',
            status: 'PAUSED',
            special_ad_categories: ['NONE'],
            access_token: metaDeveloperToken
          })
        });
        
        const campaignJson = await campaignRes.json();
        if (!campaignRes.ok) {
          throw new Error(`Meta Campaign Error: ${campaignJson.error?.message || 'Unknown error'}`);
        }
        campaignId = campaignJson.id;

        // 2. Create Ad Set
        const adSetName = `${conceptName || 'Campaign'} - Ad Set - ${targetAudience || 'General'}`;
        const startTime = timestamp;
        const endTime = new Date(Date.now() + (durationDays || 7) * 24 * 60 * 60 * 1000).toISOString();

        const adsetRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adsets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adSetName,
            campaign_id: campaignId,
            daily_budget: Math.round((dailyBudget || 10) * 100), // convert to cents
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'LINK_CLICKS',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            targeting: JSON.stringify({
              geo_locations: { countries: ['US'] }
            }),
            start_time: startTime,
            end_time: endTime,
            status: 'PAUSED',
            access_token: metaDeveloperToken
          })
        });
        
        const adsetJson = await adsetRes.json();
        if (!adsetRes.ok) {
          throw new Error(`Meta AdSet Error: ${adsetJson.error?.message || 'Unknown error'}`);
        }
        adSetId = adsetJson.id;
      }

      // 3. Upload/Get Image Hash for each variation
      const createdAdIds: string[] = [];
      const createdCreativeIds: string[] = [];

      const variantsToPublish = mediaUrls.length > 0 ? mediaUrls : [null];

      for (let idx = 0; idx < variantsToPublish.length; idx++) {
        const mediaUrl = variantsToPublish[idx];
        const variantRatios = (ratioImages && typeof ratioImages === 'object')
          ? (ratioImages[idx] || ratioImages[String(idx)] || null)
          : (idx === 0 ? ratioImages : null);

        let imageHash = '';
        const hashesByRatio: { feed_4_5?: string; story_9_16?: string; square_1_1?: string } = {};

        if (variantRatios && typeof variantRatios === 'object') {
          const uploadPromises = Object.entries(variantRatios).map(async ([ratioKey, url]) => {
            if (!url || typeof url !== 'string') return;
            try {
              console.log(`[Meta Ads API] Uploading ratio image for variant ${idx}, key: ${ratioKey}, url: ${url}`);
              const imageRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adimages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url,
                  access_token: metaDeveloperToken
                })
              });
              const imageJson = await imageRes.json();
              if (imageRes.ok && imageJson.images) {
                const keys = Object.keys(imageJson.images);
                if (keys.length > 0) {
                  const hash = imageJson.images[keys[0]].hash;
                  hashesByRatio[ratioKey as 'feed_4_5' | 'story_9_16' | 'square_1_1'] = hash;
                  console.log(`[Meta Ads API] Successfully uploaded variant ${idx} ${ratioKey} image hash: ${hash}`);
                }
              } else {
                console.error(`[Meta Ads API] Failed to upload variant ${idx} ${ratioKey} image to Meta:`, JSON.stringify(imageJson));
              }
            } catch (err) {
              console.error(`[Meta Ads API] Error uploading variant ${idx} ratio image ${ratioKey} to Meta:`, err);
            }
          });
          await Promise.all(uploadPromises);
        }

        // If we don't have ratio images, or if they failed, upload the default variant reference URL
        if (mediaUrl && Object.keys(hashesByRatio).length === 0) {
          try {
            console.log(`[Meta Ads API] Uploading fallback reference image for variant ${idx}, url: ${mediaUrl}`);
            const imageRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adimages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: mediaUrl,
                access_token: metaDeveloperToken
              })
            });
            const imageJson = await imageRes.json();
            if (imageRes.ok && imageJson.images) {
              const keys = Object.keys(imageJson.images);
              if (keys.length > 0) {
                imageHash = imageJson.images[keys[0]].hash;
                console.log(`[Meta Ads API] Successfully uploaded variant ${idx} default image hash: ${imageHash}`);
              }
            }
          } catch (err) {
            console.error(`[Meta Ads API] Error uploading variant ${idx} default image to Meta:`, err);
          }
        }

        // Resolve the default base image hash to use inside object_story_spec.link_data
        const baseImageHash = hashesByRatio.feed_4_5 || hashesByRatio.square_1_1 || hashesByRatio.story_9_16 || imageHash;

        // 4. Create Ad Creative for this variant
        const creativeName = `${conceptName || 'Campaign'} - Creative - Variant ${idx + 1}`;
        const baseLink = destinationUrl || 'https://www.motoryachtwhiskey.com/experiences';
        const creativeBody: any = {
          name: creativeName,
          access_token: metaDeveloperToken,
          object_story_spec: {
            page_id: fbPageId,
            link_data: {
              link: `${baseLink}${baseLink.includes('?') ? '&' : '?'}utm_source=meta&utm_medium=paid_social&utm_campaign=${encodeURIComponent((conceptName || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`,
              message: message || headlines[0] || 'Luxury Yacht Charters aboard M/Y Whiskey',
              call_to_action: { type: 'BOOK_TRAVEL' }
            }
          }
        };

        if (baseImageHash) {
          creativeBody.object_story_spec.link_data.image_hash = baseImageHash;
        } else if (mediaUrl) {
          creativeBody.object_story_spec.link_data.picture = mediaUrl;
        }

        // Add platform_customizations if story_9_16 or feed_4_5 is available
        if (hashesByRatio.story_9_16 || hashesByRatio.feed_4_5) {
          const platformCustomizations: any = {};
          
          if (hashesByRatio.story_9_16) {
            platformCustomizations.instagram = {
              image_hash: hashesByRatio.story_9_16
            };
            platformCustomizations.audience_network = {
              image_hash: hashesByRatio.story_9_16
            };
          }
          
          if (hashesByRatio.feed_4_5) {
            platformCustomizations.facebook = {
              image_hash: hashesByRatio.feed_4_5
            };
          }
          
          if (Object.keys(platformCustomizations).length > 0) {
            creativeBody.platform_customizations = platformCustomizations;
          }
        }

        const creativeRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/adcreatives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(creativeBody)
        });
        
        const creativeJson = await creativeRes.json();
        if (!creativeRes.ok) {
          throw new Error(`Meta Creative Error (Variant ${idx + 1}): ${creativeJson.error?.message || 'Unknown error'}`);
        }
        const adCreativeId = creativeJson.id;
        createdCreativeIds.push(adCreativeId);

        // 5. Create Ad for this variant
        const adRes = await fetch(`https://graph.facebook.com/v20.0/${normalizedAdAccountId}/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${conceptName || 'Campaign'} - Ad - Variant ${idx + 1}`,
            adset_id: adSetId,
            creative: { creative_id: adCreativeId },
            status: 'PAUSED',
            access_token: metaDeveloperToken
          })
        });
        
        const adJson = await adRes.json();
        if (!adRes.ok) {
          throw new Error(`Meta Ad Error (Variant ${idx + 1}): ${adJson.error?.message || 'Unknown error'}`);
        }
        createdAdIds.push(adJson.id);
      }

      return NextResponse.json({
        success: true,
        campaignId,
        adSetId,
        adCreativeIds: createdCreativeIds,
        adCreativeId: createdCreativeIds[0] || '',
        adIds: createdAdIds,
        adId: createdAdIds[0] || ''
      });

    } else if (publishTo === 'google_search' || publishTo === 'google_pmax') {
      // 1. Token Exchange
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: googleRefreshToken,
          grant_type: 'refresh_token'
        })
      });
      
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok) {
        throw new Error(`Google Token Exchange Error: ${tokenJson.error_description || tokenJson.error || 'Unknown error'}`);
      }
      const accessToken = tokenJson.access_token;
      
      const cleanCustomerId = googleCustomerId.replace(/-/g, '').trim();
      const operations: any[] = [];
      const campaignName = `${conceptName || 'Campaign'} - ${publishTo === 'google_pmax' ? 'PMax' : 'Search'} - ${timestamp.split('T')[0]}`;
      const budgetName = `Budget - ${conceptName || 'Campaign'} - ${Date.now()}`;
      const baseLink = destinationUrl || 'https://www.motoryachtwhiskey.com/experiences';
      const finalUrl = `${baseLink}${baseLink.includes('?') ? '&' : '?'}utm_source=google&utm_medium=cpc&utm_campaign=${encodeURIComponent((conceptName || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`;
      
      const startDateStr = timestamp.split('T')[0].replace(/-/g, '');
      const endDateStr = new Date(Date.now() + (durationDays || 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');

      // Budget Operation (Mutate operation -1)
      operations.push({
        campaignBudgetOperation: {
          create: {
            resourceName: `customers/${cleanCustomerId}/campaignBudgets/-1`,
            name: budgetName,
            amountMicros: Math.round((dailyBudget || 10) * 1000000),
            deliveryMethod: 'STANDARD'
          }
        }
      });

      if (publishTo === 'google_search') {
        // Campaign Operation (Mutate operation -2)
        operations.push({
          campaignOperation: {
            create: {
              resourceName: `customers/${cleanCustomerId}/campaigns/-2`,
              name: campaignName,
              advertisingChannelType: 'SEARCH',
              status: 'PAUSED',
              campaignBudget: `customers/${cleanCustomerId}/campaignBudgets/-1`,
              startDate: startDateStr,
              endDate: endDateStr
            }
          }
        });

        // Ad Group Operation (Mutate operation -3)
        operations.push({
          adGroupOperation: {
            create: {
              resourceName: `customers/${cleanCustomerId}/adGroups/-3`,
              name: 'Ad Group 1',
              campaign: `customers/${cleanCustomerId}/campaigns/-2`,
              type: 'SEARCH_STANDARD',
              status: 'PAUSED'
            }
          }
        });

        // Ad Group Ad Operation (Responsive Search Ad)
        const responsiveHeadlines = (headlines.length > 0 ? headlines : ['Luxury Yacht Charters', 'M/Y Whiskey Destin', 'Private Yacht Charter'])
          .slice(0, 15)
          .map((h: string) => ({ text: h.slice(0, 30) }));

        const responsiveDescriptions = (descriptions.length > 0 ? descriptions : ['Enjoy a luxury private yacht charter in Destin, Florida.', 'Book your custom day cruise with captain and crew included.'])
          .slice(0, 4)
          .map((d: string) => ({ text: d.slice(0, 90) }));

        operations.push({
          adGroupAdOperation: {
            create: {
              adGroup: `customers/${cleanCustomerId}/adGroups/-3`,
              status: 'PAUSED',
              ad: {
                finalUrls: [finalUrl],
                responsiveSearchAd: {
                  headlines: responsiveHeadlines,
                  descriptions: responsiveDescriptions
                }
              }
            }
          }
        });

        // Keyword Operations
        const activeKeywords = keywords.length > 0 ? keywords : ['yacht charter Destin', 'boat rental Destin', 'luxury yacht rental'];
        for (const kw of activeKeywords.slice(0, 20)) {
          operations.push({
            adGroupCriterionOperation: {
              create: {
                adGroup: `customers/${cleanCustomerId}/adGroups/-3`,
                status: 'ENABLED',
                keyword: {
                  text: kw,
                  matchType: 'BROAD'
                }
              }
            }
          });
        }

      } else if (publishTo === 'google_pmax') {
        // Campaign Operation
        operations.push({
          campaignOperation: {
            create: {
              resourceName: `customers/${cleanCustomerId}/campaigns/-2`,
              name: campaignName,
              advertisingChannelType: 'PERFORMANCE_MAX',
              status: 'PAUSED',
              campaignBudget: `customers/${cleanCustomerId}/campaignBudgets/-1`,
              startDate: startDateStr,
              endDate: endDateStr
            }
          }
        });

        // Asset Group Operation
        operations.push({
          assetGroupOperation: {
            create: {
              resourceName: `customers/${cleanCustomerId}/assetGroups/-3`,
              name: 'Asset Group 1',
              campaign: `customers/${cleanCustomerId}/campaigns/-2`,
              finalUrls: [finalUrl],
              status: 'PAUSED'
            }
          }
        });
      }

      // Execute Google Ads Mutate Request
      const mutateRes = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/googleAds:mutate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': googleDeveloperToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mutateOperations: operations })
      });

      const mutateJson = await mutateRes.json();
      if (!mutateRes.ok) {
        console.error('[Google Ads API] Mutate Error Response:', JSON.stringify(mutateJson));
        throw new Error(`Google Ads API Mutate Error: ${mutateJson.error?.message || 'Unknown mutate error'}`);
      }

      return NextResponse.json({
        success: true,
        mutateResults: mutateJson.mutateOperationResponses
      });
    }

  } catch (error: any) {
    console.error('Error in social ads publish route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
