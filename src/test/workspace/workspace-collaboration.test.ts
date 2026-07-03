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
const { ContextResolutionEngine } = require('../../lib/services/contextResolutionEngine');
const { WorkspaceRepository } = require('../../lib/db/workspaceRepository');
const { WorkspaceMembershipRepository } = require('../../lib/db/workspaceMembershipRepository');
const { WorkspaceBindingRepository } = require('../../lib/db/workspaceBindingRepository');
const { WorkspaceAuditEventRepository } = require('../../lib/db/workspaceAuditEventRepository');

async function runTests() {
  console.log('=== STARTING WORKSPACE COLLABORATION RUNTIME TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_owner_${testSuffix}`;
  const memberId = `pers_member_${testSuffix}`;
  const adminId = `pers_admin_${testSuffix}`;
  const nonAdminId = `pers_nonadmin_${testSuffix}`;
  const orgId = `org_test_${testSuffix}`;

  // Seeding test Person and Role documents in Platform Kernel
  console.log('Step 0: Seeding test profiles and role assignments...');
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `owner_${testSuffix}@example.com` });
  await adminDb.collection('people').doc(memberId).set({ id: memberId, email: `member_${testSuffix}@example.com` });
  await adminDb.collection('people').doc(adminId).set({ id: adminId, email: `admin_${testSuffix}@example.com` });
  await adminDb.collection('people').doc(nonAdminId).set({ id: nonAdminId, email: `nonadmin_${testSuffix}@example.com` });
  await adminDb.collection('organizations').doc(orgId).set({ id: orgId, name: 'Test Org' });

  // Make adminId a platform admin
  await adminDb.collection('role_assignments').doc(`rasg_admin_${testSuffix}`).set({
    id: `rasg_admin_${testSuffix}`,
    personId: adminId,
    roleId: 'role_admin',
    scopeType: 'platform',
    scopeId: 'platform',
    assignedAt: new Date().toISOString()
  });

  // Make nonAdminId a regular coordinator
  await adminDb.collection('role_assignments').doc(`rasg_coordinator_${testSuffix}`).set({
    id: `rasg_coordinator_${testSuffix}`,
    personId: nonAdminId,
    roleId: 'role_coordinator',
    scopeType: 'organization',
    scopeId: 'org_main',
    assignedAt: new Date().toISOString()
  });
  console.log('✓ Seeding complete.');

  let workspaceId = '';
  let memberMembershipId = '';

  // Test 1: Resolve owner context
  try {
    console.log('\nTest 1: Creating workspace and resolving Owner perspective...');
    workspaceId = await WorkspaceService.createWorkspace(ownerId, 'standard-itinerary', {
      privacy: 'private',
      allowAiAgents: false
    });

    // Bind Organization with default visibility
    await WorkspaceService.bindEntity(workspaceId, ownerId, 'Organization', orgId);

    const contextPkg = await ContextResolutionEngine.resolveContext({
      workspaceId,
      actorId: ownerId,
      channel: 'web'
    });

    if (contextPkg.perspective.role !== 'owner') throw new Error('Assertion failed: role is not owner');
    if (!contextPkg.perspective.allowedActions.includes('inviteMembers')) throw new Error('Assertion failed: owner should be able to invite members');
    if (!contextPkg.perspective.visibleModules.some(m => m.moduleId === 'budget')) throw new Error('Assertion failed: owner should see budget module');
    if (contextPkg.bindings.length !== 1) throw new Error('Assertion failed: missing bound organization binding');
    console.log('✓ Owner perspective resolved successfully with correct modules, actions, and bindings.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Resolve member context with visibility filters
  try {
    console.log('\nTest 2: Inviting and resolving Member perspective...');
    memberMembershipId = await WorkspaceService.inviteMember(workspaceId, ownerId, memberId, 'member');
    await WorkspaceService.acceptInvitation(memberMembershipId, memberId);

    const contextPkg = await ContextResolutionEngine.resolveContext({
      workspaceId,
      actorId: memberId,
      channel: 'mobile'
    });

    if (contextPkg.perspective.role !== 'member') throw new Error('Assertion failed: role is not member');
    if (contextPkg.perspective.allowedActions.includes('inviteMembers')) throw new Error('Assertion failed: member should not be allowed to invite');
    if (contextPkg.perspective.visibleModules.some(m => m.moduleId === 'budget')) throw new Error('Assertion failed: member should not see budget module');
    console.log('✓ Member perspective resolved correctly, filtering out budgets and administrative actions.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Binding visibility config namespace
  try {
    console.log('\nTest 3: Testing binding visibility constraints...');
    // Create a new binding restricted to owners and coordinators
    await WorkspaceService.bindEntity(workspaceId, ownerId, 'Person', adminId, {
      visibility: ['owner', 'coordinator']
    });

    // Owner should see both bindings
    const ownerPkg = await ContextResolutionEngine.resolveContext({ workspaceId, actorId: ownerId, channel: 'web' });
    if (ownerPkg.bindings.length !== 2) throw new Error('Assertion failed: owner should see both bindings');

    // Member should only see organization binding
    const memberPkg = await ContextResolutionEngine.resolveContext({ workspaceId, actorId: memberId, channel: 'web' });
    if (memberPkg.bindings.length !== 1) throw new Error('Assertion failed: member should not see restricted binding');
    console.log('✓ Binding visibility namespace successfully filtered out restricted items.');
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: Impersonation authorization guards
  try {
    console.log('\nTest 4: Testing impersonation authorization...');
    // Valid platform admin impersonating owner
    const validImpersonationPkg = await ContextResolutionEngine.resolveContext({
      workspaceId,
      actorId: ownerId,
      channel: 'api',
      impersonatorId: adminId
    });
    if (validImpersonationPkg.perspective.role !== 'owner') throw new Error('Assertion failed: impersonated role is not owner');
    console.log('  ✓ Authorized admin successfully impersonated owner.');

    // Non-admin attempting impersonation (must fail)
    try {
      await ContextResolutionEngine.resolveContext({
        workspaceId,
        actorId: ownerId,
        channel: 'api',
        impersonatorId: nonAdminId
      });
      throw new Error('Assertion failed: impersonation succeeded for a non-admin actor');
    } catch (err: any) {
      if (err.message.includes('Impersonator does not have Platform Admin permissions')) {
        console.log('  ✓ Non-admin impersonation request successfully blocked.');
      } else {
        throw err;
      }
    }
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Test 5: Workspace archiving read-only state
  try {
    console.log('\nTest 5: Testing archived workspace read-only state...');
    await WorkspaceService.archiveWorkspace(workspaceId, ownerId);

    const contextPkg = await ContextResolutionEngine.resolveContext({
      workspaceId,
      actorId: ownerId,
      channel: 'web'
    });

    if (contextPkg.perspective.allowedActions.length !== 0) throw new Error('Assertion failed: archived workspace allowed actions list must be empty');
    
    // Modules should be set to read-only state
    const chatModule = contextPkg.perspective.visibleModules.find(m => m.moduleId === 'chat');
    if (!chatModule || chatModule.state !== 'read-only') {
      throw new Error('Assertion failed: active modules must transition to read-only in archived workspaces');
    }
    console.log('✓ Archived workspace context correctly returned read-only modules and zero allowed actions.');
  } catch (err: any) {
    console.error('✗ Test 5 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 6: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
  await adminDb.collection('people').doc(memberId).delete();
  await adminDb.collection('people').doc(adminId).delete();
  await adminDb.collection('people').doc(nonAdminId).delete();
  await adminDb.collection('organizations').doc(orgId).delete();
  await adminDb.collection('role_assignments').doc(`rasg_admin_${testSuffix}`).delete();
  await adminDb.collection('role_assignments').doc(`rasg_coordinator_${testSuffix}`).delete();
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

  console.log('\n=== ALL COLLABORATION RUNTIME TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
