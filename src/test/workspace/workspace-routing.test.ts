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
const { WorkspaceService } = require('../../lib/services/workspaceService');
const { WorkspaceRepository } = require('../../lib/db/workspaceRepository');
const { WorkspaceConfigurationRepository } = require('../../lib/db/workspaceConfigurationRepository');
const { WorkspaceResolver } = require('../../lib/services/workspaceResolver');

async function runTests() {
  console.log('=== STARTING WORKSPACE DOMAIN ROUTING TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_route_${testSuffix}`;
  let wsId = '';

  console.log('Step 0: Seeding test environment...');
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `route_admin_${testSuffix}@example.com` });
  
  // Provision a new workspace with custom subdomain and branding
  wsId = await WorkspaceService.createWorkspace(
    ownerId,
    'wt_business',
    undefined,
    `route-sub-${testSuffix}`
  );
  
  // Verify setup
  const ws = await WorkspaceRepository.findById(wsId);
  if (!ws) throw new Error('Workspace document not created');
  
  // Bind a custom domain
  await WorkspaceConfigurationRepository.update(wsId, {
    'website.customDomain': `my-custom-domain-${testSuffix}.com`
  });
  console.log('✓ Seeding complete.');

  // Test 1: Resolve Workspace Subdomain
  try {
    console.log('\nTest 1: Resolving subdomain...');
    const res = await WorkspaceResolver.resolveWorkspace(`route-sub-${testSuffix}`, false);
    if (res.workspaceId !== wsId) {
      throw new Error(`Expected workspaceId ${wsId}, got ${res.workspaceId}`);
    }
    if (res.subdomain !== `route-sub-${testSuffix}`) {
      throw new Error(`Expected subdomain, got ${res.subdomain}`);
    }
    console.log('  ✓ Successfully resolved workspace slug subdomain.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Resolve Custom Domain
  try {
    console.log('\nTest 2: Resolving custom domain...');
    const res = await WorkspaceResolver.resolveWorkspace(`my-custom-domain-${testSuffix}.com`, true);
    if (res.workspaceId !== wsId) {
      throw new Error(`Expected workspaceId ${wsId}, got ${res.workspaceId}`);
    }
    if (res.customDomain !== `my-custom-domain-${testSuffix}.com`) {
      throw new Error(`Expected customDomain, got ${res.customDomain}`);
    }
    console.log('  ✓ Successfully resolved workspace custom domain mapping.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Protect Reserved Subdomains
  try {
    console.log('\nTest 3: Resolving reserved subdomain...');
    const res = await WorkspaceResolver.resolveWorkspace('admin', false);
    if (res.workspaceId !== null) {
      throw new Error(`Expected null workspaceId for reserved domain, got ${res.workspaceId}`);
    }
    console.log('  ✓ Successfully protected reserved subdomains from tenant mapping.');
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: Suspended Workspace Check
  try {
    console.log('\nTest 4: Resolving suspended subdomain...');
    await WorkspaceRepository.update(wsId, { status: 'suspended' });
    
    const res = await WorkspaceResolver.resolveWorkspace(`route-sub-${testSuffix}`, false);
    if (res.error !== 'Workspace is suspended') {
      throw new Error(`Expected suspension error, got ${res.error}`);
    }
    console.log('  ✓ Successfully blocked suspended workspace resolution.');
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 5: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
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
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL DOMAIN ROUTING TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
