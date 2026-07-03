import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Collection Constants
export const RESOURCES_COLLECTION = 'resources';
export const INVENTORY_ALLOCATIONS_COLLECTION = 'inventory_allocations';
export const ASSIGNMENTS_COLLECTION = 'assignments';
export const OPERATIONAL_ITINERARIES_COLLECTION = 'operational_itineraries';

// Interfaces matching Epic 3 specifications

export interface Resource {
  id: string;              // res_<uuid>
  tenantId: string;        // Tenant isolation
  name: string;            // e.g. "M/Y Whiskey" or "Captain Sarah Vance"
  type: 'vessel' | 'gear' | 'crew';
  category: string;        // e.g. "yacht", "paddleboard", "person"
  status: 'active' | 'maintenance' | 'offline' | 'retired';
  
  // Physical resource configurations
  physicalConfig?: {
    capacity: number;
    homeLocation: string;
    relocationSpeed: number;
  };

  // Crew resource configurations
  humanConfig?: {
    personId: string;
    capabilities: string[];
  };

  createdAt: string;
  updatedAt: string;
}

export interface InventoryAllocation {
  id: string;              // inv_<uuid>
  tenantId: string;
  resourceId: string;      // References Resource.id
  allocationType: 'booking' | 'maintenance' | 'private_use' | 'reservation_hold' | 'assignment';
  referenceId: string;     // References Booking ID, Assignment ID, etc.
  startAt: string;         // ISO Timestamp
  endAt: string;           // ISO Timestamp
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;              // asg_<uuid>
  tenantId: string;
  itineraryId: string;     // References OperationalItinerary.id
  bookingId: string;       // References Booking.id (convenience link)
  resourceId: string;      // References Resource.id
  requiredCapability?: string; // Capability verified (e.g. "captain")
  status: 'tentative' | 'assigned' | 'declined';
  assignedAt: string;
  updatedAt: string;
}

export interface OperationalItinerary {
  id: string;              // opit_<uuid>
  tenantId: string;
  bookingId: string;       // References Booking.id
  vesselResourceId: string; // References Resource.id
  stops: Array<{
    name: string;
    targetArrival: string;
    targetDeparture: string;
    actualArrival?: string;
    actualDeparture?: string;
  }>;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DB Controller Implementations
// ==========================================

// --- Resources ---

export async function saveResource(resource: Omit<Resource, 'createdAt' | 'updatedAt'>): Promise<string> {
  const rId = resource.id;
  try {
    const docRef = doc(db, RESOURCES_COLLECTION, rId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();
    
    const data: Resource = {
      ...resource,
      createdAt: existing.exists() ? (existing.data() as Resource).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return rId;
  } catch (error) {
    console.error(`Error saving resource ${rId}:`, error);
    throw error;
  }
}

export async function getResourceById(id: string): Promise<Resource | null> {
  try {
    const docSnap = await getDoc(doc(db, RESOURCES_COLLECTION, id));
    if (docSnap.exists()) {
      return docSnap.data() as Resource;
    }
    return null;
  } catch (error) {
    console.error(`Error getting resource ${id}:`, error);
    return null;
  }
}

export async function getResourcesByTenant(tenantId: string): Promise<Resource[]> {
  try {
    const q = query(collection(db, RESOURCES_COLLECTION), where('tenantId', '==', tenantId));
    const querySnapshot = await getDocs(q);
    const list: Resource[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Resource);
    });
    return list;
  } catch (error) {
    console.error(`Error listing resources for tenant ${tenantId}:`, error);
    return [];
  }
}

// --- Inventory Allocations (Capacity Ledger) ---

export async function saveInventoryAllocation(allocation: Omit<InventoryAllocation, 'createdAt' | 'updatedAt'>): Promise<string> {
  const aId = allocation.id;
  try {
    const docRef = doc(db, INVENTORY_ALLOCATIONS_COLLECTION, aId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();
    
    const data: InventoryAllocation = {
      ...allocation,
      createdAt: existing.exists() ? (existing.data() as InventoryAllocation).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return aId;
  } catch (error) {
    console.error(`Error saving inventory allocation ${aId}:`, error);
    throw error;
  }
}

export async function deleteInventoryAllocation(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, INVENTORY_ALLOCATIONS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error(`Error deleting inventory allocation ${id}:`, error);
    return false;
  }
}

export async function getInventoryAllocationsByResource(resourceId: string): Promise<InventoryAllocation[]> {
  try {
    const q = query(collection(db, INVENTORY_ALLOCATIONS_COLLECTION), where('resourceId', '==', resourceId));
    const querySnapshot = await getDocs(q);
    const list: InventoryAllocation[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as InventoryAllocation);
    });
    return list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  } catch (error) {
    console.error(`Error listing allocations for resource ${resourceId}:`, error);
    return [];
  }
}

export async function checkResourceAvailability(
  resourceId: string, 
  startAt: string, 
  endAt: string, 
  excludeAllocationId?: string
): Promise<boolean> {
  try {
    const allocations = await getInventoryAllocationsByResource(resourceId);
    const reqStart = new Date(startAt).getTime();
    const reqEnd = new Date(endAt).getTime();

    for (const alloc of allocations) {
      if (excludeAllocationId && alloc.id === excludeAllocationId) {
        continue;
      }
      const allocStart = new Date(alloc.startAt).getTime();
      const allocEnd = new Date(alloc.endAt).getTime();

      // Check temporal overlap: startAt < alloc.endAt && endAt > alloc.startAt
      if (reqStart < allocEnd && reqEnd > allocStart) {
        return false; // Conflict found
      }
    }
    return true; // No conflict
  } catch (error) {
    console.error(`Error checking availability for resource ${resourceId}:`, error);
    return false; // Safely fail-closed on error
  }
}

// --- Assignments ---

export async function saveAssignment(assignment: Omit<Assignment, 'assignedAt' | 'updatedAt'>): Promise<string> {
  const asgId = assignment.id;
  try {
    const docRef = doc(db, ASSIGNMENTS_COLLECTION, asgId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();
    
    const data: Assignment = {
      ...assignment,
      assignedAt: existing.exists() ? (existing.data() as Assignment).assignedAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return asgId;
  } catch (error) {
    console.error(`Error saving assignment ${asgId}:`, error);
    throw error;
  }
}

export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, ASSIGNMENTS_COLLECTION, id));
    return true;
  } catch (error) {
    console.error(`Error deleting assignment ${id}:`, error);
    return false;
  }
}

export async function getAssignmentsByItinerary(itineraryId: string): Promise<Assignment[]> {
  try {
    const q = query(collection(db, ASSIGNMENTS_COLLECTION), where('itineraryId', '==', itineraryId));
    const querySnapshot = await getDocs(q);
    const list: Assignment[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Assignment);
    });
    return list;
  } catch (error) {
    console.error(`Error listing assignments for itinerary ${itineraryId}:`, error);
    return [];
  }
}

// --- Operational Itineraries ---

export async function saveOperationalItinerary(itinerary: Omit<OperationalItinerary, 'createdAt' | 'updatedAt'>): Promise<string> {
  const opitId = itinerary.id;
  try {
    const docRef = doc(db, OPERATIONAL_ITINERARIES_COLLECTION, opitId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();
    
    const data: OperationalItinerary = {
      ...itinerary,
      createdAt: existing.exists() ? (existing.data() as OperationalItinerary).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return opitId;
  } catch (error) {
    console.error(`Error saving operational itinerary ${opitId}:`, error);
    throw error;
  }
}

export async function getOperationalItineraryById(id: string): Promise<OperationalItinerary | null> {
  try {
    const docSnap = await getDoc(doc(db, OPERATIONAL_ITINERARIES_COLLECTION, id));
    if (docSnap.exists()) {
      return docSnap.data() as OperationalItinerary;
    }
    return null;
  } catch (error) {
    console.error(`Error getting operational itinerary ${id}:`, error);
    return null;
  }
}

export async function getOperationalItineraryByBooking(bookingId: string): Promise<OperationalItinerary | null> {
  try {
    const q = query(collection(db, OPERATIONAL_ITINERARIES_COLLECTION), where('bookingId', '==', bookingId));
    const querySnapshot = await getDocs(q);
    let itinerary: OperationalItinerary | null = null;
    querySnapshot.forEach((docSnap) => {
      itinerary = docSnap.data() as OperationalItinerary;
    });
    return itinerary;
  } catch (error) {
    console.error(`Error getting operational itinerary for booking ${bookingId}:`, error);
    return null;
  }
}
