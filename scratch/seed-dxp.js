const fs = require('fs');
const path = require('path');

// Load env variables
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      if (match[1].trim() !== 'FIREBASE_SERVICE_ACCOUNT') {
        value = value.replace(/\\n/g, '\n');
      }
      process.env[match[1].trim()] = value;
    }
  });
}

const { adminDb } = require('../src/lib/firebase-admin');

async function runSeed() {
  console.log('=== SEEDING PLATFORM WORKSPACE & MIGRATING M/Y WHISKEY ===\n');

  // 1. Seed Platform Workspace
  const platformId = 'ws_platform_root';
  console.log(`Seeding Platform Workspace: ${platformId}...`);
  await adminDb.collection('workspaces').doc(platformId).set({
    id: platformId,
    type: 'platform',
    status: 'active',
    governance: { privacy: 'public', allowAiAgents: true, allowExternalInvites: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await adminDb.collection('workspace_configurations').doc(platformId).set({
    workspaceId: platformId,
    brand: { primaryColor: '#0EA5E9', secondaryColor: '#0F172A' },
    website: { subdomain: 'platform', navigation: [] },
    identity: { name: 'Tuamotu Platform', contactEmail: 'info@tuamotu.life' }
  }, { merge: true });

  // Seed default platform home page
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
  console.log('✓ Platform Workspace seeded.');

  // 2. Seed M/Y Whiskey Workspace
  const whiskeyId = 'ws_whiskey';
  console.log(`\nSeeding M/Y Whiskey Workspace: ${whiskeyId}...`);
  await adminDb.collection('workspaces').doc(whiskeyId).set({
    id: whiskeyId,
    type: 'operator',
    status: 'active',
    governance: { privacy: 'public', allowAiAgents: true, allowExternalInvites: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await adminDb.collection('workspace_configurations').doc(whiskeyId).set({
    workspaceId: whiskeyId,
    brand: { primaryColor: '#B9783B', secondaryColor: '#1E2124' },
    website: { subdomain: 'my-whiskey', navigation: [] },
    identity: { name: 'M/Y Whiskey', contactEmail: 'charter@motoryachtwhiskey.com' }
  }, { merge: true });

  // Migrate legacy page 'home' to relational 'ws_whiskey' page
  console.log('Migrating legacy home page to ws_whiskey_home relational PageDocument...');
  const legacyHomeSnap = await adminDb.collection('pages').doc('home').get();
  if (legacyHomeSnap.exists) {
    const legacyHomeData = legacyHomeSnap.data();
    await adminDb.collection('pages').doc('ws_whiskey_home').set({
      id: 'ws_whiskey_home',
      workspaceId: whiskeyId,
      slug: 'home',
      title: legacyHomeData.title || 'M/Y Whiskey',
      pageType: 'Home',
      blocks: legacyHomeData.nodes || legacyHomeData.blocks,
      nodes: legacyHomeData.nodes || legacyHomeData.blocks,
      status: 'published',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✓ M/Y Whiskey migrated successfully.');
  } else {
    console.warn('⚠️ Legacy home page document not found. Skipping migration.');
  }

  console.log('\n=== SEEDING AND MIGRATION COMPLETED SUCCESSFULLY ===');
}

runSeed().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});
