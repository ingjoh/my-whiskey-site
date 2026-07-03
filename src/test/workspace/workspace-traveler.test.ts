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
const { ContextResolutionEngine } = require('../../lib/services/contextResolutionEngine');

async function runTests() {
  console.log('=== STARTING WORKSPACE TRAVELER E2E INTEGRATION TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const guestId = `pers_guest_${testSuffix}`;
  const ownerId = `pers_owner_${testSuffix}`;
  const workspaceId = `ws_traveler_${testSuffix}`;

  console.log('Step 0: Seeding test guest profiles...');
  await adminDb.collection('people').doc(guestId).set({ id: guestId, email: `guest_${testSuffix}@example.com` });
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `owner_${testSuffix}@example.com` });

  // Create workspace
  await WorkspaceService.createWorkspace(ownerId, 'traveler-planning-itinerary');

  // Find workspace document manually
  const snap = await adminDb.collection('workspaces').where('objectiveTemplate', '==', 'traveler-planning-itinerary').get();
  if (snap.empty) throw new Error('Assertion failed: workspace was not created successfully');
  const wsDoc = snap.docs[0].data();
  const wsId = wsDoc.id;

  // Invite guest as a regular member
  const membershipId = await WorkspaceService.inviteMember(wsId, ownerId, guestId, 'member');
  await WorkspaceService.acceptInvitation(membershipId, guestId);
  console.log(`✓ Guest successfully invited and joined as member in Workspace ${wsId}.`);

  // Test 1: Verify Traveler Context Resolution
  try {
    console.log('\nTest 1: Resolving context for traveler actor...');
    const contextPkg = await ContextResolutionEngine.resolveContext({
      workspaceId: wsId,
      actorId: guestId,
      channel: 'web'
    });

    // Check role is member
    if (contextPkg.perspective.role !== 'member') {
      throw new Error(`Expected role member, got ${contextPkg.perspective.role}`);
    }

    // Verify budget is hidden (not in visibleModules)
    const hasBudget = contextPkg.perspective.visibleModules.some(m => m.moduleId === 'budget');
    if (hasBudget) {
      throw new Error('Assertion failed: traveler should not see budget module');
    }
    console.log('  ✓ Verified budget module is successfully hidden from traveler.');

    // Verify admin actions are omitted
    const hasInvite = contextPkg.perspective.allowedActions.includes('inviteMembers');
    const hasBind = contextPkg.perspective.allowedActions.includes('bindEntity');
    if (hasInvite || hasBind) {
      throw new Error('Assertion failed: traveler should not possess administrative allowedActions');
    }
    console.log('  ✓ Verified administrative actions (inviteMembers, bindEntity) are successfully hidden.');

    // Verify allowed actions
    if (!contextPkg.perspective.allowedActions.includes('sendMessage')) {
      throw new Error('Expected traveler to have sendMessage capability');
    }
    console.log('  ✓ Verified traveler has standard collaboration capabilities.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 2: Cleaning up test documents...');
  await adminDb.collection('people').doc(guestId).delete();
  await adminDb.collection('people').doc(ownerId).delete();
  await adminDb.collection('workspaces').doc(wsId).delete();

  const mems = await adminDb.collection('workspace_memberships').where('workspaceId', '==', wsId).get();
  for (let m of mems.docs) {
    await adminDb.collection('workspace_memberships').doc(m.id).delete();
  }

  const audits = await adminDb.collection('workspace_audit_events').where('workspaceId', '==', wsId).get();
  for (let a of audits.docs) {
    await adminDb.collection('workspace_audit_events').doc(a.id).delete();
  }
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL TRAVELER PORTAL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
