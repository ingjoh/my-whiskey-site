import { adminDb } from './firebase-admin';
import { UsageRecord } from './db';

/**
 * Logs a silent usage/metered record in Firestore for billing/analytics tracking.
 */
export async function logUsage(record: Omit<UsageRecord, 'id' | 'timestamp'>): Promise<string> {
  try {
    const usageCol = adminDb.collection('usage_records');
    const docRef = usageCol.doc();
    const id = docRef.id;
    const timestamp = new Date().toISOString();
    
    const usageData: UsageRecord = {
      ...record,
      id,
      timestamp
    };
    
    await docRef.set(usageData);
    console.log(`[Usage Logged] Org: ${record.organizationId}, Type: ${record.type}, Units: ${record.units}, CostEst: $${record.costEst}`);
    return id;
  } catch (error) {
    console.error('Error logging usage record in Firestore Admin SDK:', error);
    // Silent fail in case DB is down to not block the user action
    return '';
  }
}
