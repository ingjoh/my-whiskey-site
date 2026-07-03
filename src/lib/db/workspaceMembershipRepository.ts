import { adminDb } from '../firebase-admin';

export interface WorkspaceMembershipDocument {
  id: string;
  workspaceId: string;
  personId: string;
  role: 'owner' | 'coordinator' | 'member' | 'viewer';
  status: 'pending' | 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceMembershipRepository {
  private static collection = adminDb.collection('workspace_memberships');

  static async findById(id: string): Promise<WorkspaceMembershipDocument | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as WorkspaceMembershipDocument;
  }

  static async findByWorkspaceAndPerson(workspaceId: string, personId: string): Promise<WorkspaceMembershipDocument | null> {
    const snap = await this.collection
      .where('workspaceId', '==', workspaceId)
      .where('personId', '==', personId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as WorkspaceMembershipDocument;
  }

  static async create(membership: WorkspaceMembershipDocument): Promise<void> {
    await this.collection.doc(membership.id).set(membership);
  }

  static async update(id: string, updates: Partial<WorkspaceMembershipDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  static async listByWorkspace(workspaceId: string): Promise<WorkspaceMembershipDocument[]> {
    const snap = await this.collection.where('workspaceId', '==', workspaceId).get();
    return snap.docs.map(doc => doc.data() as WorkspaceMembershipDocument);
  }
}
