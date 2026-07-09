import { NextRequest, NextResponse } from 'next/server';
import { DomainService } from '@/lib/services/domainService';
import { WorkspaceConfigurationRepository } from '@/lib/db/workspaceConfigurationRepository';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyUserIsWorkspaceAdmin(request: NextRequest, workspaceId: string): Promise<boolean> {
  // Allow local development fallback if credentials are not fully seeded
  if (process.env.NODE_ENV === 'development' && !process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('[Auth] Local development bypass for workspace domain management.');
    return true;
  }

  const token = request.cookies.get('firebase_token')?.value;
  if (!token) return false;

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Resolve personId from users mapping
    let personId = userId;
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (userDoc.exists) {
      personId = userDoc.data()?.personId || userId;
    }

    // 1. Check workspace_memberships
    const membershipSnap = await adminDb.collection('workspace_memberships')
      .where('workspaceId', '==', workspaceId)
      .where('personId', '==', personId)
      .get();

    if (!membershipSnap.empty) {
      const membership = membershipSnap.docs[0].data();
      if (['owner', 'coordinator'].includes(membership.role) && membership.status === 'active') {
        return true;
      }
    }

    // 2. Fallback: Check organization-level role assignments
    const configSnap = await adminDb.collection('workspace_configurations').doc(workspaceId).get();
    if (configSnap.exists) {
      const configData = configSnap.data();
      const orgId = configData?.identity?.operatorOrgId || 'org-whiskey';

      const roleSnap = await adminDb.collection('role_assignments')
        .where('personId', '==', personId)
        .where('scopeId', '==', orgId)
        .limit(1)
        .get();

      if (!roleSnap.empty) {
        const roleData = roleSnap.docs[0].data();
        const roleId = roleData.roleId || '';
        if (roleId === 'role_owner' || roleId === 'role_admin' || roleId.includes('owner') || roleId.includes('admin')) {
          return true;
        }
      }
    }

    // 3. Fallback: Check platform admin role assignments
    const platformSnap = await adminDb.collection('role_assignments')
      .where('personId', '==', personId)
      .where('scopeType', '==', 'platform')
      .get();

    if (!platformSnap.empty) {
      const isPlatformAdmin = platformSnap.docs.some(doc => {
        const roleId = doc.data().roleId || '';
        return roleId === 'role_admin' || roleId === 'role_super_admin' || roleId.includes('admin');
      });
      if (isPlatformAdmin) return true;
    }

    return false;
  } catch (err) {
    console.error('[Auth] Token verification failed:', err);
    return false;
  }
}

/**
   * POST: Registers a custom domain with Vercel and updates WorkspaceConfiguration
   */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, customDomain } = body;

    if (!workspaceId || !customDomain) {
      return NextResponse.json({ error: 'Missing required fields: workspaceId, customDomain' }, { status: 400 });
    }

    const isAuthorized = await verifyUserIsWorkspaceAdmin(request, workspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Call Vercel API to register custom domain
    const vercelRes = await DomainService.registerCustomDomain(customDomain);

    // 2. Update Firestore WorkspaceConfiguration with target domain and verification records
    await WorkspaceConfigurationRepository.update(workspaceId, {
      'website.customDomain': customDomain,
      'extensibleSettings.dnsVerification': {
        verified: vercelRes.verified,
        verificationRecords: vercelRes.verification || [],
        lastChecked: new Date().toISOString(),
      }
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Custom domain registered successfully.',
      data: vercelRes
    });
  } catch (error: any) {
    console.error('Error in POST /api/workspaces/domains:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * GET: Checks the verification status of a domain on Vercel and updates the DB
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const customDomain = searchParams.get('customDomain');

    if (!workspaceId || !customDomain) {
      return NextResponse.json({ error: 'Missing required query parameters: workspaceId, customDomain' }, { status: 400 });
    }

    const isAuthorized = await verifyUserIsWorkspaceAdmin(request, workspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Fetch domain state from Vercel
    const vercelRes = await DomainService.checkVerificationStatus(customDomain);

    // 2. Sync verified state to Firestore
    await WorkspaceConfigurationRepository.update(workspaceId, {
      'extensibleSettings.dnsVerification': {
        verified: vercelRes.verified,
        verificationRecords: vercelRes.verification || [],
        lastChecked: new Date().toISOString(),
      }
    } as any);

    return NextResponse.json({
      success: true,
      message: 'Verification status updated successfully.',
      data: vercelRes
    });
  } catch (error: any) {
    console.error('Error in GET /api/workspaces/domains:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE: Removes custom domain mapping from Vercel and WorkspaceConfiguration
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, customDomain } = body;

    if (!workspaceId || !customDomain) {
      return NextResponse.json({ error: 'Missing required fields: workspaceId, customDomain' }, { status: 400 });
    }

    const isAuthorized = await verifyUserIsWorkspaceAdmin(request, workspaceId);
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 1. Call Vercel API to remove mapping
    await DomainService.removeCustomDomain(customDomain);

    // 2. Remove domain references from Firestore
    // Using adminDb directly to perform a field deletion or update to undefined/null
    await adminDb.collection('workspace_configurations').doc(workspaceId).update({
      'website.customDomain': null,
      'extensibleSettings.dnsVerification': null
    });

    return NextResponse.json({
      success: true,
      message: 'Custom domain removed successfully.'
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/workspaces/domains:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
