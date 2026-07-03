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
const { POST } = require('../../app/api/workspaces/[workspaceId]/context/route');
const { NextRequest } = require('next/server');

async function runTests() {
  console.log('=== STARTING WORKSPACE CLIENT API INTEGRATION TESTS ===\n');

  const testSuffix = Math.floor(100000 + Math.random() * 900000);
  const ownerId = `pers_owner_${testSuffix}`;
  const workspaceId = `ws_client_${testSuffix}`;

  console.log('Step 0: Seeding test platform kernel entities...');
  await adminDb.collection('people').doc(ownerId).set({ id: ownerId, email: `owner_${testSuffix}@example.com` });
  
  // Seed the workspace document manually to control the ID
  await adminDb.collection('workspaces').doc(workspaceId).set({
    id: workspaceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objectiveTemplate: 'client-test',
    governance: { privacy: 'private', allowAiAgents: false, allowExternalInvites: true },
    status: 'active'
  });

  // Add owner membership
  await adminDb.collection('workspace_memberships').doc(`wsm_${testSuffix}`).set({
    id: `wsm_${testSuffix}`,
    workspaceId,
    personId: ownerId,
    role: 'owner',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log('✓ Seeding complete.');

  // Test 1: Invoke POST handler directly with valid request payload
  try {
    console.log('\nTest 1: Invoking dynamic API POST handler directly...');
    
    // Simulate Request object
    const req = new NextRequest(`http://localhost/api/workspaces/${workspaceId}/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actorId: ownerId,
        channel: 'web'
      })
    });

    const resPromise = POST(req, {
      params: Promise.resolve({ workspaceId })
    });
    
    const response = await resPromise;
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    const payload = await response.json();
    console.log('✓ API returned 200 OK.');
    
    // Verify payload contract structure
    if (payload.workspace.id !== workspaceId) {
      throw new Error(`Expected workspace ID ${workspaceId}, got ${payload.workspace.id}`);
    }
    if (payload.perspective.role !== 'owner') {
      throw new Error(`Expected role owner, got ${payload.perspective.role}`);
    }
    if (!payload.perspective.allowedActions.includes('inviteMembers')) {
      throw new Error('Expected allowedActions to contain inviteMembers');
    }
    console.log('✓ ResolvedContextPackage contract verified.');
  } catch (err: any) {
    console.error('✗ Test 1 failed:', err.message);
    process.exit(1);
  }

  // Clean up
  console.log('\nStep 2: Cleaning up test documents...');
  await adminDb.collection('people').doc(ownerId).delete();
  await adminDb.collection('workspaces').doc(workspaceId).delete();
  await adminDb.collection('workspace_memberships').doc(`wsm_${testSuffix}`).delete();
  console.log('✓ Cleanup complete.');

  console.log('\n=== ALL CLIENT API INTEGRATION TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Unhandled test runner error:', err);
  process.exit(1);
});
