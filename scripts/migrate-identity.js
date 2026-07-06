const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// Load environment variables from .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading configuration from .env.local...');
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

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT is not set in environment variables.');
  process.exit(1);
}

// Initialize Firebase Admin
try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  console.log(`Firebase Admin SDK initialized. Project: ${serviceAccount.project_id}`);
} catch (e) {
  console.error('Failed to parse Firebase Service Account JSON:', e);
  process.exit(1);
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();

// Constants
const PAGE_COLLECTION = 'pages';
const PEOPLE_COLLECTION = 'people';
const USERS_COLLECTION = 'users';
const ORGANIZATIONS_COLLECTION = 'organizations';
const ROLES_COLLECTION = 'roles';
const ROLE_ASSIGNMENTS_COLLECTION = 'role_assignments';
const CAPABILITIES_COLLECTION = 'capabilities';

const ADMIN_EMAIL_WHITELIST = [
  'ingjohs@gmail.com',
  'ingjoh@gmail.com',
  'ingemar.johnsson@gmail.com',
  'ingemar.johnsson@tribes.co'
];

const STATIC_ROLES = [
  {
    id: 'role_owner',
    name: 'Owner',
    permissions: ['read:bookings', 'write:bookings', 'read:assets', 'write:assets', 'read:settlement', 'write:settlement', 'manage:users'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'role_admin',
    name: 'Administrator',
    permissions: ['read:bookings', 'write:bookings', 'read:assets', 'write:assets', 'read:settlement', 'manage:users'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'role_broker',
    name: 'Broker',
    permissions: ['read:bookings', 'write:bookings'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'role_guest',
    name: 'Guest',
    permissions: ['read:bookings'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper to generate prefix UUIDs
function generateUUID(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

async function runMigration() {
  console.log('\n--- Starting Identity Layer Migration ---\n');

  // 1. Populate Static Roles
  console.log('Step 1: Populating static role definitions...');
  for (const role of STATIC_ROLES) {
    await db.collection(ROLES_COLLECTION).doc(role.id).set(role);
    console.log(`  - Role configured: ${role.id} (${role.name})`);
  }

  // 2. Create Default Organization
  console.log('\nStep 2: Creating default organization (org-whiskey)...');
  const orgRef = db.collection(ORGANIZATIONS_COLLECTION).doc('org-whiskey');
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) {
    await orgRef.set({
      id: 'org-whiskey',
      name: 'M/Y Whiskey Charters',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log('  - Organization org-whiskey created.');
  } else {
    console.log('  - Organization org-whiskey already exists.');
  }

  // 3. Scan Legacy Customer Records
  console.log('\nStep 3: Migrating legacy customer profiles...');
  const pagesSnapshot = await db.collection(PAGE_COLLECTION).where('type', '==', 'customer').get();
  console.log(`  - Found ${pagesSnapshot.size} legacy customer documents.`);

  const emailToPersonIdMap = new Map();

  for (const doc of pagesSnapshot.docs) {
    const data = doc.data();
    const email = data.email?.toLowerCase().trim();
    if (!email) {
      console.log(`  - Skipping customer document ${doc.id} due to missing email.`);
      continue;
    }

    if (data.migrated) {
      console.log(`  - Customer profile ${email} already marked as migrated.`);
      emailToPersonIdMap.set(email, data.personId);
      continue;
    }

    const personId = generateUUID('pers');
    
    // Split name safely
    let firstName = data.firstName || '';
    let lastName = data.lastName || '';
    if (!firstName && !lastName && data.name) {
      const parts = data.name.trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const personDoc = {
      id: personId,
      email: email,
      phone: data.phone || '',
      firstName: firstName,
      lastName: lastName,
      address: data.address ? {
        street: data.address,
        city: '',
        state: '',
        zip: '',
        country: ''
      } : undefined,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save Person
    await db.collection(PEOPLE_COLLECTION).doc(personId).set(personDoc);
    emailToPersonIdMap.set(email, personId);

    // If agent flag is set, create a Partnership record
    if (data.isAgent) {
      const partId = generateUUID('part');
      await db.collection(PARTNERSHIPS_COLLECTION).doc(partId).set({
        id: partId,
        identityType: 'person',
        identityId: personId,
        commissionRate: 0.15, // Default 15% broker rate
        payoutConfig: {
          bankingDetailsEntered: false
        },
        status: 'active',
        agreementsSigned: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`  - Created Partnership record for Broker: ${email}`);
    }

    // Flag legacy customer document
    await doc.ref.update({
      migrated: true,
      personId: personId,
      updatedAt: new Date().toISOString()
    });

    console.log(`  - Migrated Person: ${email} -> ${personId}`);
  }

  // 4. Migrate Whitelisted Admins & Users
  console.log('\nStep 4: Aligning active Firebase Auth users & Role Assignments...');
  
  // Create /people records for Whitelisted Admins if they don't exist in map
  for (const adminEmail of ADMIN_EMAIL_WHITELIST) {
    const cleanEmail = adminEmail.toLowerCase().trim();
    if (!emailToPersonIdMap.has(cleanEmail)) {
      const personId = generateUUID('pers');
      const parts = cleanEmail.split('@')[0].split('.');
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Admin';
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

      await db.collection(PEOPLE_COLLECTION).doc(personId).set({
        id: personId,
        email: cleanEmail,
        phone: '',
        firstName,
        lastName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      emailToPersonIdMap.set(cleanEmail, personId);
      console.log(`  - Pre-created Person for Admin: ${cleanEmail} -> ${personId}`);
    }
  }

  // List all users from Firebase Auth
  const usersResult = await auth.listUsers(1000);
  console.log(`  - Found ${usersResult.users.length} authenticated users in Firebase Auth.`);

  for (const userRecord of usersResult.users) {
    const email = userRecord.email?.toLowerCase().trim();
    if (!email) continue;

    const personId = emailToPersonIdMap.get(email);
    if (!personId) {
      console.log(`  - Auth user ${email} (${userRecord.uid}) has no Person record. Skipping.`);
      continue;
    }

    // Create User mapping doc
    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set({
      id: userRecord.uid,
      personId: personId,
      email: email,
      lastLoginAt: userRecord.metadata.lastSignInTime || new Date().toISOString(),
      createdAt: userRecord.metadata.creationTime || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`  - User mapping created: uid=${userRecord.uid} -> personId=${personId}`);

    // Resolve Role Assignments
    const isAdmin = ADMIN_EMAIL_WHITELIST.includes(email) || 
                    email.endsWith('@motoryachtwhiskey.com') || 
                    email.endsWith('@mywhiskey.com');

    const targetRoleId = isAdmin ? 'role_owner' : 'role_guest';

    // Check if role assignment already exists
    const assignmentQuery = await db.collection(ROLE_ASSIGNMENTS_COLLECTION)
      .where('personId', '==', personId)
      .where('roleId', '==', targetRoleId)
      .where('scopeId', '==', 'org-whiskey')
      .get();

    if (assignmentQuery.empty) {
      const assignmentId = generateUUID('rasg');
      await db.collection(ROLE_ASSIGNMENTS_COLLECTION).doc(assignmentId).set({
        id: assignmentId,
        personId: personId,
        roleId: targetRoleId,
        scopeType: 'organization',
        scopeId: 'org-whiskey',
        assignedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`  - Granted Role: ${targetRoleId} on org-whiskey to ${email}`);
    }

    // Update Firebase Custom Claims for claims verification
    const claims = {
      admin: isAdmin,
      roles: {
        'org-whiskey': isAdmin ? 'owner' : 'guest'
      }
    };
    await auth.setCustomUserClaims(userRecord.uid, claims);
    console.log(`  - Configured custom claims for uid=${userRecord.uid}:`, claims);
  }

  // 5. Evolve Bookings to set tenantId
  console.log('\nStep 5: Updating existing bookings to comply with tenantId Logical Isolation...');
  const bookingsSnapshot = await db.collection(PAGE_COLLECTION).where('type', '==', 'booking').get();
  console.log(`  - Found ${bookingsSnapshot.size} booking records.`);

  let updatedBookingsCount = 0;
  for (const doc of bookingsSnapshot.docs) {
    const data = doc.data();
    if (!data.tenantId) {
      await doc.ref.update({
        tenantId: 'org-whiskey',
        updatedAt: new Date().toISOString()
      });
      updatedBookingsCount++;
    }
  }
  console.log(`  - Updated ${updatedBookingsCount} bookings to include tenantId: 'org-whiskey'.`);

  console.log('\n--- Migration Finished Successfully ---\n');
}

runMigration().catch(err => {
  console.error('\n!!! Migration Failed !!!\n', err);
  process.exit(1);
});
