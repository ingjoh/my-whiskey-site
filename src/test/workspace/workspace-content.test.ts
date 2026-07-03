import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local first
const envPath = path.resolve(process.cwd(), '.env.local');
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

const { adminDb } = require('../../lib/firebase-admin');
const { loadPageDataRelational, savePageDataRelational, getPlatformWorkspaceId } = require('../../lib/db');

async function runTests() {
  console.log('=== STARTING PLATFORM CONTENT SYSTEM TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const platformWsId = `ws_platform_${testSuffix}`;
  const operatorWsId = `ws_operator_${testSuffix}`;

  console.log('Step 0: Seeding test environment...');
  
  // Create Platform Workspace and Operator Workspace
  await adminDb.collection('workspaces').doc(platformWsId).set({
    id: platformWsId,
    type: 'platform',
    status: 'active',
    governance: { privacy: 'public', allowAiAgents: true, allowExternalInvites: true }
  });
  
  await adminDb.collection('workspaces').doc(operatorWsId).set({
    id: operatorWsId,
    type: 'operator',
    status: 'active',
    governance: { privacy: 'shared', allowAiAgents: true, allowExternalInvites: true }
  });

  // Create Workspace Configurations with dynamic branding themes
  await adminDb.collection('workspace_configurations').doc(platformWsId).set({
    workspaceId: platformWsId,
    brand: { primaryColor: '#3B82F6', secondaryColor: '#1E293B' },
    website: { subdomain: `platform-${testSuffix}`, navigation: [] },
    identity: { name: 'Platform Central', contactEmail: 'admin@tuamotu.life' }
  });

  await adminDb.collection('workspace_configurations').doc(operatorWsId).set({
    workspaceId: operatorWsId,
    brand: { primaryColor: '#EC4899', secondaryColor: '#4C1D95' },
    website: { subdomain: `operator-${testSuffix}`, navigation: [] },
    identity: { name: 'Operator Yacht', contactEmail: 'operator@tuamotu.life' }
  });
  console.log('✓ Seeding complete.');

  // Test 1: Resolve Platform Workspace ID via metadata (no magic IDs)
  try {
    console.log('\nTest 1: Resolving platform workspace dynamically...');
    const resolvedId = await getPlatformWorkspaceId();
    // Since getPlatformWorkspaceId returns the first workspace matching type === 'platform'
    // It should find our seeded platformWsId or the production one
    if (!resolvedId) {
      throw new Error('Failed to resolve platform workspace ID');
    }
    console.log(`  ✓ Successfully resolved Platform Workspace ID: ${resolvedId}`);
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Save and Load Relational Pages for Platform Workspace
  try {
    console.log('\nTest 2: Saving and loading platform home page...');
    const testBlocks = {
      root: { id: 'root', type: 'Section', props: { style: {} }, children: ['block_1'] },
      block_1: { id: 'block_1', type: 'DataSource', props: { source: 'listings', renderer: 'grid' }, children: [] }
    };
    
    await savePageDataRelational(platformWsId, 'home', testBlocks, 'Platform Marketplace Home', 'Home');

    const pageData = await loadPageDataRelational(platformWsId, 'home');
    if (!pageData) throw new Error('PageDocument not found');
    if (pageData.title !== 'Platform Marketplace Home') {
      throw new Error(`Expected title 'Platform Marketplace Home', got '${pageData.title}'`);
    }
    if (!pageData.nodes.block_1 || pageData.nodes.block_1.type !== 'DataSource') {
      throw new Error('DataSource block not saved or resolved correctly');
    }
    // Verify theme inherited from workspace configuration
    if (pageData.theme.primaryColor !== '#3B82F6') {
      throw new Error(`Expected theme primaryColor '#3B82F6', got '${pageData.theme.primaryColor}'`);
    }
    console.log('  ✓ Relational page saved, theme inherited, and blocks retrieved successfully.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Save and Load Relational Pages for Operator Workspace (Decoupled CMS context)
  try {
    console.log('\nTest 3: Saving and loading operator about page...');
    const operatorBlocks = {
      root: { id: 'root', type: 'Section', props: { style: {} }, children: ['hero'] },
      hero: { id: 'hero', type: 'Hero', props: { title: 'Welcome to Operator!' }, children: [] }
    };
    
    await savePageDataRelational(operatorWsId, 'about', operatorBlocks, 'About Operator', 'Content');

    const pageData = await loadPageDataRelational(operatorWsId, 'about');
    if (!pageData) throw new Error('Operator page not found');
    if (pageData.title !== 'About Operator') {
      throw new Error(`Expected title 'About Operator', got '${pageData.title}'`);
    }
    if (pageData.theme.primaryColor !== '#EC4899') {
      throw new Error(`Expected theme primaryColor '#EC4899', got '${pageData.theme.primaryColor}'`);
    }
    console.log('  ✓ Operator pages resolved using identical CMS primitives.');
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: Backward Compatibility Fallbacks
  try {
    console.log('\nTest 4: Checking backward compatibility fallback...');
    // ws_whiskey home page resolves back to legacy document ID 'home' if no relational match
    const pageData = await loadPageDataRelational('ws_whiskey', 'home');
    if (!pageData || !pageData.nodes.root) {
      throw new Error('Failed to resolve M/Y Whiskey fallback page');
    }
    console.log('  ✓ Fallback query successfully retrieved M/Y Whiskey legacy page.');
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 5: Cleaning up test documents...');
  await adminDb.collection('workspaces').doc(platformWsId).delete();
  await adminDb.collection('workspaces').doc(operatorWsId).delete();
  await adminDb.collection('workspace_configurations').doc(platformWsId).delete();
  await adminDb.collection('workspace_configurations').doc(operatorWsId).delete();
  
  const pages = await adminDb.collection('pages').where('workspaceId', 'in', [platformWsId, operatorWsId]).get();
  for (let p of pages.docs) {
    await adminDb.collection('pages').doc(p.id).delete();
  }
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL PLATFORM CONTENT SYSTEM TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
