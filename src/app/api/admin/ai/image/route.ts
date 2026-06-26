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

    const body = await request.json();
    const { action, prompt, image, mask, aspectRatio, upscaleFactor, editMode } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    if (action === 'generate' && !prompt) {
      return NextResponse.json({ error: 'Prompt is required for image generation' }, { status: 400 });
    }

    if ((action === 'edit' || action === 'upscale') && !image) {
      return NextResponse.json({ error: 'Source image is required for editing or upscaling' }, { status: 400 });
    }

    if (action === 'edit' && !mask && (editMode === 'inpainting-insert' || editMode === 'inpainting-replace')) {
      return NextResponse.json({ error: 'Mask image is required for inpainting' }, { status: 400 });
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
      return NextResponse.json({ 
        error: 'Google Cloud service account access token is unavailable. Ensure FIREBASE_SERVICE_ACCOUNT is configured.' 
      }, { status: 500 });
    }

    // Determine the model and predict endpoint based on action
    let modelId = 'imagen-3.0-generate-002';
    if (action === 'edit' || action === 'upscale' || action === 'outpaint') {
      modelId = 'imagen-3.0-capability-001';
    }

    const vertexUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${modelId}:predict`;

    // Construct request payload
    const instance: any = {};
    const parameters: any = {
      sampleCount: 1,
      outputMimeType: 'image/webp'
    };

    if (action === 'generate') {
      instance.prompt = prompt;
      parameters.aspectRatio = aspectRatio || '1:1';
      parameters.personGeneration = 'allow_adult';
    } else if (action === 'edit' || action === 'outpaint') {
      instance.prompt = prompt;
      // Strip base64 headers if present (e.g. data:image/png;base64,...)
      const cleanedImage = image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      const referenceImages = [
        {
          referenceId: 1,
          referenceType: 'REFERENCE_TYPE_RAW',
          referenceImage: {
            bytesBase64Encoded: cleanedImage
          }
        }
      ];

      if (action === 'outpaint' || editMode === 'outpainting' || !mask) {
        parameters.editMode = 'EDIT_MODE_OUTPAINT';
        // Outpainting on capability-001 requires both RAW and MASK image types.
        // We use the base image as the mask image fallback.
        referenceImages.push({
          referenceId: 2,
          referenceType: 'REFERENCE_TYPE_MASK',
          referenceImage: {
            bytesBase64Encoded: cleanedImage
          },
          maskImageConfig: {
            maskMode: 'MASK_MODE_USER_PROVIDED',
            dilation: 0.0
          }
        } as any);
      } else {
        const cleanedMask = mask.replace(/^data:image\/[a-z]+;base64,/, '');
        referenceImages.push({
          referenceId: 2,
          referenceType: 'REFERENCE_TYPE_MASK',
          referenceImage: {
            bytesBase64Encoded: cleanedMask
          },
          maskImageConfig: {
            maskMode: 'MASK_MODE_USER_PROVIDED',
            dilation: 0.0
          }
        } as any);
        parameters.editMode = editMode === 'inpainting-replace' 
          ? 'EDIT_MODE_INPAINT_REMOVAL' 
          : 'EDIT_MODE_INPAINT_INSERTION';
      }
      
      instance.referenceImages = referenceImages;
      parameters.aspectRatio = aspectRatio || '1:1';
    } else if (action === 'upscale') {
      const cleanedImage = image.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Upscaling on capability-001 requires referenceImages and a prompt
      instance.prompt = prompt || 'Clean and enhance image quality';
      instance.referenceImages = [
        {
          referenceId: 1,
          referenceType: 'REFERENCE_TYPE_RAW',
          referenceImage: {
            bytesBase64Encoded: cleanedImage
          }
        }
      ];
      
      parameters.upscaleConfig = {
        upscaleFactor: upscaleFactor === 4 || upscaleFactor === 'x4' ? 'x4' : 'x2'
      };
    }

    const response = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instances: [instance],
        parameters: parameters
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Vertex AI Imagen API request failed:', errText);
      return NextResponse.json({ 
        error: `Vertex AI Imagen API failed: ${response.statusText}. Ensure the Vertex AI API is enabled.` 
      }, { status: 502 });
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
    const fileName = `library/ai_image_${action}_${Date.now()}.webp`;
    const file = bucket.file(fileName);

    const buffer = Buffer.from(base64Str, 'base64');
    await file.save(buffer, {
      metadata: {
        contentType: 'image/webp',
        metadata: {
          generatedBy: 'Imagen 3 AI',
          action: action,
          prompt: prompt || 'Upscale/Edit'
        }
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;

    // Log Image Usage (Imagen cost wholesale: ~$0.03 per image operation)
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
      console.error('Error logging image usage:', logErr);
    }

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('Error in AI Image Studio API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
