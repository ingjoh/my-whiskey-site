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
const { adminDb, adminAuth } = require('../../lib/firebase-admin');
const legacyRoute = require('../../app/api/workspaces/[workspaceId]/context/route');
const generalizedRoute = require('../../app/api/context/resolve/route');
const { NextRequest } = require('next/server');

// Mock React before loading useResolvedContext hook to run hook unit tests in Node
const Module = require('module');
const originalRequire = Module.prototype.require;

let mockStateVal: any = { status: 'idle' };
let mockStateSetter: any = (val: any) => {
  mockStateVal = typeof val === 'function' ? val(mockStateVal) : val;
};
let registeredEffect: any = null;
let effectCleanup: any = null;
let effectDeps: any[] = [];

Module.prototype.require = function (id: string) {
  if (id === 'react') {
    return {
      useState: (initial: any) => {
        // Reset state helper
        if (initial && initial.status === 'idle' && mockStateVal.status !== 'idle') {
          mockStateVal = initial;
        }
        return [mockStateVal, (val: any) => mockStateSetter(val)];
      },
      useEffect: (effect: any, deps: any[]) => {
        registeredEffect = effect;
        effectDeps = deps;
      },
      useRef: (initial: any) => {
        return { current: initial };
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// Now import the actual React hook file
const { useResolvedContext } = require('../../../apps/mobile/src/hooks/useResolvedContext');

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
  console.log('=== STARTING WORKSPACE CLIENT API INTEGRATION TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_owner_${testSuffix}`;
  const workspaceId = `ws_client_${testSuffix}`;
  const userId = `uid_client_${testSuffix}`;
  const userToken = `token_client_${testSuffix}`;

  const unrelatedWorkspaceId = `ws_unrelated_${testSuffix}`;

  const missingProfileUserId = `uid_missing_${testSuffix}`;
  const missingProfileToken = `token_missing_${testSuffix}`;

  // Mock verifyIdToken
  const originalVerifyIdToken = adminAuth.verifyIdToken;
  adminAuth.verifyIdToken = async (token: string) => {
    if (token === userToken) {
      return { uid: userId, email: `owner_${testSuffix}@example.com`, email_verified: true };
    }
    if (token === missingProfileToken) {
      return { uid: missingProfileUserId, email: `missing_${testSuffix}@example.com`, email_verified: true };
    }
    throw new Error('Invalid token');
  };

  console.log('Step 0: Seeding test platform kernel entities...');
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `owner_${testSuffix}@example.com` });
  
  // Seed User doc to allow server-side identity mapping
  await adminDb.collection('users').doc(userId).set({
    id: userId,
    personId: ownerId,
    email: `owner_${testSuffix}@example.com`,
    status: 'active'
  });

  // Seed primary workspace
  await adminDb.collection('workspaces').doc(workspaceId).set({
    id: workspaceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objectiveTemplate: 'client-test',
    governance: { privacy: 'private', allowAiAgents: false, allowExternalInvites: true },
    status: 'active'
  });

  // Seed unrelated workspace to test Denied Access
  await adminDb.collection('workspaces').doc(unrelatedWorkspaceId).set({
    id: unrelatedWorkspaceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objectiveTemplate: 'unrelated',
    governance: { privacy: 'private', allowAiAgents: false, allowExternalInvites: false },
    status: 'active'
  });

  // Add owner membership to primary workspace
  await adminDb.collection('workspace_memberships').doc(`wsm_${testSuffix}`).set({
    id: `wsm_${testSuffix}`,
    workspaceId,
    personId: ownerId,
    role: 'owner',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Seed Crew Assignment details
  const resourceId = `res_crew_${testSuffix}`;
  const assignmentId = `asg_test_${testSuffix}`;
  const itineraryId = `itinerary_${testSuffix}`;
  const bookingId = `book_test_${testSuffix}`;

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

  await adminDb.collection('resources').doc(resourceId).set({
    id: resourceId,
    tenantId: 'org-whiskey',
    name: 'Crew Member One',
    type: 'crew',
    category: 'person',
    status: 'active',
    humanConfig: { personId: ownerId },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  await adminDb.collection('assignments').doc(assignmentId).set({
    id: assignmentId,
    tenantId: 'org-whiskey',
    itineraryId: itineraryId,
    resourceId: resourceId,
    status: 'assigned',
    assignedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log('✓ Seeding complete.');

  // Test 1: Workspace Context Resolution
  try {
    console.log('\nTest 1: Workspace context resolution...');
    const req = mockRequest(userToken, {
      context: { type: 'workspace', id: workspaceId },
      clientType: 'native_mobile',
      surface: 'supply_app',
      channel: 'interactive'
    });

    const response = await generalizedRoute.POST(req);
    if (response.status !== 200) {
      const body = await response.json();
      throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(body)}`);
    }

    const payload = await response.json();
    if (payload.workspace.id !== workspaceId) {
      throw new Error(`Expected workspace ID ${workspaceId}, got ${payload.workspace.id}`);
    }
    if (payload.perspective.role !== 'owner') {
      throw new Error(`Expected role owner, got ${payload.perspective.role}`);
    }
    console.log('  ✓ Verified workspace resolution successfully.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Test 2: Assignment Context Resolution
  try {
    console.log('\nTest 2: Assignment context resolution...');
    const req = mockRequest(userToken, {
      context: { type: 'assignment', id: assignmentId },
      clientType: 'native_mobile',
      surface: 'supply_app',
      channel: 'interactive'
    });

    const response = await generalizedRoute.POST(req);
    if (response.status !== 200) {
      const body = await response.json();
      throw new Error(`Expected status 200, got ${response.status}: ${JSON.stringify(body)}`);
    }

    const payload = await response.json();
    if (payload.workspace.id !== `assignment_${assignmentId}`) {
      throw new Error(`Expected context ID assignment_${assignmentId}, got ${payload.workspace.id}`);
    }
    if (payload.perspective.role !== 'viewer') {
      throw new Error(`Expected role viewer, got ${payload.perspective.role}`);
    }
    console.log('  ✓ Verified assignment resolution successfully.');
  } catch (err: any) {
    console.error('✗ Test 2 failed:', err.message);
    process.exit(1);
  }

  // Test 3: Denied Access
  try {
    console.log('\nTest 3: Denied access verification...');
    const req = mockRequest(userToken, {
      context: { type: 'workspace', id: unrelatedWorkspaceId },
      clientType: 'native_mobile',
      surface: 'supply_app',
      channel: 'interactive'
    });

    const response = await generalizedRoute.POST(req);
    const body = await response.json();
    if (response.status !== 403) {
      throw new Error(`Expected status 403, got ${response.status}`);
    }
    if (body.error.code !== 'FORBIDDEN') {
      throw new Error(`Expected error code FORBIDDEN, got ${body.error.code}`);
    }
    console.log('  ✓ Verified: Unauthorized context resolution returns clean 403 Forbidden.');
  } catch (err: any) {
    console.error('✗ Test 3 failed:', err.message);
    process.exit(1);
  }

  // Test 4: Unknown / Unsupported Context Type
  try {
    console.log('\nTest 4: Unknown context type verification...');
    const req = mockRequest(userToken, {
      context: { type: 'traveler_trip', id: 'trip_123' },
      clientType: 'native_mobile',
      surface: 'supply_app',
      channel: 'interactive'
    });

    const response = await generalizedRoute.POST(req);
    const body = await response.json();
    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }
    if (body.error.code !== 'UNSUPPORTED_CONTEXT_TYPE') {
      throw new Error(`Expected error code UNSUPPORTED_CONTEXT_TYPE, got ${body.error.code}`);
    }
    console.log('  ✓ Verified: Unsupported context type returns clean 400 Bad Request.');
  } catch (err: any) {
    console.error('✗ Test 4 failed:', err.message);
    process.exit(1);
  }

  // Test 5: Missing Profile Onboarding Guard
  try {
    console.log('\nTest 5: Missing profile onboarding verification...');
    const req = mockRequest(missingProfileToken, {
      context: { type: 'workspace', id: workspaceId },
      clientType: 'native_mobile',
      surface: 'supply_app',
      channel: 'interactive'
    });

    const response = await generalizedRoute.POST(req);
    const body = await response.json();
    if (response.status !== 404) {
      throw new Error(`Expected status 404 for missing profile, got ${response.status}`);
    }
    if (body.error.code !== 'PROFILE_NOT_FOUND') {
      throw new Error(`Expected error code PROFILE_NOT_FOUND, got ${body.error.code}`);
    }
    console.log('  ✓ Verified: Missing profile maps to clean 404 Not Found.');
  } catch (err: any) {
    console.error('✗ Test 5 failed:', err.message);
    process.exit(1);
  }

  // Test 6: Stale-Request hook cancellation behavior unit test
  try {
    console.log('\nTest 6: useResolvedContext hook stale-request & cancellation unit test...');

    // Save global fetch
    const originalFetch = global.fetch;

    let requestSignals: AbortSignal[] = [];
    let fetchCallCount = 0;

    // Mock fetch with delayed responses and abort signal logging
    global.fetch = (async (url: string, options: any) => {
      fetchCallCount++;
      const signal = options?.signal;
      if (signal) requestSignals.push(signal);

      const delay = url.includes('ws_delay_1') ? 150 : 50;

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          if (signal?.aborted) {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          } else {
            resolve({
              ok: true,
              json: async () => ({
                workspace: { id: url.includes('ws_delay_1') ? 'ws_delay_1' : 'ws_delay_2', governance: {} },
                perspective: { role: 'viewer', visibleModules: [], allowedActions: [] },
                bindings: []
              })
            });
          }
        }, delay);

        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    }) as any;

    // Reset state
    mockStateVal = { status: 'idle' };

    // 6.1 Call hook first time (Selection A)
    useResolvedContext({ type: 'workspace', id: 'ws_delay_1' });
    const firstEffect = registeredEffect;
    
    // Execute effect (triggers fetch for Selection A)
    effectCleanup = firstEffect();
    if (mockStateVal.status !== 'loading') {
      throw new Error(`Expected loading state, got ${mockStateVal.status}`);
    }

    // Yield to event loop so async getIdToken completes and calls fetch
    await new Promise(resolve => setTimeout(resolve, 5));

    // 6.2 Trigger cleanup and call hook second time (Selection B) quickly
    if (effectCleanup) effectCleanup(); // Abort first call!

    // Verify first signal is aborted
    if (!requestSignals[0] || !requestSignals[0].aborted) {
      throw new Error('Expected first request abort signal to be triggered');
    }

    // Mount second request
    useResolvedContext({ type: 'workspace', id: 'ws_delay_2' });
    const secondEffect = registeredEffect;
    const secondCleanup = secondEffect();

    // Wait for fetches to resolve/reject
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify that first AbortError did NOT produce error state
    if (mockStateVal.status === 'error') {
      throw new Error(`Expected AbortError to be ignored, but state became error: ${mockStateVal.error}`);
    }

    // Verify second request resolves successfully to B
    if (mockStateVal.status !== 'resolved' || mockStateVal.context.workspace.id !== 'ws_delay_2') {
      throw new Error(`Expected resolved context ws_delay_2, got ${mockStateVal.status}`);
    }

    console.log('  ✓ Verified: useResolvedContext hook triggers AbortController.');
    console.log('  ✓ Verified: AbortError is ignored silently.');
    console.log('  ✓ Verified: Newer selections successfully resolve and are not overwritten by stale ones.');

    // Restore fetch
    global.fetch = originalFetch;
    if (secondCleanup) secondCleanup();
  } catch (err: any) {
    console.error('✗ Test 6 failed:', err.message);
    process.exit(1);
  }

  // Restore verifyIdToken
  adminAuth.verifyIdToken = originalVerifyIdToken;

  // Clean up
  console.log('\nStep 7: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
  await adminDb.collection('users').doc(userId).delete();
  await adminDb.collection('workspaces').doc(workspaceId).delete();
  await adminDb.collection('workspaces').doc(unrelatedWorkspaceId).delete();
  await adminDb.collection('workspace_memberships').doc(`wsm_${testSuffix}`).delete();
  await adminDb.collection('resources').doc(resourceId).delete();
  await adminDb.collection('assignments').doc(assignmentId).delete();
  await adminDb.collection('operational_itineraries').doc(itineraryId).delete();
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL CLIENT API INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
