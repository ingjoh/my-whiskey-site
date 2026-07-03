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

// Ensure firebase is initialized
const { adminDb } = require('../../lib/firebase-admin');
const { WorkspaceService } = require('../../lib/services/workspaceService');
const { WorkspaceRepository } = require('../../lib/db/workspaceRepository');
const { WorkspaceConfigurationRepository } = require('../../lib/db/workspaceConfigurationRepository');
const { ContextResolutionEngine } = require('../../lib/services/contextResolutionEngine');

async function runTests() {
  console.log('=== STARTING WORKSPACE TEMPLATE PROVISIONING TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_prov_${testSuffix}`;
  let wsId1 = '';
  let wsId2 = '';

  console.log('Step 0: Seeding admin person...');
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `prov_admin_${testSuffix}@example.com` });
  console.log('✓ Seeding complete.');

  // Test 1: Provision Business Workspace Template
  try {
    console.log('\nTest 1: Provisioning wt_business workspace...');
    wsId1 = await WorkspaceService.createWorkspace(
      ownerId,
      'wt_business',
      undefined,
      `sub-biz-${testSuffix}`
    );

    // Verify Workspace Document
    const ws = await WorkspaceRepository.findById(wsId1);
    if (!ws) throw new Error('Workspace document not created');
    if (ws.status !== 'provisioning') throw new Error(`Expected provisioning state, got ${ws.status}`);
    if (!ws.modules || !ws.modules.includes('budget') || !ws.modules.includes('chat')) {
      throw new Error(`Expected modules to include budget/chat, got ${JSON.stringify(ws.modules)}`);
    }
    console.log('  ✓ Verified workspace modules clong from template wt_business.');

    // Verify Workspace Configuration Aggregate
    const config = await WorkspaceConfigurationRepository.findByWorkspaceId(wsId1);
    if (!config) throw new Error('WorkspaceConfiguration document not created');
    if (config.brand.primaryColor !== '#D8C7AF') {
      throw new Error(`Expected primaryColor #D8C7AF, got ${config.brand.primaryColor}`);
    }
    if (config.website.subdomain !== `sub-biz-${testSuffix}`) {
      throw new Error(`Expected subdomain sub-biz-${testSuffix}, got ${config.website.subdomain}`);
    }
    console.log('  ✓ Verified WorkspaceConfiguration contains independent Brand and Website settings.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Provision Collaboration Workspace Template
  try {
    console.log('\nTest 2: Provisioning wt_collaboration workspace...');
    wsId2 = await WorkspaceService.createWorkspace(
      ownerId,
      'wt_collaboration',
      undefined,
      `sub-collab-${testSuffix}`
    );

    const ws = await WorkspaceRepository.findById(wsId2);
    if (!ws) throw new Error('Workspace document not created');
    if (!ws.modules || !ws.modules.includes('voting') || ws.modules.includes('budget')) {
      throw new Error(`Expected modules to include voting and omit budget, got ${JSON.stringify(ws.modules)}`);
    }
    console.log('  ✓ Verified modules clone correctly from wt_collaboration.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Verify Administrative Lifecycle Suspension Check
  try {
    console.log('\nTest 3: Testing context resolution of suspended workspace...');
    
    // Suspend workspace 1
    await WorkspaceRepository.update(wsId1, { status: 'suspended' });
    
    // Attempt context resolution (expecting rejection)
    let threw = false;
    try {
      await ContextResolutionEngine.resolveContext({
        workspaceId: wsId1,
        actorId: ownerId,
        channel: 'web'
      });
    } catch (err: any) {
      if (err.message.includes('suspended')) {
        threw = true;
      } else {
        console.error('  Unexpected error during resolution:', err.message);
      }
    }

    if (!threw) {
      throw new Error('Assertion failed: context resolution succeeded for suspended workspace');
    }
    console.log('  ✓ Verified suspended status blocks context resolution successfully.');
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 4: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
  
  for (let wsId of [wsId1, wsId2]) {
    await adminDb.collection('workspaces').doc(wsId).delete();
    await adminDb.collection('workspace_configurations').doc(wsId).delete();
    
    const mems = await adminDb.collection('workspace_memberships').where('workspaceId', '==', wsId).get();
    for (let m of mems.docs) {
      await adminDb.collection('workspace_memberships').doc(m.id).delete();
    }
    
    const audits = await adminDb.collection('workspace_audit_events').where('workspaceId', '==', wsId).get();
    for (let a of audits.docs) {
      await adminDb.collection('workspace_audit_events').doc(a.id).delete();
    }
  }
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL PROVISIONING TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
