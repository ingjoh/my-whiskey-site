import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { DEFAULT_SOCIAL_ADS_SETTINGS, SocialAdsSettings, migrateSocialAdsSettings } from '@/lib/db';

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

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status === 503 || response.status >= 500) {
        if (i < retries - 1) {
          const waitTime = response.status === 429 ? Math.max(delay, 6000) : delay;
          console.warn(`Transient status ${response.status} from ${url}. Retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          delay *= 2;
          continue;
        }
      }
      return response;
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`Network error from ${url}. Retrying in ${delay}ms...`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkIsAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { location = 'Destin, Florida', year = new Date().getFullYear() } = body;

    // Load settings from Firestore to retrieve Gemini API Key
    let settings: SocialAdsSettings = DEFAULT_SOCIAL_ADS_SETTINGS;
    try {
      const docSnap = await adminDb.collection('settings').doc('social_ads').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        settings = migrateSocialAdsSettings({
          ...DEFAULT_SOCIAL_ADS_SETTINGS,
          ...data
        }) as SocialAdsSettings;
      }
    } catch (dbError) {
      console.error('Error loading social ads settings from DB:', dbError);
    }

    const apiKey = settings.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured. Please add it in the settings tab or env variables.' 
      }, { status: 400 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a tourism and events analyst. Identify major events, holiday breaks, festivals, sports tournaments, and boating seasons for the location "${location}" during the year ${year} that could impact a luxury yacht charter business (e.g., increase or decrease bookings/sales).
  
For each event, you must specify:
- title: The name of the event (e.g., "Destin Fishing Rodeo", "Spring Break Week 1", "Super Bowl Sunday").
- description: A short description of the event and its tourism impact.
- startDate: The start date of the event in YYYY-MM-DD format.
- endDate: The end date of the event in YYYY-MM-DD format (can be same as startDate if single-day).
- type: One of "national", "regional", "custom".
- impactScore: A float value representing the estimated business impact. 
  Guidelines for impactScore:
  * 1.5+ (High Demand): Events causing huge tourism surges (e.g., major holiday weekends, local boat shows, popular festivals).
  * 1.0 (Neutral): Default.
  * 0.5 - 0.8 (Low Demand): Events that divert tourists away or slow down charter interest (e.g., cold winter weeks, major stay-at-home events like Super Bowl Sunday).

Provide a highly targeted list of 8-15 events. Dates must be accurate for the year ${year}.`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        events: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              startDate: { type: 'STRING', description: 'YYYY-MM-DD format' },
              endDate: { type: 'STRING', description: 'YYYY-MM-DD format' },
              type: { type: 'STRING', enum: ['national', 'regional', 'custom'] },
              impactScore: { type: 'NUMBER' }
            },
            required: ['title', 'description', 'startDate', 'endDate', 'type', 'impactScore']
          }
        }
      },
      required: ['events']
    };

    const response = await fetchWithRetry(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      })
    });

    const resJson = await response.json();

    if (!response.ok) {
      console.error('[Gemini API] Error suggesting events:', JSON.stringify(resJson));
      return NextResponse.json({ 
        error: resJson.error?.message || 'Gemini API responded with an error.' 
      }, { status: response.status });
    }

    const textResult = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) {
      return NextResponse.json({ error: 'Failed to extract content from Gemini response.' }, { status: 500 });
    }

    const parsedData = JSON.parse(textResult);
    return NextResponse.json({ events: parsedData.events || [] });

  } catch (error: any) {
    console.error('Error in events suggestion route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
