import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Collection Constants
export const PEOPLE_COLLECTION = 'people';
export const USERS_COLLECTION = 'users';
export const ORGANIZATIONS_COLLECTION = 'organizations';
export const PARTNERSHIPS_COLLECTION = 'partnerships';
export const ROLES_COLLECTION = 'roles';
export const ROLE_ASSIGNMENTS_COLLECTION = 'role_assignments';
export const CAPABILITIES_COLLECTION = 'capabilities';

// Interfaces matching Epic 1 schemas

export interface Person {
  id: string;              // pers_<uuid>
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;              // Firebase Authentication uid
  personId: string;        // References Person.id
  email: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;              // org_<uuid>
  name: string;
  businessRegistration?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Partnership {
  id: string;              // part_<uuid>
  identityType: 'person' | 'organization';
  identityId: string;      // References Person.id or Organization.id
  commissionRate: number;
  payoutConfig: {
    stripeAccountId?: string;
    bankingDetailsEntered: boolean;
  };
  status: 'pending_onboarding' | 'active' | 'suspended' | 'terminated';
  agreementsSigned: Array<{
    agreementId: string;
    signedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;              // e.g. "role_owner", "role_admin"
  name: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleAssignment {
  id: string;              // rasg_<uuid>
  personId: string;        // References Person.id
  roleId: string;          // References Role.id
  scopeType: 'organization' | 'partnership' | 'platform';
  scopeId: string;         // References Organization.id, Partnership.id, or "platform"
  assignedAt: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Capability {
  id: string;              // cap_<uuid>
  personId: string;        // References Person.id
  capabilityType: 'captain' | 'crew' | 'chef' | 'guide' | 'mechanic' | 'photographer' | 'instructor';
  certifications: Array<{
    name: string;
    licenseNumber: string;
    expiresAt: string;
    issuingAuthority: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Database Helpers

/**
 * Retrieves a Person by their email using a query index lookup.
 */
export async function getPersonProfile(email: string): Promise<Person | null> {
  const emailSanitized = email.toLowerCase().trim();
  try {
    const q = query(collection(db, PEOPLE_COLLECTION), where('email', '==', emailSanitized));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Person;
    }
    return null;
  } catch (error) {
    console.error('Error loading person profile by email:', error);
    return null;
  }
}

/**
 * Retrieves a Person profile by direct ID lookup.
 */
export async function getPersonProfileById(id: string): Promise<Person | null> {
  try {
    const docRef = doc(db, PEOPLE_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Person;
    }
    return null;
  } catch (error) {
    console.error('Error loading person profile by ID:', error);
    return null;
  }
}

/**
 * Retrieves all role assignments for a specific Person.
 */
export async function getPersonRoleAssignments(personId: string): Promise<RoleAssignment[]> {
  try {
    const q = query(collection(db, ROLE_ASSIGNMENTS_COLLECTION), where('personId', '==', personId));
    const snapshot = await getDocs(q);
    const assignments: RoleAssignment[] = [];
    snapshot.forEach((d) => {
      assignments.push(d.data() as RoleAssignment);
    });
    return assignments;
  } catch (error) {
    console.error('Error loading person role assignments:', error);
    return [];
  }
}

/**
 * Retrieves an Organization by ID.
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  try {
    const docRef = doc(db, ORGANIZATIONS_COLLECTION, orgId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Organization;
    }
    return null;
  } catch (error) {
    console.error('Error loading organization:', error);
    return null;
  }
}

/**
 * Retrieves a Partnership by ID.
 */
export async function getPartnership(partnershipId: string): Promise<Partnership | null> {
  try {
    const docRef = doc(db, PARTNERSHIPS_COLLECTION, partnershipId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Partnership;
    }
    return null;
  } catch (error) {
    console.error('Error loading partnership:', error);
    return null;
  }
}

/**
 * Retrieves all professional Capabilities associated with a Person.
 */
export async function getPersonCapabilities(personId: string): Promise<Capability[]> {
  try {
    const q = query(collection(db, CAPABILITIES_COLLECTION), where('personId', '==', personId));
    const snapshot = await getDocs(q);
    const capabilities: Capability[] = [];
    snapshot.forEach((d) => {
      capabilities.push(d.data() as Capability);
    });
    return capabilities;
  } catch (error) {
    console.error('Error loading capabilities:', error);
    return [];
  }
}

/**
 * Saves or updates a Person document.
 */
export async function savePersonProfile(person: Person): Promise<boolean> {
  try {
    const docRef = doc(db, PEOPLE_COLLECTION, person.id);
    await setDoc(docRef, {
      ...person,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving person profile:', error);
    return false;
  }
}

/**
 * Saves or updates a RoleAssignment document.
 */
export async function saveRoleAssignment(assignment: RoleAssignment): Promise<boolean> {
  try {
    const docRef = doc(db, ROLE_ASSIGNMENTS_COLLECTION, assignment.id);
    await setDoc(docRef, {
      ...assignment,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving role assignment:', error);
    return false;
  }
}

/**
 * Saves or updates a Capability document.
 */
export async function saveCapability(capability: Capability): Promise<boolean> {
  try {
    const docRef = doc(db, CAPABILITIES_COLLECTION, capability.id);
    await setDoc(docRef, {
      ...capability,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving capability:', error);
    return false;
  }
}
