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

    // 1. Fetch Booking
    const bookingDoc = await adminDb.collection('pages').doc(`booking-${bookingId}`).get();
    if (!bookingDoc.exists) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    const booking = bookingDoc.data() || {};

    // 2. Fetch Waiver
    const waiverDoc = await adminDb.collection('pages').doc(`waiver-${bookingId}`).get();
    const waiver = waiverDoc.exists ? waiverDoc.data() : null;

    // 3. Compile context details
    const guestName = booking.guestName || 'Valued Guest';
    const guestState = waiver?.billingAddress?.state || '';
    const passengers = waiver?.passengers || [];
    const captainName = booking.captainTitle || 'Assigned Captain';
    const vesselName = booking.vesselTitle || booking.vesselSlug || 'Luxury Yacht';
    const experienceTitle = booking.experienceTitle || 'Private Coastal Excursion';
    const tripDate = booking.date || '';

    // Create participant list
    const participantDetails = passengers
      .map((p: any) => `${p.name} (${p.relationship || 'Guest'})`)
      .join(', ');

    // Load Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Gemini API Key is not configured in environment variables.' 
      }, { status: 500 });
    }

    // 4. Construct Gemini prompt
    const systemInstruction = `You are a professional luxury yacht copywriter. Your goal is to write a highly evocative, premium summary and story describing a luxury charter excursion. 
Keep the language refined, exclusive, and representative of elite ocean travel. Avoid cheesy cliches.
The output MUST be a JSON object containing two fields: "title" (a captivating title for the trip memory page) and "story" (a short, engaging 2-3 paragraph story about the charter). Do not include any markdown code block wrappers (like \`\`\`json) or other conversational notes. Output only the raw JSON.`;

    const userPrompt = `Generate a personalized luxury trip story with the following details:
- Excursion: ${experienceTitle} aboard the yacht ${vesselName}
- Date: ${tripDate}
- Lead Guest: ${guestName}${guestState ? ` from ${guestState}` : ''}
- Participants: ${participantDetails || 'Family & Friends'}
- Captain & Crew: Captain ${captainName}

The narrative should describe sailing through the emerald waters, relaxing on deck, dolphin sightings or anchoring off the sandbar, highlighting the premium, captain-led nature of the excursion. Ensure the tone is very elegant and high-end.`;

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
      console.error('Gemini story suggest failed:', errText);
      return NextResponse.json({ error: 'AI generation service failed' }, { status: 502 });
    }

    const resJson = await response.json();
    let text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Clean potential markdown blocks
    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
      const parsed = JSON.parse(text);
      return NextResponse.json(parsed);
    } catch (e) {
      console.error('Failed to parse Gemini JSON output:', text);
      return NextResponse.json({
        title: `${guestName}'s ${experienceTitle}`,
        story: `An amazing private coastal charter excursion aboard ${vesselName} led by Captain ${captainName}. The day was filled with beautiful scenery, clear waters, and relaxing moments on the water.`
      });
    }
  } catch (error: any) {
    console.error('Error generating AI story:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
