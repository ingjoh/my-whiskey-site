import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { DEFAULT_SOCIAL_ADS_SETTINGS, SocialAdsSettings, migrateSocialAdsSettings } from '@/lib/db';
import { logUsage } from '@/lib/db-admin';

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
    const { platform, ad, instruction, originalPromptContext } = body;

    if (!platform || !ad || !instruction) {
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

    // Retrieve API key
    const apiKey = settings.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured. Please add it in the settings tab or env variables.' 
      }, { status: 400 });
    }

    // Define response schema (representing a single bundle matching the input ad properties)
    let responseSchema: any = {
      type: 'OBJECT',
      properties: {},
      required: []
    };

    if (platform === 'meta') {
      responseSchema = {
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
            description: 'List of exactly 3-5 relevant media tags',
            maxItems: 5
          }
        },
        required: ['conceptName', 'rationale', 'hook', 'bodyCopy', 'headline', 'suggestedTags']
      };
    } else if (platform === 'google-search') {
      responseSchema = {
        type: 'OBJECT',
        properties: {
          conceptName: { type: 'STRING' },
          rationale: { type: 'STRING' },
          headlines: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 10-15 headlines (strictly under 30 characters).',
            maxItems: 15
          },
          descriptions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
            description: 'List of 4 descriptions (strictly under 90 characters).',
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
      responseSchema = {
        type: 'OBJECT',
        properties: {
          conceptName: { type: 'STRING' },
          rationale: { type: 'STRING' },
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
    } else {
      return NextResponse.json({ error: 'Invalid platform specified' }, { status: 400 });
    }

    const compiledPrompt = `You are a luxury marketing copywriter and optimization specialist for private yacht charters.
We need to refine a single ad copy bundle that has been generated.

Here is the current ad copy in JSON format:
${JSON.stringify(ad, null, 2)}

User Instruction for Refinement:
"${instruction}"

${originalPromptContext ? `Original Generation Context: ${originalPromptContext}\n` : ''}

Task:
Refine the ad copy. Make edits that address the user's instructions while keeping the luxury voice of M/Y Whiskey. Change ONLY what is requested or is necessary to satisfy the instruction. Leave unchanged fields as they are.

Strict constraints:
- Output MUST match the provided JSON schema.
- Adhere to the character limits (Headlines under 30 characters, descriptions/long headlines under 90 characters).
- Do not add conversational text or code fences outside of the JSON structure.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
        if (errText) {
          errMsg = `Gemini API: ${errText.substring(0, 200)}`;
        }
      }
      return NextResponse.json({ error: errMsg }, { status: response.status === 429 ? 429 : 502 });
    }

    const geminiJson = await response.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error('Invalid response structure from Gemini API:', JSON.stringify(geminiJson));
      return NextResponse.json({ error: 'Invalid response structure from Gemini API' }, { status: 502 });
    }

    // Extract usage details and log in Firestore
    try {
      const usageMetadata = geminiJson.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const candidateTokens = usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = promptTokens + candidateTokens;
      
      const costEst = parseFloat(((promptTokens * 0.075 + candidateTokens * 0.30) / 1000000).toFixed(6));
      
      let userId = 'system-admin';
      let organizationId = 'default-org';
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const idToken = authHeader.split('Bearer ')[1];
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          userId = decodedToken.uid || 'system-admin';
          organizationId = decodedToken.orgId || decodedToken.organizationId || 'default-org';
        } catch (authErr) {
          // Dev fallback
        }
      }
      
      if (totalTokens > 0) {
        await logUsage({
          organizationId,
          userId,
          type: 'ai_text',
          provider: 'gemini',
          units: totalTokens,
          costEst
        });
      }
    } catch (logErr) {
      console.error('Error logging Gemini usage in refine:', logErr);
    }

    try {
      const parsedOutput = JSON.parse(rawText);
      // Retain the user bindings and dynamic metadata from the original ad object if not overwritten
      const mergedOutput = {
        ...ad,
        ...parsedOutput
      };
      return NextResponse.json(mergedOutput);
    } catch (parseError) {
      console.error('Failed to parse Gemini refine output text as JSON:', rawText, parseError);
      return NextResponse.json({ error: 'Failed to parse AI output as valid JSON' }, { status: 502 });
    }

  } catch (error: any) {
    console.error('Error in social ads refinement route:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
