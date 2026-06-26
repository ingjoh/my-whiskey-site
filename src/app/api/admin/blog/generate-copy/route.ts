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

    const { title, summary, outline, instructions } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Missing title parameter' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in backend environment variables.' 
      }, { status: 500 });
    }

    const systemPrompt = `You are a high-end luxury yacht copywriter. Your goal is to write a comprehensive, highly engaging, and SEO-optimized blog article for the website of 'M/Y Whiskey', a luxury charter yacht in Destin, Florida, and suggest a creative image prompt for its hero image.
Write in a refined, exclusive, and evocative tone.
Format the article copy in clean Markdown.
- Use heading tags (#, ##, ###) for structured sections.
- Integrate bulleted lists for readability.
- Add bold text, italic highlights, and blockquotes for premium editorial layout.

You must return a JSON object with two fields:
1. "articleMarkdown": the complete markdown text of the article itself.
2. "recommendedImagePrompt": a descriptive, high-quality image generation prompt (tailored for Vertex AI Imagen 3) to create a beautiful, atmospheric hero photo representing the article. The prompt should specify details like luxury yacht style, lighting (e.g. golden hour, sunset), environment (e.g. Destin Harbor, Crab Island), composition, and premium camera aesthetic (e.g. photorealistic, commercial travel photography).`;

    let userPrompt = `Write a complete blog post with the following details:
Title: "${title}"
Summary Hook: "${summary || 'None specified'}"
`;

    if (outline) {
      userPrompt += `Target Section Outline:\n${outline}\n`;
    }
    
    if (instructions) {
      userPrompt += `Additional Instructions:\n${instructions}\n`;
    }

    userPrompt += `\nPlease write a deep, high-value, and elegant article (around 600-1000 words). Focus on luxury guest experience, safety, Destin local secrets, and premium vessel amenities.`;

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
              articleMarkdown: { type: 'STRING' },
              recommendedImagePrompt: { type: 'STRING' }
            },
            required: ['articleMarkdown', 'recommendedImagePrompt']
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini copy generator failed:', errText);
      return NextResponse.json({ error: 'AI Service returned error' }, { status: 502 });
    }

    const geminiJson = await response.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsedData = JSON.parse(rawText);
    const articleMarkdown = parsedData.articleMarkdown || '';
    const recommendedImagePrompt = parsedData.recommendedImagePrompt || '';

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
      console.error('Error logging usage for AI blog copy generation:', logErr);
    }

    return NextResponse.json({ 
      markdown: articleMarkdown, 
      imagePrompt: recommendedImagePrompt 
    });

  } catch (error: any) {
    console.error('Error in AI blog copy API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
