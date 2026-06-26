import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, admin } from '@/lib/firebase-admin';
import { logUsage } from '@/lib/db-admin';
import { detectProjectId } from '@/lib/project-env';

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

    const { prompt, slug } = await request.json();

    if (!prompt || !slug) {
      return NextResponse.json({ error: 'Missing prompt or slug parameter' }, { status: 400 });
    }

    const projectId = detectProjectId() || admin.app().options.projectId;
    if (!projectId) {
      return NextResponse.json({ error: 'GCP Project ID could not be detected' }, { status: 500 });
    }

    // Get Access Token using Firebase Admin credential helper
    let accessToken = '';
    try {
      const credential = admin.app().options.credential;
      if (credential && typeof credential.getAccessToken === 'function') {
        const tokenResult = await credential.getAccessToken();
        accessToken = tokenResult.access_token;
      }
    } catch (tokenErr) {
      console.error('Error getting GCP OAuth2 access token:', tokenErr);
    }

    if (!accessToken) {
      // In local dev without service account, fallback to check environment keys
      return NextResponse.json({ 
        error: 'Google Cloud service account access token is unavailable. Ensure FIREBASE_SERVICE_ACCOUNT env key is set.' 
      }, { status: 500 });
    }

    // Call Vertex AI Imagen 3 REST API
    const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`;
    
    const response = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/webp',
          personGeneration: 'allow_adult'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Vertex AI Imagen API request failed:', errText);
      return NextResponse.json({ error: 'Vertex AI Imagen API failed. Make sure Vertex AI API is enabled in your GCP project.' }, { status: 502 });
    }

    const vertexJson = await response.json();
    const base64Str = vertexJson.predictions?.[0]?.bytesBase64Encoded;

    if (!base64Str) {
      console.error('Vertex AI response missing predictions:', JSON.stringify(vertexJson));
      return NextResponse.json({ error: 'No image predictions received from Vertex AI' }, { status: 502 });
    }

    // Upload base64 image to Firebase Storage
    const bucketName = projectId === 'my-whiskey-prod' 
      ? 'my-whiskey-prod.firebasestorage.app' 
      : 'mywhiskey-97620.firebasestorage.app';
    const bucket = admin.storage().bucket(bucketName);
    // Use standard firebase library/ destination folder
    const fileName = `library/blog_${slug}_${Date.now()}.webp`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(base64Str, 'base64');
    await file.save(buffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: {
          generatedBy: 'Imagen 3 AI',
          prompt: prompt
        }
      }
    });

    // Make public URL (consistent with Firebase storage public download url formats)
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    // Log Image Generation Usage (Imagen wholesale pricing: ~$0.03 per generated image)
    try {
      await logUsage({
        organizationId: authContext.organizationId,
        userId: authContext.userId,
        type: 'ai_image',
        provider: 'vertex_ai',
        units: 1,
        costEst: 0.030000
      });
    } catch (logErr) {
      console.error('Error logging image generation usage:', logErr);
    }

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Error in AI blog image generation API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
