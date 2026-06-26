import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
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

    // Load upcoming bookings and calendar events to provide smart contextual suggestions
    let bookingsCount = 0;
    let holidaysList = '';

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const bookingsSnap = await adminDb.collection('bookings').get();
      bookingsCount = bookingsSnap.size;

      const eventsSnap = await adminDb.collection('calendar_events')
        .where('startDate', '>=', todayStr)
        .limit(10)
        .get();

      const events: any[] = [];
      eventsSnap.forEach(doc => {
        events.push(doc.data());
      });

      holidaysList = events.map(e => `${e.title} (${e.startDate} to ${e.endDate}, Impact: ${e.impactScore}x)`).join(', ');
    } catch (dbErr) {
      console.warn('Error loading calendar events for AI context, fallback to defaults:', dbErr);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in backend environment variables.' 
      }, { status: 500 });
    }

    const systemPrompt = `You are a high-end luxury yacht marketing strategist. Your goal is to suggest 5 highly engaging, SEO-optimized blog article titles and hooks for the website of 'M/Y Whiskey', a luxury charter yacht based in Destin, Florida.
We want to appeal to:
- High-net-worth families (safety, comfort, snorkeling, dolphins).
- Friends & social groups ( Crab Island, sandbars, sunset cruises, music, champagne).
- Executive retreats / Corporate (team-building, high-end clients, catering).
- Romantic couples (sunset, proposals, anniversaries).

Here are upcoming holidays and events near Destin: [${holidaysList || 'None loaded'}].
Focus the suggestions on topics that are highly relevant to booking a private yacht charter in Destin during these upcoming periods, or general luxury boating topics.`;

    const userPrompt = `Please generate exactly 5 distinct blog ideas.
Output the results in JSON format matching this schema:
{
  "ideas": [
    {
      "title": "A highly clickable, SEO-friendly, luxury-themed article title",
      "hook": "A 1-2 sentence compelling summary hook detailing what the post is about",
      "suggestedTags": ["tag1", "tag2"],
      "outline": "A brief outline of proposed section headers"
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            parts: [{ text: userPrompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              ideas: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING' },
                    hook: { type: 'STRING' },
                    suggestedTags: { type: 'ARRAY', items: { type: 'STRING' } },
                    outline: { type: 'STRING' }
                  },
                  required: ['title', 'hook', 'suggestedTags', 'outline']
                }
              }
            },
            required: ['ideas']
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini ideas generator failed:', errText);
      return NextResponse.json({ error: 'AI Service returned error' }, { status: 502 });
    }

    const geminiJson = await response.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Log Token Usage
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
      console.error('Error logging usage for AI blog idea generation:', logErr);
    }

    const parsedData = JSON.parse(rawText.trim());
    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error('Error in AI blog ideas API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
