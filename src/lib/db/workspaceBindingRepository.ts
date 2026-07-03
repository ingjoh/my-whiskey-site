import { adminDb } from '../firebase-admin';

export interface WorkspaceBindingDocument {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  config: {
    visibility?: string[];
    presentation?: Record<string, any>;
    commercial?: Record<string, any>;
    operational?: Record<string, any>;
    policy?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

export class WorkspaceBindingRepository {
  private static collection = adminDb.collection('workspace_bindings');

  static async findById(id: string): Promise<WorkspaceBindingDocument | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as WorkspaceBindingDocument;
  }

  static async findByWorkspaceAndEntity(workspaceId: string, entityType: string, entityId: string): Promise<WorkspaceBindingDocument | null> {
    const snap = await this.collection
      .where('workspaceId', '==', workspaceId)
      .where('entityType', '==', entityType)
      .where('entityId', '==', entityId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as WorkspaceBindingDocument;
  }

  static async create(binding: WorkspaceBindingDocument): Promise<void> {
    await this.collection.doc(binding.id).set(binding);
  }

  static async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  static async listByWorkspace(workspaceId: string): Promise<WorkspaceBindingDocument[]> {
    const snap = await this.collection.where('workspaceId', '==', workspaceId).get();
    return snap.docs.map(doc => doc.data() as WorkspaceBindingDocument);
  }
}
