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

// Now load database services and controllers
const { adminDb } = require('../../lib/firebase-admin');
const { WorkspaceService } = require('../../lib/services/workspaceService');
const { WorkspaceRepository } = require('../../lib/db/workspaceRepository');
const { WorkspaceMembershipRepository } = require('../../lib/db/workspaceMembershipRepository');
const { WorkspaceBindingRepository } = require('../../lib/db/workspaceBindingRepository');
const { WorkspaceAuditEventRepository } = require('../../lib/db/workspaceAuditEventRepository');

async function runTests() {
  console.log('=== STARTING WORKSPACE FOUNDATION INTEGRATION TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_owner_${testSuffix}`;
  const inviteeId = `pers_invitee_${testSuffix}`;
  const invalidPersonId = `pers_nonexistent_${testSuffix}`;
  const orgId = `org_test_${testSuffix}`;

  // Seeding test Person documents in Platform Kernel
  console.log('Step 0: Seeding test platform kernel entities...');
  await adminDb.collection('people').doc(ownerId).set({
    id: ownerId,
    email: `owner_${testSuffix}@example.com`,
    firstName: 'Owner',
    lastName: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await adminDb.collection('people').doc(inviteeId).set({
    id: inviteeId,
    email: `invitee_${testSuffix}@example.com`,
    firstName: 'Invitee',
    lastName: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  await adminDb.collection('organizations').doc(orgId).set({
    id: orgId,
    name: `Test Org ${testSuffix}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log('✓ Seeding complete.');

  let workspaceId = '';
  let membershipId = '';

  // Test 1: Workspace creation
  try {
    console.log('\nTest 1: Creating Workspace...');
    workspaceId = await WorkspaceService.createWorkspace(ownerId, 'test-template', {
      privacy: 'private',
      allowAiAgents: true
    });
    console.log(`✓ Workspace created successfully: ${workspaceId}`);
    
    // Verify document exists
    const ws = await WorkspaceRepository.findById(workspaceId);
    if (!ws) throw new Error('Assertion failed: workspace document not found in DB');
    if (ws.status !== 'provisioning') throw new Error('Assertion failed: status is not provisioning');
    console.log('✓ Verified core workspace document.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Membership creation (invitation)
  try {
    console.log('\nTest 2: Inviting member...');
    membershipId = await WorkspaceService.inviteMember(workspaceId, ownerId, inviteeId, 'member');
    console.log(`✓ Invitation membership record created: ${membershipId}`);

    const mem = await WorkspaceMembershipRepository.findById(membershipId);
    if (!mem) throw new Error('Assertion failed: membership document not found');
    if (mem.status !== 'pending') throw new Error('Assertion failed: membership status should be pending');
    console.log('✓ Verified membership pending status.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Invite non-existent person (must fail)
  try {
    console.log('\nTest 3: Inviting non-existent person (expecting failure)...');
    await WorkspaceService.inviteMember(workspaceId, ownerId, invalidPersonId, 'member');
    throw new Error('Assertion failed: invitation succeeded for a non-existent person');
  } catch (err: any) {
    if (err.message.includes('does not exist in Platform Kernel')) {
      console.log('✓ Successfully blocked invitation of non-existent Person.');
    } else {
      console.error('✗ Test 3 failed with unexpected error:', err.message);
      process.exit(1);
    }
  }

  // Test 4: Accepting invitation
  try {
    console.log('\nTest 4: Accepting invitation...');
    await WorkspaceService.acceptInvitation(membershipId, inviteeId);
    
    const mem = await WorkspaceMembershipRepository.findById(membershipId);
    if (!mem || mem.status !== 'active') throw new Error('Assertion failed: membership should be active');
    console.log('✓ Invitation successfully accepted and active.');
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Test 5: Dynamic Entity Binding against index.yaml
  try {
    console.log('\nTest 5: Binding Organization (registered in Platform Registry)...');
    const bindingId = await WorkspaceService.bindEntity(workspaceId, ownerId, 'Organization', orgId);
    console.log(`✓ Successfully bound entity: ${bindingId}`);

    const bind = await WorkspaceBindingRepository.findById(bindingId);
    if (!bind) throw new Error('Assertion failed: binding document not found');
    console.log('✓ Verified binding record exists in DB.');
  } catch (err: any) {
    console.error('✗ Test 5 failed:', err.message);
    process.exit(1);
  }

  // Test 6: Binding unregistered concept (must fail)
  try {
    console.log('\nTest 6: Binding unregistered concept type (expecting failure)...');
    await WorkspaceService.bindEntity(workspaceId, ownerId, 'NonexistentConcept', 'some_id');
    throw new Error('Assertion failed: binding succeeded for an unregistered concept type');
  } catch (err: any) {
    if (err.message.includes('not registered in Platform Registry')) {
      console.log('✓ Successfully blocked binding of unregistered concept.');
    } else {
      console.error('✗ Test 6 failed with unexpected error:', err.message);
      process.exit(1);
    }
  }

  // Test 7: Verify append-only audit events
  try {
    console.log('\nTest 7: Verifying append-only audit trail logs...');
    const logs = await WorkspaceAuditEventRepository.listByWorkspace(workspaceId);
    console.log(`Total audit logs retrieved: ${logs.length}`);
    if (logs.length < 4) throw new Error('Assertion failed: missing audit events');
    
    console.log('Audit events recorded:');
    logs.forEach(log => {
      console.log(`  - [${log.timestamp}] [${log.eventType}] by ${log.actorId}`);
    });
    console.log('✓ Audit trail verified.');
  } catch (err: any) {
    console.error('✗ Test 7 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 8: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
  await adminDb.collection('people').doc(inviteeId).delete();
  await adminDb.collection('organizations').doc(orgId).delete();
  await adminDb.collection('workspaces').doc(workspaceId).delete();
  
  const mems = await WorkspaceMembershipRepository.listByWorkspace(workspaceId);
  for (let m of mems) {
    await adminDb.collection('workspace_memberships').doc(m.id).delete();
  }

  const binds = await WorkspaceBindingRepository.listByWorkspace(workspaceId);
  for (let b of binds) {
    await WorkspaceBindingRepository.delete(b.id);
  }

  const audits = await WorkspaceAuditEventRepository.listByWorkspace(workspaceId);
  for (let a of audits) {
    await adminDb.collection('workspace_audit_events').doc(a.id).delete();
  }
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
