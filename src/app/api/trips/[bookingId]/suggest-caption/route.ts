import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (process.env.NODE_ENV === 'development' && !serviceAccountJson) {
    return true;
  }
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return !!decodedToken;
  } catch (error) {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const isAuthed = await verifyAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });
    }

    // Load Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in environment variables.' 
      }, { status: 500 });
    }

    // Download image and convert to base64
    let base64Data = '';
    let mimeType = 'image/jpeg';
    try {
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download image: ${imgRes.statusText}`);
      }
      const buffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
      
      const contentType = imgRes.headers.get('content-type');
      if (contentType) {
        mimeType = contentType;
      }
    } catch (e: any) {
      console.error('Error downloading image for caption suggest:', e);
      return NextResponse.json({ error: `Could not retrieve file: ${e.message}` }, { status: 502 });
    }

    // Construct prompt
    const systemInstruction = `You are a professional luxury copywriter. Write a short, evocative description/caption (less than 15 words) for the provided photo taken during a luxury yacht charter excursion in Destin, Florida.
Keep the description refined, high-end, and descriptive. Do not include introductory notes, conversational wrappers, or markdown format. Output only the caption.`;

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
            parts: [
              {
                text: "Write a premium luxury caption for this photo."
              },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini caption suggest failed:', errText);
      return NextResponse.json({ error: 'AI caption suggestion failed.' }, { status: 502 });
    }

    const resJson = await response.json();
    const caption = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return NextResponse.json({ caption: caption.trim() });
  } catch (error: any) {
    console.error('Error in suggest-caption API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
