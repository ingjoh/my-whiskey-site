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
      // Retry on 429 (Too Many Requests), 503 (Service Unavailable), or other transient server errors
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
    const { platform, persona, event, urgency, bookingWindow, searchIntent, mediaAssets, location } = body;

    if (!platform || !persona || !urgency || !bookingWindow) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Load settings from Firestore
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
      console.error('Error loading social ads settings from DB, using defaults:', dbError);
    }

    // Determine the prompt template
    let template = '';
    if (platform === 'meta') {
      template = settings.metaPrompt;
    } else if (platform === 'google-search') {
      template = settings.googleSearchPrompt;
    } else if (platform === 'google-pmax') {
      template = settings.googlePMaxPrompt;
    } else {
      return NextResponse.json({ error: 'Invalid platform specified' }, { status: 400 });
    }

    // Compile the prompt
    let compiledPrompt = template
      .replace(/{{persona}}/g, persona || '')
      .replace(/{{event}}/g, event || 'None')
      .replace(/{{urgency}}/g, urgency || '')
      .replace(/{{bookingWindow}}/g, bookingWindow || '')
      .replace(/{{mediaAssets}}/g, mediaAssets || 'None')
      .replace(/{{searchIntent}}/g, searchIntent || 'General')
      .replace(/{{location}}/g, location || 'Destin, FL');

    // Append strict limit instructions to prevent run-away list output (e.g. tag lists)
    compiledPrompt += `\n\nCRITICAL SYSTEM LIMITATION INSTRUCTIONS:
- For 'suggestedTags', you MUST list a maximum of 5 tags. Do not exceed 5 items.
- For 'headlines', you MUST list a maximum of 15 items for Search Ads, and exactly 5 items for PMax.
- For 'descriptions', you MUST list a maximum of 4 items.
- For 'keywords', you MUST list a maximum of 8 items.
- For 'negativeKeywords', you MUST list a maximum of 5 items.
- For 'longHeadlines', you MUST list a maximum of 3 items.
Failure to follow these limits will cause client parsing errors.`;

    // Retrieve API key: 1. Custom DB settings key, 2. Env variable
    const apiKey = settings.apiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured. Please add it in the settings tab or env variables.' 
      }, { status: 400 });
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Define the response schema structure dynamically based on the platform to force JSON output
    let responseSchema: any = {
      type: 'OBJECT',
      properties: {
        bundles: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {},
            required: []
          }
        }
      },
      required: ['bundles']
    };

    if (platform === 'meta') {
      responseSchema.properties.bundles.items = {
        type: 'OBJECT',
        properties: {
          conceptName: { type: 'STRING' },
          rationale: { type: 'STRING' },
          hook: { type: 'STRING' },
          bodyCopy: { type: 'STRING' },
          headline: { type: 'STRING' },
          suggestedTags: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of exactly 3-5 relevant media tags (e.g. ["sunset", "couples"])',
            maxItems: 5
          }
        },
        required: ['conceptName', 'rationale', 'hook', 'bodyCopy', 'headline', 'suggestedTags']
      };
    } else if (platform === 'google-search') {
      responseSchema.properties.bundles.items = {
        type: 'OBJECT',
        properties: {
          conceptName: { type: 'STRING' },
          rationale: { type: 'STRING' },
          headlines: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 10-15 high-converting headlines (each strictly under 30 characters).',
            maxItems: 15
          },
          descriptions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 4 descriptions (each strictly under 90 characters).',
            maxItems: 4
          },
          keywords: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Target keywords (max 8).',
            maxItems: 8
          },
          negativeKeywords: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'Negative keywords to filter (max 5).',
            maxItems: 5
          }
        },
        required: ['conceptName', 'rationale', 'headlines', 'descriptions', 'keywords', 'negativeKeywords']
      };
    } else if (platform === 'google-pmax') {
      responseSchema.properties.bundles.items = {
        type: 'OBJECT',
        properties: {
          conceptName: { type: 'STRING' },
          rationale: { type: 'STRING', description: 'Rationale and asset configuration guidance.' },
          headlines: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 5 headlines (each under 30 characters).',
            maxItems: 5
          },
          longHeadlines: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 2-3 long headlines (each under 90 characters).',
            maxItems: 3
          },
          descriptions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 2-3 descriptions (each under 90 characters).',
            maxItems: 3
          }
        },
        required: ['conceptName', 'rationale', 'headlines', 'longHeadlines', 'descriptions']
      };
    }

    const response = await fetchWithRetry(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: compiledPrompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API request failed:', errText);
      let errMsg = `Gemini API returned error: ${response.statusText || response.status}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = `Gemini API: ${errJson.error.message}`;
        }
      } catch (parseErr) {
        // Fallback to text if JSON parsing fails
        if (errText) {
          errMsg = `Gemini API: ${errText.substring(0, 200)}`;
        }
      }
      return NextResponse.json({ error: errMsg }, { status: response.status === 429 ? 429 : 502 });
    }

    const geminiJson = await response.json();
    
    // Parse Gemini's JSON structure from candidates[0].content.parts[0].text
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('Invalid response structure from Gemini API:', JSON.stringify(geminiJson));
      return NextResponse.json({ error: 'Invalid response structure from Gemini API' }, { status: 502 });
    }

    try {
      const parsedOutput = JSON.parse(rawText);
      return NextResponse.json(parsedOutput);
    } catch (parseError) {
      console.error('Failed to parse Gemini output text as JSON:', rawText, parseError);
      return NextResponse.json({ error: 'Failed to parse AI output as valid JSON' }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Error in social ads generation route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
