import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

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
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
    }

    const isAuthed = await verifyAuth(request);
    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch Asset from Firestore
    const assetRef = adminDb.collection('assets').doc(assetId);
    const assetSnap = await assetRef.get();
    if (!assetSnap.exists) {
      return NextResponse.json({ error: 'Asset not found.' }, { status: 404 });
    }
    const asset = assetSnap.data() || {};
    const downloadURL = asset.url;
    const mimeType = asset.type || 'image/jpeg';

    if (!downloadURL) {
      return NextResponse.json({ error: 'Asset public URL is missing.' }, { status: 400 });
    }

    // Only run image analysis for images
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Non-image asset skipped analysis.',
        asset: {
          ...asset,
          title: asset.name || 'Document Asset',
          description: 'Document file uploaded to media library.',
          tags: ['document', 'upload']
        }
      });
    }

    // Load Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in environment variables.' 
      }, { status: 500 });
    }

    // 2. Fetch image content and convert to base64
    let base64Data = '';
    try {
      const imgRes = await fetch(downloadURL);
      if (!imgRes.ok) {
        throw new Error(`Failed to fetch image: ${imgRes.statusText}`);
      }
      const buffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
    } catch (fetchErr: any) {
      console.error('Error downloading image for AI analysis:', fetchErr);
      return NextResponse.json({ error: `Could not retrieve asset file: ${fetchErr.message}` }, { status: 502 });
    }

    // 3. Construct prompt
    const systemInstruction = `You are an expert digital media organizer. Analyze the provided image and generate metadata suitable for a luxury yacht charter catalog.
Your response MUST be a JSON object with three fields:
"title": a premium, concise title (3-5 words) representing the scene (e.g., "Crab Island Anchor-out").
"description": a rich, luxury-toned single sentence description adding narrative value (e.g., "The perfect emerald waters of Crab Island welcoming guests for an afternoon swim.").
"tags": an array of 4-6 lowercase keyword strings (e.g., ["yacht", "crab-island", "swimming", "emerald-water"]).

Do not include markdown code block wrappers (like \`\`\`json) or other explanatory notes. Output raw JSON only.`;

    // 4. Call Gemini Multimodal API
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
                text: "Generate the JSON metadata block for this yacht charter media file."
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
      console.error('Gemini vision model failed:', errText);
      return NextResponse.json({ error: 'AI vision model failed to analyze image.' }, { status: 502 });
    }

    const resJson = await response.json();
    let text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
      const parsed = JSON.parse(text);
      const updatedAsset = {
        ...asset,
        title: parsed.title || asset.name,
        description: parsed.description || '',
        tags: parsed.tags || [],
        isAnalyzed: true,
        updatedAt: Date.now()
      };
      
      await assetRef.set(updatedAsset, { merge: true });
      return NextResponse.json({ success: true, asset: updatedAsset });
    } catch (e) {
      console.error('Failed to parse Gemini Vision output:', text);
      const fallbackAsset = {
        ...asset,
        title: asset.name,
        description: 'Uploaded yacht charter photo.',
        tags: ['yacht', 'excursion'],
        isAnalyzed: true,
        updatedAt: Date.now()
      };
      await assetRef.set(fallbackAsset, { merge: true });
      return NextResponse.json({ success: true, asset: fallbackAsset });
    }
  } catch (error: any) {
    console.error('Error analyzing media:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
