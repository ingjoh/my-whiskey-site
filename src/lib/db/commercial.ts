import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Collection Constants
export const EXPERIENCES_COLLECTION = 'experiences';
export const LISTINGS_COLLECTION = 'listings';
export const PROPOSALS_COLLECTION = 'proposals';
export const OFFERS_COLLECTION = 'offers';
export const BOOKINGS_COLLECTION = 'bookings';

// Interfaces matching Epic 2 schemas

export interface Experience {
  id: string;              // exp_<uuid>
  title: string;
  shortDescription: string;
  description: string;
  heroImage?: string;
  gallery?: Array<{ url: string; type: 'image' | 'video' }>;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryTemplate {
  id: string;              // itemp_<uuid>
  experienceId: string;    // References Experience.id
  name: string;
  durationMinutes: number;
  stops: Array<{
    name: string;
    durationMinutes: number;
    description?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;              // list_<uuid>
  tenantId: string;        // Logical Isolation Tenant (Organization ID)
  experienceId: string;    // References Experience.id
  status: 'active' | 'inactive';
  pricing: {
    baseRate: number;
    extraGuestRate: number;
    depositAmount: number;
    taxRate: number;
  };
  schedulingConfig: {
    leadTimeMinutes: number;
    allowedVesselCategories: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Proposal {
  id: string;              // prop_<uuid>
  tenantId: string;        // Logical Isolation Tenant (Organization ID)
  recipientId: string;     // References Person.id
  senderId: string;        // References Person.id
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'declined';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;              // off_<uuid>
  tenantId: string;        // Logical Isolation Tenant (Organization ID)
  proposalId: string;      // References Proposal.id
  experienceId: string;    // References Experience.id
  itineraryTemplateId: string; // References ItineraryTemplate.id
  listingId: string;       // References Listing.id
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  isAccepted: boolean;
  pricingSnapshot: {
    subtotal: number;
    taxes: number;
    grandTotal: number;
    depositRequired: number;
    listingBaseRateSnapshot: number;
    listingExtraGuestRateSnapshot: number;
    listingTaxRateSnapshot: number;
    listingCancelPolicySnapshot?: string;
  };
  schedulingSnapshot: {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
  resourcePreferences: {
    vesselCategory: string;
    crewCountRequired: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;              // book_<uuid>
  tenantId: string;        // Logical Isolation Tenant (Organization ID)
  acceptedOfferId: string; // References Offer.id
  guestId: string;         // References Person.id
  status: 'confirmed' | 'pending_waiver' | 'cancelled';
  paymentStatus: 'deposit_paid' | 'fully_paid' | 'refunded';
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Database Helpers

/**
 * Retrieves an Experience by ID.
 */
export async function getExperience(id: string): Promise<Experience | null> {
  try {
    const docRef = doc(db, EXPERIENCES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Experience;
    }
    return null;
  } catch (error) {
    console.error('Error loading experience:', error);
    return null;
  }
}

/**
 * Retrieves Itinerary Templates associated with an Experience.
 */
export async function getExperienceItineraryTemplates(experienceId: string): Promise<ItineraryTemplate[]> {
  try {
    const subColRef = collection(db, EXPERIENCES_COLLECTION, experienceId, 'itinerary_templates');
    const snapshot = await getDocs(subColRef);
    const templates: ItineraryTemplate[] = [];
    snapshot.forEach((d) => {
      templates.push(d.data() as ItineraryTemplate);
    });
    return templates;
  } catch (error) {
    console.error('Error loading itinerary templates:', error);
    return [];
  }
}

/**
 * Retrieves a Listing by ID.
 */
export async function getListing(id: string): Promise<Listing | null> {
  try {
    const docRef = doc(db, LISTINGS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Listing;
    }
    return null;
  } catch (error) {
    console.error('Error loading listing:', error);
    return null;
  }
}

/**
 * Retrieves Listings scoped to a Tenant.
 */
export async function getListingsByTenant(tenantId: string): Promise<Listing[]> {
  try {
    const q = query(collection(db, LISTINGS_COLLECTION), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    const listings: Listing[] = [];
    snapshot.forEach((d) => {
      listings.push(d.data() as Listing);
    });
    return listings;
  } catch (error) {
    console.error('Error loading listings by tenant:', error);
    return [];
  }
}

/**
 * Retrieves a Proposal by ID.
 */
export async function getProposal(id: string): Promise<Proposal | null> {
  try {
    const docRef = doc(db, PROPOSALS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Proposal;
    }
    return null;
  } catch (error) {
    console.error('Error loading proposal:', error);
    return null;
  }
}

/**
 * Retrieves Offers belonging to a Proposal.
 */
export async function getProposalOffers(proposalId: string): Promise<Offer[]> {
  try {
    const q = query(collection(db, OFFERS_COLLECTION), where('proposalId', '==', proposalId));
    const snapshot = await getDocs(q);
    const offers: Offer[] = [];
    snapshot.forEach((d) => {
      offers.push(d.data() as Offer);
    });
    return offers;
  } catch (error) {
    console.error('Error loading offers by proposal:', error);
    return [];
  }
}

/**
 * Retrieves an Offer by ID.
 */
export async function getOffer(id: string): Promise<Offer | null> {
  try {
    const docRef = doc(db, OFFERS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Offer;
    }
    return null;
  } catch (error) {
    console.error('Error loading offer:', error);
    return null;
  }
}

/**
 * Retrieves a Booking by ID.
 */
export async function getBooking(id: string): Promise<Booking | null> {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Booking;
    }
    return null;
  } catch (error) {
    console.error('Error loading booking:', error);
    return null;
  }
}

/**
 * Saves or updates an Experience.
 */
export async function saveExperience(exp: Experience): Promise<boolean> {
  try {
    const docRef = doc(db, EXPERIENCES_COLLECTION, exp.id);
    await setDoc(docRef, {
      ...exp,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving experience:', error);
    return false;
  }
}

/**
 * Saves or updates an ItineraryTemplate.
 */
export async function saveItineraryTemplate(temp: ItineraryTemplate): Promise<boolean> {
  try {
    const docRef = doc(db, EXPERIENCES_COLLECTION, temp.experienceId, 'itinerary_templates', temp.id);
    await setDoc(docRef, {
      ...temp,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving itinerary template:', error);
    return false;
  }
}

/**
 * Saves or updates a Listing.
 */
export async function saveListing(list: Listing): Promise<boolean> {
  try {
    const docRef = doc(db, LISTINGS_COLLECTION, list.id);
    await setDoc(docRef, {
      ...list,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving listing:', error);
    return false;
  }
}

/**
 * Saves or updates a Proposal.
 */
export async function saveProposal(prop: Proposal): Promise<boolean> {
  try {
    const docRef = doc(db, PROPOSALS_COLLECTION, prop.id);
    await setDoc(docRef, {
      ...prop,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving proposal:', error);
    return false;
  }
}

/**
 * Saves or updates an Offer.
 */
export async function saveOffer(off: Offer): Promise<boolean> {
  try {
    const docRef = doc(db, OFFERS_COLLECTION, off.id);
    await setDoc(docRef, {
      ...off,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving offer:', error);
    return false;
  }
}

/**
 * Saves or updates a Booking.
 */
export async function saveBooking(book: Booking): Promise<boolean> {
  try {
    const docRef = doc(db, BOOKINGS_COLLECTION, book.id);
    await setDoc(docRef, {
      ...book,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving booking:', error);
    return false;
  }
}
