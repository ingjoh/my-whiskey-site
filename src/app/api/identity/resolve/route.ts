import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';

function generateUUID(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function POST(req: NextRequest) {
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
      console.error('Error verifying ID token in resolve API:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email, uid, name } = decodedToken;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized: Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const body = await req.json().catch(() => ({}));
    const { invitationToken } = body;

    // 1. Pre-query target invitation by token hash outside the transaction to obtain its document ID
    let queryInvitationId = '';
    let inviteePersonId = '';
    let inviteePersonData: any = null;

    if (invitationToken) {
      const tokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
      const invitesQuery = await adminDb.collection('workspace_invitations')
        .where('tokenHash', '==', tokenHash)
        .limit(1)
        .get();

      if (!invitesQuery.empty) {
        const inviteDoc = invitesQuery.docs[0];
        queryInvitationId = inviteDoc.id;

        const data = inviteDoc.data();
        const inviteeEmail = (data.email || '').toLowerCase().trim();

        // Check if an existing Person profile exists matching the invitation email
        const peopleQuery = await adminDb.collection('people')
          .where('email', '==', inviteeEmail)
          .limit(1)
          .get();

        if (!peopleQuery.empty) {
          inviteePersonId = peopleQuery.docs[0].id;
          inviteePersonData = { id: inviteePersonId, ...peopleQuery.docs[0].data() };
        }
      }
    }

    // Check for potential duplicate email to set duplicateFlagged warning
    const duplicateQuery = await adminDb.collection('people')
      .where('email', '==', cleanEmail)
      .limit(1)
      .get();
    const isEmailDuplicate = !duplicateQuery.empty;

    let user = null;
    let person = null;

    // 2. Execute transaction ensuring single-use consumption and atomic reads before writes
    await adminDb.runTransaction(async (transaction) => {
      // READ Phase
      const userDocRef = adminDb.collection('users').doc(uid);
      const userSnap = await transaction.get(userDocRef);

      let inviteSnap = null;
      if (queryInvitationId) {
        const invitationDocRef = adminDb.collection('workspace_invitations').doc(queryInvitationId);
        inviteSnap = await transaction.get(invitationDocRef);
      }

      if (userSnap.exists) {
        const userData = userSnap.data();
        const personDocRef = adminDb.collection('people').doc(userData?.personId);
        const personSnap = await transaction.get(personDocRef);

        user = { id: uid, ...userData };
        if (personSnap.exists) {
          person = { id: personSnap.id, ...personSnap.data() };
        }
        return;
      }

      // New user registration resolution
      let resolvedPersonId = '';
      let resolvedPersonObj: any = null;
      let isInvitationValid = false;
      let invitationData: any = null;

      // Validate invitation state atomically within transaction reads
      if (inviteSnap && inviteSnap.exists) {
        const data = inviteSnap.data();
        if (data) {
          const expiresAt = new Date(data.expiresAt);
          const inviteeEmail = (data.email || '').toLowerCase().trim();

          // Enforce: token hash matches, status is pending, not expired/revoked, verified contact match, and not consumed
          if (
            data.status === 'pending' &&
            data.revoked === false &&
            expiresAt > new Date() &&
            data.consumedAt === null &&
            inviteeEmail === cleanEmail
          ) {
            isInvitationValid = true;
            invitationData = data;
          } else {
            console.warn(`[Resolve] Invitation validation failed for wsi=${inviteSnap.id}. Status=${data.status}, Revoked=${data.revoked}, Expired=${expiresAt <= new Date()}, MatchingEmail=${inviteeEmail === cleanEmail}`);
          }
        }
      }

      const newPersonId = generateUUID('pers');

      // WRITE Phase
      if (isInvitationValid && invitationData) {
        if (inviteePersonId && inviteePersonData) {
          resolvedPersonId = inviteePersonId;
          resolvedPersonObj = inviteePersonData;
        } else {
          // Create new Person using the verified invitation email
          resolvedPersonId = newPersonId;
          const inviteeEmail = (invitationData.email || '').toLowerCase().trim();
          const nameParts = (name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || inviteeEmail.split('@')[0];
          const lastName = nameParts.slice(1).join(' ') || '';

          const newPersonDocRef = adminDb.collection('people').doc(resolvedPersonId);
          resolvedPersonObj = {
            id: resolvedPersonId,
            email: inviteeEmail,
            phone: '',
            firstName,
            lastName,
            duplicateFlagged: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          transaction.set(newPersonDocRef, resolvedPersonObj);
        }

        // Consume invitation atomically (single-use consumption lock)
        const invitationDocRef = adminDb.collection('workspace_invitations').doc(queryInvitationId);
        transaction.update(invitationDocRef, {
          status: 'accepted',
          consumedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Create Workspace Membership
        const newMembershipId = generateUUID('wsm');
        const membershipDocRef = adminDb.collection('workspace_memberships').doc(newMembershipId);
        transaction.set(membershipDocRef, {
          id: newMembershipId,
          workspaceId: invitationData.workspaceId,
          personId: resolvedPersonId,
          role: invitationData.role || 'member',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        // standalone onboarding (creates independent profile, no email merges)
        resolvedPersonId = newPersonId;
        const nameParts = (name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || cleanEmail.split('@')[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        const newPersonDocRef = adminDb.collection('people').doc(resolvedPersonId);
        resolvedPersonObj = {
          id: resolvedPersonId,
          email: cleanEmail,
          phone: '',
          firstName,
          lastName,
          duplicateFlagged: isEmailDuplicate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        transaction.set(newPersonDocRef, resolvedPersonObj);
      }

      // Link and create User document
      const newUserDocRef = adminDb.collection('users').doc(uid);
      const userData = {
        id: uid,
        personId: resolvedPersonId,
        email: cleanEmail,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {}
      };
      transaction.set(newUserDocRef, userData);

      user = userData;
      person = resolvedPersonObj;
    });

    return NextResponse.json({ user, person });
  } catch (err: any) {
    console.error('Unhandled error in resolve API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
