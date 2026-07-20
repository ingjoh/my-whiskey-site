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

const { adminDb, adminAuth } = require('../../lib/firebase-admin');
const { ContextResolutionEngine } = require('../../lib/services/contextResolutionEngine');
const crypto = require('crypto');

// Import Route Handlers
const resolveApi = require('../../app/api/identity/resolve/route');
const discoveryApi = require('../../app/api/identity/context-discovery/route');

// Helper to mock NextRequest properties
const mockRequest = (token: string, bodyObj: any = {}) => {
  return {
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'authorization') {
          return `Bearer ${token}`;
        }
        return null;
      }
    },
    json: async () => bodyObj
  } as any;
};

async function runTests() {
  console.log('=== STARTING PERSON-CENTRIC IDENTITY FOUNDATION TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const user1Token = `token-user1-${testSuffix}`;
  const user1Uid = `uid-user1-${testSuffix}`;
  const user1Email = `user1_${testSuffix}@example.com`;
  
  const user2Token = `token-user2-${testSuffix}`;
  const user2Uid = `uid-user2-${testSuffix}`;
  const user2Email = `duplicate_${testSuffix}@example.com`;

  const user3Token = `token-user3-${testSuffix}`;
  const user3Uid = `uid-user3-${testSuffix}`;
  const user3Email = `invitee_${testSuffix}@example.com`;

  const unverifiedToken = `token-unverified-${testSuffix}`;
  const unverifiedUid = `uid-unverified-${testSuffix}`;
  const unverifiedEmail = `unverified_${testSuffix}@example.com`;

  // Mock verifyIdToken behavior dynamically
  adminAuth.verifyIdToken = async (token: string) => {
    if (token === user1Token) {
      return { uid: user1Uid, email: user1Email, email_verified: true, name: 'User One' };
    }
    if (token === user2Token) {
      return { uid: user2Uid, email: user2Email, email_verified: true, name: 'User Two' };
    }
    if (token === user3Token) {
      return { uid: user3Uid, email: user3Email, email_verified: true, name: 'User Three' };
    }
    if (token === unverifiedToken) {
      return { uid: unverifiedUid, email: unverifiedEmail, email_verified: false, name: 'Unverified User' };
    }
    throw new Error('Mock authentication failed: Invalid token');
  };

  // Pre-seed duplicates and workspace mock data
  console.log('Step 0: Seeding test environment...');
  const existingPersonId = `pers_existing_${testSuffix}`;
  await adminDb.collection('people').doc(existingPersonId).set({
    id: existingPersonId,
    email: user2Email,
    firstName: 'Pre-existing',
    lastName: 'Person',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const workspaceId = `ws_test_${testSuffix}`;
  await adminDb.collection('workspaces').doc(workspaceId).set({
    id: workspaceId,
    name: 'Test Yacht Operations',
    status: 'active',
    governance: { privacy: 'private', allowAiAgents: true },
    modules: ['chat', 'calendar'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Seed Invitation
  const rawInvitationToken = `invite-token-${testSuffix}`;
  const invitationTokenHash = crypto.createHash('sha256').update(rawInvitationToken).digest('hex');
  const invitationId = `wsi_test_${testSuffix}`;
  await adminDb.collection('workspace_invitations').doc(invitationId).set({
    id: invitationId,
    workspaceId: workspaceId,
    email: user3Email,
    role: 'coordinator',
    status: 'pending',
    tokenHash: invitationTokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    consumedAt: null,
    revoked: false,
    createdAt: new Date().toISOString()
  });
  console.log('✓ Seeding complete.');

  // Test 1: Idempotent onboarding creation
  let person1Id = '';
  try {
    console.log('\nTest 1: Onboarding User 1 (new identity)...');
    const req = mockRequest(user1Token);
    const response = await resolveApi.POST(req);
    const body = await response.json();
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(body)}`);
    }

    person1Id = body.person.id;
    if (body.user.personId !== person1Id) {
      throw new Error('User does not link to Person ID');
    }
    console.log(`  ✓ Successfully resolution User/Person pair: PersonID=${person1Id}`);

    // Verify idempotency
    const duplicateResponse = await resolveApi.POST(req);
    const duplicateBody = await duplicateResponse.json();
    if (duplicateBody.person.id !== person1Id) {
      throw new Error('Idempotency failed: New Person record created on secondary request');
    }
    console.log('  ✓ Verified resolve is idempotent.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: No Silent Email Merging
  try {
    console.log('\nTest 2: Resolving email matching pre-existing Person (User 2)...');
    const req = mockRequest(user2Token);
    const response = await resolveApi.POST(req);
    const body = await response.json();

    if (body.person.id === existingPersonId) {
      throw new Error('Assertion failed: Silently linked user to pre-existing Person by email alone!');
    }
    if (body.person.duplicateFlagged !== true) {
      throw new Error('Assertion failed: Duplicate email warning flag not set');
    }
    console.log(`  ✓ Blocked silent merge. New Person created: ${body.person.id} (duplicateFlagged: true)`);
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Signed Invitation verification and single-use consumption lock
  let person3Id = '';
  try {
    console.log('\nTest 3: Onboarding User 3 with valid invitation token...');
    const req = mockRequest(user3Token, { invitationToken: rawInvitationToken });
    const response = await resolveApi.POST(req);
    const body = await response.json();

    if (response.status !== 200) {
      throw new Error(`Resolution failed: ${JSON.stringify(body)}`);
    }

    person3Id = body.person.id;
    
    // Verify invitation is consumed
    const inviteSnap = await adminDb.collection('workspace_invitations').doc(invitationId).get();
    const inviteData = inviteSnap.data();
    if (inviteData.status !== 'accepted' || !inviteData.consumedAt) {
      throw new Error('Invitation status not updated to accepted / consumed');
    }

    console.log('  ✓ Consumed invitation securely, linked Person, and provisioned Workspace Membership.');

    // Test single-use replay prevention: try to resolve again with same token for another user
    console.log('Testing single-use replay protection...');
    const replayToken = `token-replay-${testSuffix}`;
    const replayUid = `uid-replay-${testSuffix}`;
    adminAuth.verifyIdToken = async (t: string) => {
      if (t === replayToken) return { uid: replayUid, email: user3Email, email_verified: true, name: 'Replay Attacker' };
      throw new Error('Auth fail');
    };

    const replayReq = mockRequest(replayToken, { invitationToken: rawInvitationToken });
    const replayResponse = await resolveApi.POST(replayReq);
    const replayBody = await replayResponse.json();

    // Verify that the replay attacker did NOT get workspace membership
    const membershipsSnap = await adminDb.collection('workspace_memberships')
      .where('personId', '==', replayBody.person.id)
      .where('workspaceId', '==', workspaceId)
      .get();

    if (!membershipsSnap.empty) {
      throw new Error('Security vulnerability: Replayed invitation token successfully created duplicate membership!');
    }

    console.log('  ✓ Verified: Replaying consumed invitation token blocks membership creation.');
    
    // Clean up replay user
    await adminDb.collection('users').doc(replayUid).delete();
    await adminDb.collection('people').doc(replayBody.person.id).delete();
    
    // Restore primary mocks
    adminAuth.verifyIdToken = async (token: string) => {
      if (token === user1Token) return { uid: user1Uid, email: user1Email, email_verified: true, name: 'User One' };
      if (token === user2Token) return { uid: user2Uid, email: user2Email, email_verified: true, name: 'User Two' };
      if (token === user3Token) return { uid: user3Uid, email: user3Email, email_verified: true, name: 'User Three' };
      if (token === unverifiedToken) return { uid: unverifiedUid, email: unverifiedEmail, email_verified: false, name: 'Unverified User' };
      throw new Error('Mock authentication failed: Invalid token');
    };
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: Context Discovery & Verification Gate
  try {
    console.log('\nTest 4: Context discovery verification guards...');
    
    const pendingInviteId = `wsi_pending_${testSuffix}`;
    const pendingTokenHash = crypto.createHash('sha256').update(`token-pending-${testSuffix}`).digest('hex');
    await adminDb.collection('workspace_invitations').doc(pendingInviteId).set({
      id: pendingInviteId,
      workspaceId: workspaceId,
      email: unverifiedEmail,
      role: 'member',
      status: 'pending',
      tokenHash: pendingTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      consumedAt: null,
      revoked: false,
      createdAt: new Date().toISOString()
    });

    await resolveApi.POST(mockRequest(unverifiedToken));

    const reqUnverified = mockRequest(unverifiedToken);
    const resUnverified = await discoveryApi.GET(reqUnverified);
    const bodyUnverified = await resUnverified.json();

    if (bodyUnverified.pendingInvitations.length > 0) {
      throw new Error('Security vulnerability: Exposed pending invitations to an unverified email session!');
    }
    console.log('  ✓ Verified: Unverified email sessions cannot discover invitations.');

    const reqVerified = mockRequest(user3Token);
    const resVerified = await discoveryApi.GET(reqVerified);
    const bodyVerified = await resVerified.json();

    if (bodyVerified.workspaces.length === 0 || bodyVerified.workspaces[0].workspaceId !== workspaceId) {
      throw new Error('Failed to discover active workspaces');
    }
    console.log('  ✓ Verified: Verified email sessions discover workspace memberships correctly.');
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Test 5: Active Traversal Constraints on Assignments
  const resourceId = `res_crew_${testSuffix}`;
  const assignmentId = `asg_test_${testSuffix}`;
  const itineraryId = `itinerary_${testSuffix}`;
  const bookingId = `book_test_${testSuffix}`;

  try {
    console.log('\nTest 5: Active traversal constraints on assignments...');

    // Seed active itinerary
    await adminDb.collection('operational_itineraries').doc(itineraryId).set({
      id: itineraryId,
      tenantId: 'org-whiskey',
      bookingId: bookingId,
      vesselId: `ves_test_${testSuffix}`,
      status: 'scheduled',
      stops: [
        {
          name: 'St. Thomas',
          targetArrival: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          targetDeparture: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Bind booking to workspace
    const bindingId = `wsb_book_${testSuffix}`;
    await adminDb.collection('workspace_bindings').doc(bindingId).set({
      id: bindingId,
      workspaceId: workspaceId,
      entityType: 'Booking',
      entityId: bookingId,
      createdAt: new Date().toISOString()
    });

    // Seed Crew Resource: Active
    await adminDb.collection('resources').doc(resourceId).set({
      id: resourceId,
      tenantId: 'org-whiskey',
      name: 'Crew Member One',
      type: 'crew',
      category: 'person',
      status: 'active',
      humanConfig: { personId: person1Id, capabilities: ['captain'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Seed Assignment: Active
    await adminDb.collection('assignments').doc(assignmentId).set({
      id: assignmentId,
      tenantId: 'org-whiskey',
      itineraryId: itineraryId,
      resourceId: resourceId,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Verify context discovery returns the assignment successfully
    const req = mockRequest(user1Token);
    const response = await discoveryApi.GET(req);
    const body = await response.json();
    const matched = body.assignments.find((a: any) => a.assignmentId === assignmentId);
    if (!matched) {
      throw new Error('Assignment not discovered using canonical traversal chain');
    }
    console.log('  ✓ Traversed path: Person -> Crew Resource -> Assignment successfully.');

    // Enforce: revoked relationship (set Resource to offline)
    console.log('Testing revoked relationship (Resource status: offline)...');
    await adminDb.collection('resources').doc(resourceId).update({ status: 'offline' });
    const resRevoked = await discoveryApi.GET(req);
    const bodyRevoked = await resRevoked.json();
    if (bodyRevoked.assignments.some((a: any) => a.assignmentId === assignmentId)) {
      throw new Error('Revoked relationship still returned assignment context!');
    }
    console.log('  ✓ Verified: Offline/revoked resource status hides assignment.');
    await adminDb.collection('resources').doc(resourceId).update({ status: 'active' }); // restore

    // Enforce: cancelled assignment status (status: declined)
    console.log('Testing declined assignment status...');
    await adminDb.collection('assignments').doc(assignmentId).update({ status: 'declined' });
    const resDeclined = await discoveryApi.GET(req);
    const bodyDeclined = await resDeclined.json();
    if (bodyDeclined.assignments.some((a: any) => a.assignmentId === assignmentId)) {
      throw new Error('Declined assignment still returned in context discovery!');
    }
    console.log('  ✓ Verified: Declined assignment hides context.');
    await adminDb.collection('assignments').doc(assignmentId).update({ status: 'assigned' }); // restore

    // Enforce: cancelled operational itinerary
    console.log('Testing cancelled itinerary status...');
    await adminDb.collection('operational_itineraries').doc(itineraryId).update({ status: 'cancelled' });
    const resCancelled = await discoveryApi.GET(req);
    const bodyCancelled = await resCancelled.json();
    if (bodyCancelled.assignments.some((a: any) => a.assignmentId === assignmentId)) {
      throw new Error('Cancelled itinerary still returned assignment context!');
    }
    console.log('  ✓ Verified: Cancelled itinerary hides context.');
    await adminDb.collection('operational_itineraries').doc(itineraryId).update({ status: 'scheduled' }); // restore

    // Enforce: assignment access window expiry
    console.log('Testing expired assignment access window...');
    await adminDb.collection('operational_itineraries').doc(itineraryId).update({
      stops: [
        {
          name: 'Expired Stop',
          targetArrival: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          targetDeparture: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    });
    const resExpired = await discoveryApi.GET(req);
    const bodyExpired = await resExpired.json();
    if (bodyExpired.assignments.some((a: any) => a.assignmentId === assignmentId)) {
      throw new Error('Expired assignment access window still returned context!');
    }
    console.log('  ✓ Verified: Expired assignment access window hides context.');
  } catch (err: any) {
    console.error('✗ Test 5 failed:', err.message);
    process.exit(1);
  }

  // Test 6: Explicit Security Boundary Authorization Gating
  try {
    console.log('\nTest 6: Explicit security boundary authorization gating...');

    // Restore itinerary active stops/dates
    await adminDb.collection('operational_itineraries').doc(itineraryId).update({
      stops: [
        {
          name: 'St. Thomas',
          targetArrival: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          targetDeparture: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
        }
      ]
    });

    // 6.1 Person with assignment but no membership can access only the assigned trip context (resolves workspace as viewer fallback)
    console.log('Testing: Person with active assignment but no membership gets viewer fallback workspace context...');
    const contextResponse = await ContextResolutionEngine.resolveContext({
      workspaceId: workspaceId,
      actorId: person1Id,
      channel: 'web'
    });

    if (contextResponse.perspective.role !== 'viewer') {
      throw new Error(`Expected role viewer via assignment context fallback, got ${contextResponse.perspective.role}`);
    }
    console.log('  ✓ Verified: Authorized assignment grants workspace viewer fallback.');

    // 6.2 Person without assignment or membership is denied workspace context
    console.log('Testing: Person without assignment or membership is denied access...');
    const randomPersonId = `pers_unrelated_${testSuffix}`;
    await adminDb.collection('people').doc(randomPersonId).set({ id: randomPersonId, email: 'unrelated@example.com' });
    
    let accessDenied = false;
    try {
      await ContextResolutionEngine.resolveContext({
        workspaceId: workspaceId,
        actorId: randomPersonId,
        channel: 'web'
      });
    } catch (e: any) {
      if (e.message.includes('Unauthorized')) {
        accessDenied = true;
      }
    }

    if (!accessDenied) {
      throw new Error('Security failure: Person with no membership or assignment successfully resolved context!');
    }
    console.log('  ✓ Verified: Unauthorized actors are denied.');

    // 6.3 Workspace member cannot automatically access unrelated assignment details
    console.log('Testing: Workspace member cannot automatically verify access to unrelated assignments...');
    const isMemberAuthorized = await ContextResolutionEngine.verifyAssignmentAccess(person3Id, assignmentId);
    if (isMemberAuthorized) {
      throw new Error('Workspace member was automatically authorized for an unrelated crew assignment!');
    }
    console.log('  ✓ Verified: Workspace members cannot access unrelated assignment details.');

    // 6.4 Revoked approval, expired invitation, or cancelled assignment grants no access
    console.log('Testing: Revoked, expired or cancelled states deny access...');
    
    // Set assignment status to declined
    await adminDb.collection('assignments').doc(assignmentId).update({ status: 'declined' });
    const isDeclinedAuthorized = await ContextResolutionEngine.verifyAssignmentAccess(person1Id, assignmentId);
    if (isDeclinedAuthorized) {
      throw new Error('Declined assignment was authorized!');
    }
    console.log('  ✓ Verified: Revoked/declined assignment denies access.');
    
    // Clean up random person
    await adminDb.collection('people').doc(randomPersonId).delete();
  } catch (err: any) {
    console.error('✗ Test 6 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 7: Cleaning up test documents...');
  await adminDb.collection('people').doc(existingPersonId).delete();
  await adminDb.collection('people').doc(person1Id).delete();
  await adminDb.collection('people').doc(person3Id).delete();
  await adminDb.collection('users').doc(user1Uid).delete();
  await adminDb.collection('users').doc(user2Uid).delete();
  await adminDb.collection('users').doc(user3Uid).delete();
  await adminDb.collection('users').doc(unverifiedUid).delete();
  await adminDb.collection('workspaces').doc(workspaceId).delete();
  await adminDb.collection('workspace_invitations').doc(invitationId).delete();
  await adminDb.collection('workspace_invitations').doc(`wsi_pending_${testSuffix}`).delete();
  await adminDb.collection('workspace_bindings').doc(`wsb_book_${testSuffix}`).delete();
  
  const memberships = await adminDb.collection('workspace_memberships').where('workspaceId', '==', workspaceId).get();
  for (let m of memberships.docs) {
    await adminDb.collection('workspace_memberships').doc(m.id).delete();
  }

  await adminDb.collection('resources').doc(resourceId).delete();
  await adminDb.collection('assignments').doc(assignmentId).delete();
  await adminDb.collection('operational_itineraries').doc(itineraryId).delete();
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL PERSON-CENTRIC IDENTITY FOUNDATION TESTS PASSED ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
