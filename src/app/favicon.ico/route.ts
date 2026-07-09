import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WorkspaceResolver } from '@/lib/services/workspaceResolver';
import { WorkspaceConfigurationRepository } from '@/lib/db/workspaceConfigurationRepository';
import { loadSiteSettings } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const hostname = host.split(':')[0]; // Strip port number if present
    
    let resolvedWorkspaceId: string | null = null;
    const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'tuamotu.life';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
    
    if (!isLocalhost && hostname !== platformDomain) {
      if (hostname.endsWith(`.${platformDomain}`)) {
        const subdomain = hostname.split('.')[0];
        const res = await WorkspaceResolver.resolveWorkspace(subdomain, false);
        resolvedWorkspaceId = res.workspaceId;
      } else {
        const res = await WorkspaceResolver.resolveWorkspace(hostname, true);
        resolvedWorkspaceId = res.workspaceId;
      }
    }
    
    const workspaceId = resolvedWorkspaceId || await WorkspaceResolver.getActiveWorkspaceId();
    let faviconUrl = '';
    
    if (workspaceId) {
      const config = await WorkspaceConfigurationRepository.findByWorkspaceId(workspaceId);
      if (config) {
        faviconUrl = (config.brand as any)?.faviconUrl || (config.extensibleSettings as any)?.brand?.faviconUrl || '';
      }
    }
    
    // Fallback to global site settings if not resolved or empty
    if (!faviconUrl) {
      const globalSettings = await loadSiteSettings();
      faviconUrl = globalSettings?.brand?.faviconUrl || globalSettings?.general?.faviconUrl || '';
    }
    
    if (faviconUrl) {
      const response = await fetch(faviconUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/x-icon';
        
        return new NextResponse(Buffer.from(arrayBuffer), {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, must-revalidate',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error resolving dynamic favicon:', error);
  }
  
  // Return a 404 response if no custom favicon matches, allowing default fallback
  return new NextResponse(null, { status: 404 });
}
