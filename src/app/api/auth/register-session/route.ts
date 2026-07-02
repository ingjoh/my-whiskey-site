import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';

const ADMIN_EMAIL_WHITELIST = [
  'ingjohs@gmail.com',
  'ingjoh@gmail.com',
  'ingemar.johnsson@gmail.com',
  'ingemar.johnsson@tribes.co'
];

function isWhitelisted(email?: string): boolean {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  
  if (ADMIN_EMAIL_WHITELIST.includes(cleanEmail)) {
    return true;
  }
  
  if (cleanEmail.endsWith('@motoryachtwhiskey.com') || cleanEmail.endsWith('@mywhiskey.com')) {
    return true;
  }
  
  return false;
}

// Prefix random ID generator
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
      console.error('Error verifying ID token in register-session API:', err);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const { email, uid, name } = decodedToken;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized: Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Resolve User & Person document mappings
    let userDocRef = adminDb.collection('users').doc(uid);
    let userSnap = await userDocRef.get();
    let personId = '';

    if (!userSnap.exists) {
      console.log(`[Session] Auth user ${cleanEmail} (${uid}) has no mapping. Resolving or creating Person...`);
      
      // Check if a Person profile already exists with this email
      const peopleQuery = await adminDb.collection('people')
        .where('email', '==', cleanEmail)
        .limit(1)
        .get();

      if (!peopleQuery.empty) {
        personId = peopleQuery.docs[0].id;
        console.log(`[Session] Associated auth user with existing Person profile: ${personId}`);
      } else {
        // Create new Person document
        personId = generateUUID('pers');
        const nameParts = (name || '').trim().split(/\s+/);
        const firstName = nameParts[0] || cleanEmail.split('@')[0];
        const lastName = nameParts.slice(1).join(' ') || '';

        await adminDb.collection('people').doc(personId).set({
          id: personId,
          email: cleanEmail,
          phone: '',
          firstName,
          lastName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`[Session] Created new Person profile: ${personId} for ${cleanEmail}`);
      }

      // Create /users document
      await userDocRef.set({
        id: uid,
        personId: personId,
        email: cleanEmail,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      const userData = userSnap.data();
      personId = userData?.personId || '';
      
      // Update last sign in
      await userDocRef.update({
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    if (!personId) {
      throw new Error(`Failed to resolve person ID mapping for user uid: ${uid}`);
    }

    // 2. Resolve target organization role (Owner for whitelisted, Guest for general)
    const isPlatformAdmin = isWhitelisted(cleanEmail);
    const defaultRoleId = isPlatformAdmin ? 'role_owner' : 'role_guest';

    // Verify if default role assignment exists scoped to org-whiskey
    const assignmentQuery = await adminDb.collection('role_assignments')
      .where('personId', '==', personId)
      .where('roleId', '==', defaultRoleId)
      .where('scopeId', '==', 'org-whiskey')
      .limit(1)
      .get();

    if (assignmentQuery.empty) {
      const rasgId = generateUUID('rasg');
      await adminDb.collection('role_assignments').doc(rasgId).set({
        id: rasgId,
        personId: personId,
        roleId: defaultRoleId,
        scopeType: 'organization',
        scopeId: 'org-whiskey',
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`[Session] Default role assignment (${defaultRoleId}) created for ${cleanEmail}`);
    }

    // 3. Compile all scoped role assignments into Auth custom claims
    const activeAssignments = await adminDb.collection('role_assignments')
      .where('personId', '==', personId)
      .get();

    const rolesMap: { [orgId: string]: string } = {};
    activeAssignments.forEach((doc) => {
      const data = doc.data();
      if (data.scopeType === 'organization') {
        const shortRole = data.roleId.replace('role_', '');
        rolesMap[data.scopeId] = shortRole;
      }
    });

    const targetClaims = {
      admin: isPlatformAdmin,
      roles: rolesMap
    };

    // 4. Set custom claims if they changed or are missing
    const currentClaims = decodedToken.roles;
    const claimsNeedUpdate = !currentClaims || 
                             JSON.stringify(currentClaims) !== JSON.stringify(rolesMap) || 
                             decodedToken.admin !== isPlatformAdmin;

    if (claimsNeedUpdate) {
      console.log(`[Session] Updating custom claims for uid=${uid}:`, targetClaims);
      try {
        await adminAuth.setCustomUserClaims(uid, targetClaims);
        return NextResponse.json({ success: true, claimsUpdated: true, message: 'Custom claims updated.' });
      } catch (claimErr: any) {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev && (claimErr.code === 'app/invalid-credential' || claimErr.message?.includes('credentials') || claimErr.message?.includes('OAuth2'))) {
          console.warn(`[DEV] Bypassing custom claims set for ${cleanEmail} due to missing local OAuth Admin credentials.`);
          return NextResponse.json({ 
            success: true, 
            claimsUpdated: false, 
            message: 'Bypassed admin custom claims in local development.' 
          });
        }
        throw claimErr;
      }
    }

    return NextResponse.json({ success: true, claimsUpdated: false, message: 'Custom claims already in sync.' });
  } catch (err: any) {
    console.error('Unhandled error in register-session API:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
