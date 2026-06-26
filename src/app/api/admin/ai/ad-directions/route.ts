import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { logUsage } from '@/lib/db-admin';

async function verifyAdmin(request: NextRequest): Promise<{ userId: string; organizationId: string } | null> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (process.env.NODE_ENV === 'development' && !serviceAccountJson) {
    return { userId: 'dev-admin', organizationId: 'default-org' };
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (decodedToken.admin !== true) {
      return null;
    }
    
    return {
      userId: decodedToken.uid || 'system-admin',
      organizationId: decodedToken.orgId || decodedToken.organizationId || 'default-org'
    };
  } catch (error) {
    console.error('Error verifying admin auth:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await verifyAdmin(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { adCopy, brandGuidePrompt, companyName, colors } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in backend environment variables.' 
      }, { status: 500 });
    }

    const colorsList = (colors || [])
      .map((c: any) => `${c.name} (${c.value})`)
      .join(', ');

    const systemInstruction = `You are a world-class advertising creative director and design strategist.
Your task is to analyze the provided ad copy and company branding, and design 3 distinct, high-performance graphic design directions for a visual ad campaign.
The background of the ad is a reference image of a luxury yacht.
For each direction, you will produce:
1. A descriptive title.
2. A style description explaining the visual layout, typography, colors, and layout elements (e.g. banners, badges).
3. The exact short, high-legibility text overlays (headline and subheadline) to extract from the copy.
4. An optimized, highly descriptive image prompt for Vertex AI Imagen 3 (capability-001 inpainting-insert model with full mask) to generate this specific ad creative.

CRITICAL INSTRUCTIONS FOR IMAGE PROMPTS:
- The model MUST keep the original yacht, anchored boat crowd, shoreline, and water from the reference image (referenceId: 1) completely intact in the background. It must not alter, replace, or mutate them.
- To guarantee legibility, the model MUST overlay a translucent panel, glassmorphism card, gold-brushed banner, or high-contrast badge behind the text. Placing text directly over the busy sandbar water will make it unreadable.
- Instruct the model to render exact copy text in sharp, professional fonts (e.g. premium serif for titles, clean modern sans-serif).
- Incorporate subtle 4th of July / Independence Day luxury accents: elegant red, white, and blue accent ribbons, tasteful gold stars, or circular gold seal badges (e.g., 'JULY 4th AVAILABILITY'). Keep it refined, not cheap.
- Ensure all text in the prompt is spelled correctly.`;

    const userPrompt = `AD COPY FOR THE CAMPAIGN:
"""
${adCopy}
"""

COMPANY NAME:
${companyName}

BRAND COLORS:
${colorsList || 'Whiskey Gold/Amber (#B9783B), Warm Off-White (#F4F1EA), Deep Charcoal (#1F2326)'}

CUSTOM BRAND GUIDELINES:
${brandGuidePrompt || 'Always use serif fonts for headlines, keep design minimal and elegant.'}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const responseSchema = {
      type: 'OBJECT',
      properties: {
        directions: {
          type: 'ARRAY',
          description: 'Exactly 3 distinct ad creative directions.',
          items: {
            type: 'OBJECT',
            properties: {
              id: { type: 'INTEGER' },
              title: { type: 'STRING', description: 'Headline title of the direction' },
              styleDescription: { type: 'STRING', description: 'Brief description of the design aesthetic and graphic elements.' },
              headline: { type: 'STRING', description: 'Primary bold ad text to overlay' },
              subheadline: { type: 'STRING', description: 'Secondary ad text or brand name' },
              prompt: { type: 'STRING', description: 'Prescriptive, highly detailed prompt for Imagen 3 capability-001 (keeping background yacht intact, specifying colors, translucent cards, fonts, and holiday decor).' }
            },
            required: ['id', 'title', 'styleDescription', 'headline', 'subheadline', 'prompt']
          }
        }
      },
      required: ['directions']
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
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
      console.error('Gemini ad directions helper failed:', errText);
      return NextResponse.json({ error: `AI service returned error: ${response.statusText}` }, { status: 502 });
    }

    const geminiJson = await response.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse the JSON output
    const data = JSON.parse(rawText.trim());

    // Log token usage
    try {
      const usageMetadata = geminiJson.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const candidateTokens = usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = promptTokens + candidateTokens;
      
      const costEst = parseFloat(((promptTokens * 0.075 + candidateTokens * 0.30) / 1000000).toFixed(6));
      
      if (totalTokens > 0) {
        await logUsage({
          organizationId: authContext.organizationId,
          userId: authContext.userId,
          type: 'ai_text',
          provider: 'gemini',
          units: totalTokens,
          costEst
        });
      }
    } catch (logErr) {
      console.error('Error logging usage for AI ad directions:', logErr);
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in AI ad directions API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
