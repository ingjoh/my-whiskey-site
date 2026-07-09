import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'Tuamotu2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const platformId = 'ws_platform_root';
    
    // 1. Seed Platform Workspace
    await adminDb.collection('workspaces').doc(platformId).set({
      id: platformId,
      type: 'platform',
      status: 'active',
      governance: { privacy: 'public', allowAiAgents: true, allowExternalInvites: true },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Seed Platform Config
    await adminDb.collection('workspace_configurations').doc(platformId).set({
      workspaceId: platformId,
      brand: { primaryColor: '#708C84', secondaryColor: '#B9783B' },
      website: { 
        subdomain: 'platform', 
        customDomain: 'tuamotu.life',
        layout: 'default',
        navigation: [
          { label: 'Home', link: '/' },
          { label: 'Charter Fleet', link: '/fleet' },
          { label: 'Experiences', link: '/experiences' }
        ]
      },
      identity: { name: 'Tuamotu Platform', contactEmail: 'info@tuamotu.life', operatorOrgId: 'org_platform_hq' }
    }, { merge: true });

    // 3. Seed Platform Page
    const platformHomeBlocks = {
      root: { id: 'root', type: 'Section', props: { style: { minHeight: '100px', padding: '4rem 2rem' } }, children: ['hero', 'grid'] },
      hero: { id: 'hero', type: 'Hero', props: { title: 'Welcome to Tuamotu', subtitle: 'Explore coastal adventures and luxury charters worldwide.' }, children: [] },
      grid: { id: 'grid', type: 'DataSource', props: { source: 'listings', renderer: 'grid' }, children: [] }
    };
    
    await adminDb.collection('pages').doc('page_platform_home').set({
      id: 'page_platform_home',
      workspaceId: platformId,
      slug: 'home',
      title: 'Tuamotu Marketplace',
      pageType: 'Home',
      blocks: platformHomeBlocks,
      nodes: platformHomeBlocks,
      status: 'published',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: 'Platform workspace seeded successfully on production database!' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
