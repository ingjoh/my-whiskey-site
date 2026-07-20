import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  ContextResolutionEngine,
  UnsupportedContextTypeError,
  ContextAccessDeniedError,
  ContextNotFoundError,
  ContextInvalidRequestError,
} from '@/lib/services/contextResolutionEngine';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header.' } },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err: any) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired credentials.' } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { context, clientType, surface, channel, locale } = body;

    // Validate request contract inputs
    if (!context || !context.type || !context.id) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Required context selection parameter missing.' } },
        { status: 400 }
      );
    }

    // Resolve Actor ID entirely server-side from JWT claims
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'User profile mapping not found. Onboard first.' } },
        { status: 404 }
      );
    }

    const personId = userDoc.data()?.personId;
    if (!personId) {
      return NextResponse.json(
        { error: { code: 'PROFILE_NOT_FOUND', message: 'Linked Person profile not found.' } },
        { status: 404 }
      );
    }

    // Resolve dynamic context package using the engine
    let resolved;
    try {
      resolved = await ContextResolutionEngine.resolve({
        actor: {
          type: 'person',
          id: personId,
        },
        context: {
          type: context.type,
          id: context.id,
        },
        presentationContext: {
          clientType,
          surface,
          channel,
          locale,
        },
      });
    } catch (err: any) {
      if (err instanceof UnsupportedContextTypeError) {
        return NextResponse.json(
          {
            error: {
              code: 'UNSUPPORTED_CONTEXT_TYPE',
              message: 'This context type is not currently supported.',
            },
          },
          { status: 400 }
        );
      }
      
      if (err instanceof ContextAccessDeniedError) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Access to this context is denied.',
            },
          },
          { status: 403 }
        );
      }

      if (err instanceof ContextNotFoundError) {
        return NextResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'The requested context was not found.',
            },
          },
          { status: 404 }
        );
      }

      if (err instanceof ContextInvalidRequestError) {
        return NextResponse.json(
          {
            error: {
              code: 'INVALID_PRESENTATION_CONTEXT',
              message: 'Presentation context validation failed.',
            },
          },
          { status: 400 }
        );
      }

      // Default fallback
      throw err;
    }

    return NextResponse.json(resolved);
  } catch (err: any) {
    console.error('Error resolving context in API:', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected internal error occurred.' } },
      { status: 500 }
    );
  }
}
