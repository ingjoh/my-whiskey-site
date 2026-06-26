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

    const { promptContext, instruction, tone, currentValue } = await request.json();

    if (!promptContext) {
      return NextResponse.json({ error: 'Missing promptContext parameter' }, { status: 400 });
    }

    // Load Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in backend environment variables.' 
      }, { status: 500 });
    }

    // Compile Gemini prompt
    let systemInstruction = `You are a professional luxury yacht copywriter. Your goal is to write high-converting, premium copy for the website of 'M/Y Whiskey', a high-end luxury charter yacht based in Destin, Florida.
Keep the language refined, exclusive, and evocative of elite ocean travel. Avoid cheesy cliches.
The output MUST be only the resulting copy. Do not include introductory notes, markdown wrappers, or metadata. Output the raw text of the copy only.`;

    let userPrompt = `Field Context: Write or refine a '${promptContext}' text block.
Tone of voice: ${tone}.
`;

    if (currentValue) {
      userPrompt += `Current Value (to refine/improve): "${currentValue}"\n`;
    }

    if (instruction) {
      userPrompt += `User Instructions/Preferences: "${instruction}"\n`;
      userPrompt += `Please update or write the copy based strictly on these instructions.`;
    } else if (currentValue) {
      userPrompt += `Please rewrite and improve this text to make it sound more professional and fitting for the ${tone} tone.`;
    } else {
      userPrompt += `Please write a brand new, highly engaging draft for this field.`;
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
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
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini text helper failed:', errText);
      return NextResponse.json({ error: `AI service returned error: ${response.statusText}` }, { status: 502 });
    }

    const geminiJson = await response.json();
    const rawText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanText = rawText.trim();

    // Log Token Usage
    try {
      const usageMetadata = geminiJson.usageMetadata;
      const promptTokens = usageMetadata?.promptTokenCount || 0;
      const candidateTokens = usageMetadata?.candidatesTokenCount || 0;
      const totalTokens = promptTokens + candidateTokens;
      
      // Cost: $0.075/M input, $0.30/M output tokens for gemini-2.5-flash
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
      console.error('Error logging usage for AI text generation:', logErr);
    }

    return NextResponse.json({ text: cleanText });

  } catch (error: any) {
    console.error('Error in AI generate text API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
