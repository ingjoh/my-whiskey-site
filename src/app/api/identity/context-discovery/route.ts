import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err: any) {
      console.error('Error verifying ID token in context-discovery API:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { uid, email, email_verified } = decodedToken;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized: Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Resolve Person ID from User record
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User mapping not found. Resolve identity first.' }, { status: 404 });
    }

    const userData = userSnap.data();
    const personId = userData?.personId;
    if (!personId) {
      return NextResponse.json({ error: 'Person profile not linked to user.' }, { status: 404 });
    }

    // Execute concurrent relationship lookups
    const workspacesPromise = (async () => {
      const membershipsSnap = await adminDb.collection('workspace_memberships')
        .where('personId', '==', personId)
        .get();

      const workspacesList = [];
      for (const mDoc of membershipsSnap.docs) {
        const mData = mDoc.data();
        const wsSnap = await adminDb.collection('workspaces').doc(mData.workspaceId).get();
        if (wsSnap.exists) {
          const wsData = wsSnap.data();
          workspacesList.push({
            workspaceId: mData.workspaceId,
            name: wsData?.name || 'Unnamed Workspace',
            role: mData.role,
            status: wsData?.status || 'active'
          });
        }
      }
      return workspacesList;
    })();

    const invitationsPromise = (async () => {
      // Pending invitations must ONLY be discovered using a verified email claim
      if (!email_verified) {
        console.log(`[Discovery] Bypassing invitation search for uid=${uid} because email is unverified.`);
        return [];
      }

      const invitesSnap = await adminDb.collection('workspace_invitations')
        .where('email', '==', cleanEmail)
        .where('status', '==', 'pending')
        .where('revoked', '==', false)
        .get();

      const invitationsList = [];
      for (const iDoc of invitesSnap.docs) {
        const iData = iDoc.data();
        const expiresAt = new Date(iData.expiresAt);
        if (expiresAt > new Date()) {
          const wsSnap = await adminDb.collection('workspaces').doc(iData.workspaceId).get();
          invitationsList.push({
            invitationId: iDoc.id,
            workspaceId: iData.workspaceId,
            workspaceName: wsSnap.exists ? wsSnap.data()?.name || 'Unnamed Workspace' : 'Unnamed Workspace',
            role: iData.role,
            expiresAt: iData.expiresAt
          });
        }
      }
      return invitationsList;
    })();

    const assignmentsPromise = (async () => {
      // Canonical Traversal Chain: Person -> Crew Resource -> Assignment
      // 1. Crew Resource must be ACTIVE
      const resourcesSnap = await adminDb.collection('resources')
        .where('type', '==', 'crew')
        .where('humanConfig.personId', '==', personId)
        .where('status', '==', 'active')
        .get();

      if (resourcesSnap.empty) {
        return [];
      }

      const resourceIds = resourcesSnap.docs.map(doc => doc.id);
      const slicedResourceIds = resourceIds.slice(0, 10);
      
      // 2. Query assignments for these resources
      const assignmentsSnap = await adminDb.collection('assignments')
        .where('resourceId', 'in', slicedResourceIds)
        .get();

      const assignmentsList = [];
      for (const aDoc of assignmentsSnap.docs) {
        const aData = aDoc.data();

        // Filter: status must be active/accepted/upcoming (assigned or tentative, not declined)
        if (aData.status === 'declined') {
          continue;
        }
        
        // 3. Fetch corresponding operational itinerary
        const itinerarySnap = await adminDb.collection('operational_itineraries').doc(aData.itineraryId).get();
        if (!itinerarySnap.exists) {
          continue;
        }

        const itineraryData = itinerarySnap.data();
        
        // Filter: itinerary must not be cancelled
        if (itineraryData?.status === 'cancelled') {
          continue;
        }

        // 4. Verify assignment access window is still valid (stops targetArrival/targetDeparture +/- 48h grace)
        const stops = itineraryData?.stops || [];
        if (stops.length > 0) {
          const sortedArrivals = stops.map((s: any) => new Date(s.targetArrival).getTime()).sort();
          const sortedDepartures = stops.map((s: any) => new Date(s.targetDeparture).getTime()).sort();
          const firstArrival = sortedArrivals[0];
          const lastDeparture = sortedDepartures[sortedDepartures.length - 1];

          const now = Date.now();
          const graceBefore = 48 * 60 * 60 * 1000;
          const graceAfter = 48 * 60 * 60 * 1000;

          if (now < firstArrival - graceBefore || now > lastDeparture + graceAfter) {
            // Expired access window
            continue;
          }
        }

        let vesselName = 'Unknown Vessel';
        const vesselSnap = await adminDb.collection('resources').doc(itineraryData?.vesselId).get();
        if (vesselSnap.exists) {
          vesselName = vesselSnap.data()?.name || 'Unknown Vessel';
        }

        assignmentsList.push({
          assignmentId: aDoc.id,
          itineraryId: aData.itineraryId,
          bookingId: aData.bookingId || null,
          status: aData.status,
          vesselName
        });
      }
      return assignmentsList;
    })();

    const approvalsPromise = (async () => {
      // Active operational approvals involving vessels or other resources
      const approvalsSnap = await adminDb.collection('resource_approvals')
        .where('personId', '==', personId)
        .where('status', '==', 'approved')
        .get();

      const approvalsList = [];
      for (const apDoc of approvalsSnap.docs) {
        const apData = approvalsSnap.docs[0].data();
        const expiresAt = apData.expiresAt ? new Date(apData.expiresAt) : null;
        
        if (!expiresAt || expiresAt > new Date()) {
          const vesselSnap = await adminDb.collection('resources').doc(apData.vesselId).get();
          approvalsList.push({
            approvalId: apDoc.id,
            vesselId: apData.vesselId,
            vesselName: vesselSnap.exists ? vesselSnap.data()?.name || 'Unknown Vessel' : 'Unknown Vessel',
            status: apData.status,
            expiresAt: apData.expiresAt || null,
            structuredRestrictions: apData.structuredRestrictions || null
          });
        }
      }
      return approvalsList;
    })();

    const [workspaces, pendingInvitations, assignments, approvals] = await Promise.all([
      workspacesPromise,
      invitationsPromise,
      assignmentsPromise,
      approvalsPromise
    ]);

    // Construct profile object to keep raw identifiers out of general UI response nodes
    const profile = {
      displayName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'User',
      email: cleanEmail,
      avatarUrl: userData?.avatarUrl || null
    };

    return NextResponse.json({
      profile,
      workspaces,
      pendingInvitations,
      assignments,
      approvals
    });
  } catch (err: any) {
    console.error('Unhandled error in context-discovery API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
