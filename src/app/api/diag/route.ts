import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WorkspaceResolver } from '@/lib/services/workspaceResolver';
import { getPlatformWorkspaceId } from '@/lib/db';

export async function GET() {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const xWorkspaceSlug = headersList.get('x-workspace-slug') || '';
  const xCustomDomain = headersList.get('x-custom-domain') || '';
  
  let resolvedWsId = 'unknown';
  let errMessage = '';
  try {
    resolvedWsId = await WorkspaceResolver.getActiveWorkspaceId();
  } catch (err: any) {
    errMessage = err.message;
  }

  let platformWsId = 'unknown';
  try {
    platformWsId = await getPlatformWorkspaceId();
  } catch (err: any) {
    platformWsId = `error: ${err.message}`;
  }

  return NextResponse.json({
    diagnostics: {
      host,
      xWorkspaceSlug,
      xCustomDomain,
      resolvedWsId,
      platformWsId,
      errMessage,
      VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
      NEXT_PUBLIC_PLATFORM_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'not set',
      FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'not set',
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT
    }
  });
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
