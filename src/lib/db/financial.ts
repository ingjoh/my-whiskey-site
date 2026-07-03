import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Collection Constants
export const SETTLEMENTS_COLLECTION = 'settlements';
export const INVOICES_COLLECTION = 'invoices';
export const TRANSACTIONS_COLLECTION = 'transactions';
export const PAYOUTS_COLLECTION = 'payouts';

// Interfaces matching refined Epic 4 specifications

export interface SettlementSplit {
  type: 'platform_fee' | 'owner_revenue' | 'captain_payout' | 'crew_payout' | 'partner_commission' | 'tax' | 'adjust';
  recipientType?: 'person' | 'organization' | 'resource';
  recipientId?: string;
  amount: number;
  description?: string;
}

export interface Settlement {
  id: string;                // set_<uuid>
  tenantId: string;
  originType: 'booking' | 'membership' | 'subscription' | 'manual';
  originId: string;          // e.g. Booking ID or Subscription ID
  status: 'pending' | 'posted' | 'reconciled';
  totals: {
    commercialGrandTotal: number;
    collectedAmount: number;
    balanceDue: number;
  };
  splits: SettlementSplit[];
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;                // invc_<uuid>
  tenantId: string;
  originType: 'booking' | 'membership' | 'subscription' | 'manual';
  originId: string;          // e.g. Booking ID or Subscription ID
  billToType: 'person' | 'organization';
  billToId: string;          // References /people/{personId} or /organizations/{orgId}
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue: number;
  dueDate: string;           // ISO date
  paymentTerms: string;      // e.g. "due_on_receipt", "net_30"
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;                // tx_<uuid>
  tenantId: string;
  settlementId: string;      // References Settlement.id
  type: 'charge' | 'refund' | 'payout' | 'adjustment' | 'credit';
  method: 'stripe_card' | 'stripe_ach' | 'bank_transfer' | 'cash' | 'credit_balance';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  amount: number;            // Positive for incoming, negative for outgoing
  gatewayReferenceId?: string; // Stripe charge/paymentIntent/refund ID or wire trace
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;                // po_<uuid>
  tenantId: string;
  recipientType: 'person' | 'organization' | 'resource';
  recipientId: string;       // References Person, Organization, or Resource ID
  settlementId: string;      // References source Settlement.id
  amount: number;
  status: 'draft' | 'approved' | 'processing' | 'paid' | 'failed';
  gatewayTransferId?: string;// Stripe Connected Account Transfer ID
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DB Controller Implementations
// ==========================================

// --- Settlements ---

export async function saveSettlement(settlement: Omit<Settlement, 'createdAt' | 'updatedAt'>): Promise<string> {
  const sId = settlement.id;
  try {
    const docRef = doc(db, SETTLEMENTS_COLLECTION, sId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();

    const data: Settlement = {
      ...settlement,
      createdAt: existing.exists() ? (existing.data() as Settlement).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return sId;
  } catch (error) {
    console.error(`Error saving settlement ${sId}:`, error);
    throw error;
  }
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  try {
    const docSnap = await getDoc(doc(db, SETTLEMENTS_COLLECTION, id));
    if (docSnap.exists()) {
      return docSnap.data() as Settlement;
    }
    return null;
  } catch (error) {
    console.error(`Error getting settlement ${id}:`, error);
    return null;
  }
}

export async function getSettlementsByOrigin(originType: string, originId: string): Promise<Settlement[]> {
  try {
    const q = query(
      collection(db, SETTLEMENTS_COLLECTION),
      where('originType', '==', originType),
      where('originId', '==', originId)
    );
    const querySnapshot = await getDocs(q);
    const list: Settlement[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Settlement);
    });
    return list;
  } catch (error) {
    console.error(`Error listing settlements for origin ${originType}/${originId}:`, error);
    return [];
  }
}

// --- Invoices ---

export async function saveInvoice(invoice: Omit<Invoice, 'createdAt' | 'updatedAt'>): Promise<string> {
  const invcId = invoice.id;
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invcId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();

    const data: Invoice = {
      ...invoice,
      createdAt: existing.exists() ? (existing.data() as Invoice).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return invcId;
  } catch (error) {
    console.error(`Error saving invoice ${invcId}:`, error);
    throw error;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const docSnap = await getDoc(doc(db, INVOICES_COLLECTION, id));
    if (docSnap.exists()) {
      return docSnap.data() as Invoice;
    }
    return null;
  } catch (error) {
    console.error(`Error getting invoice ${id}:`, error);
    return null;
  }
}

export async function getInvoicesByOrigin(originType: string, originId: string): Promise<Invoice[]> {
  try {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where('originType', '==', originType),
      where('originId', '==', originId)
    );
    const querySnapshot = await getDocs(q);
    const list: Invoice[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Invoice);
    });
    return list;
  } catch (error) {
    console.error(`Error listing invoices for origin ${originType}/${originId}:`, error);
    return [];
  }
}

// --- Transactions ---

export async function saveTransaction(tx: Omit<Transaction, 'createdAt' | 'updatedAt'>): Promise<string> {
  const txId = tx.id;
  try {
    const docRef = doc(db, TRANSACTIONS_COLLECTION, txId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();

    const data: Transaction = {
      ...tx,
      createdAt: existing.exists() ? (existing.data() as Transaction).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return txId;
  } catch (error) {
    console.error(`Error saving transaction ${txId}:`, error);
    throw error;
  }
}

export async function getTransactionsBySettlement(settlementId: string): Promise<Transaction[]> {
  try {
    const q = query(collection(db, TRANSACTIONS_COLLECTION), where('settlementId', '==', settlementId));
    const querySnapshot = await getDocs(q);
    const list: Transaction[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Transaction);
    });
    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    console.error(`Error listing transactions for settlement ${settlementId}:`, error);
    return [];
  }
}

// --- Payouts ---

export async function savePayout(payout: Omit<Payout, 'createdAt' | 'updatedAt'>): Promise<string> {
  const poId = payout.id;
  try {
    const docRef = doc(db, PAYOUTS_COLLECTION, poId);
    const existing = await getDoc(docRef);
    const now = new Date().toISOString();

    const data: Payout = {
      ...payout,
      createdAt: existing.exists() ? (existing.data() as Payout).createdAt : now,
      updatedAt: now
    };
    await setDoc(docRef, data);
    return poId;
  } catch (error) {
    console.error(`Error saving payout ${poId}:`, error);
    throw error;
  }
}

export async function getPayoutsBySettlement(settlementId: string): Promise<Payout[]> {
  try {
    const q = query(collection(db, PAYOUTS_COLLECTION), where('settlementId', '==', settlementId));
    const querySnapshot = await getDocs(q);
    const list: Payout[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Payout);
    });
    return list;
  } catch (error) {
    console.error(`Error listing payouts for settlement ${settlementId}:`, error);
    return [];
  }
}
