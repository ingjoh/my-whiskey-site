import { NextRequest, NextResponse } from 'next/server';
import { WorkspaceService } from '@/lib/services/workspaceService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, subdomain, ownerPersonId, adminEmail } = body;

    if (!ownerPersonId) {
      return NextResponse.json(
        { error: 'Missing required field: ownerPersonId' },
        { status: 400 }
      );
    }

    // Call service to provision the workspace
    const workspaceId = await WorkspaceService.createWorkspace(
      ownerPersonId,
      templateId,
      undefined,
      subdomain
    );

    return NextResponse.json({
      success: true,
      message: 'Workspace provisioned successfully',
      data: {
        workspaceId,
        templateId,
        subdomain,
        ownerPersonId,
        adminEmail
      }
    });

  } catch (error: any) {
    console.error('Error provisioning workspace:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
