import { NextResponse } from 'next/server';
import { WorkspaceResolver } from '@/lib/services/workspaceResolver';

export async function GET() {
  try {
    const workspaceId = await WorkspaceResolver.getActiveWorkspaceId();
    return NextResponse.json({ workspaceId });
  } catch (error: any) {
    console.error('Error resolving active workspace via API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
