import { adminDb } from '../firebase-admin';

export interface WorkspaceAuditEventDocument {
  id: string;
  workspaceId: string;
  eventType: 'WorkspaceCreated' | 'MemberInvited' | 'MemberJoined' | 'MembershipRevoked' | 'BindingCreated' | 'BindingDeleted' | 'GovernanceChanged';
  actorId: string;
  details: Record<string, any>;
  timestamp: string;
}

export class WorkspaceAuditEventRepository {
  private static collection = adminDb.collection('workspace_audit_events');

  static async create(event: WorkspaceAuditEventDocument): Promise<void> {
    await this.collection.doc(event.id).set(event);
  }

  static async listByWorkspace(workspaceId: string): Promise<WorkspaceAuditEventDocument[]> {
    const snap = await this.collection
      .where('workspaceId', '==', workspaceId)
      .get();
    const docs = snap.docs.map(doc => doc.data() as WorkspaceAuditEventDocument);
    return docs.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}
