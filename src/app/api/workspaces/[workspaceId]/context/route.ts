import { NextRequest, NextResponse } from 'next/server';
import { ContextResolutionEngine } from '@/lib/services/contextResolutionEngine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await params;
    const body = await request.json().catch(() => ({}));
    const { actorId, channel, locale, impersonatorId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing required path parameter: workspaceId.' },
        { status: 400 }
      );
    }

    if (!actorId || !channel) {
      return NextResponse.json(
        { error: 'Missing required request body fields: actorId and channel are required.' },
        { status: 400 }
      );
    }

    const resolved = await ContextResolutionEngine.resolveContext({
      workspaceId,
      actorId,
      channel,
      locale,
      impersonatorId
    });

    return NextResponse.json(resolved);
  } catch (error: any) {
    console.error(`Error resolving workspace context for workspaceId:`, error);
    
    // Check if error is due to authorization permissions
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
