import { adminDb } from '../firebase-admin';

export interface WorkspaceDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  objectiveTemplate?: string;
  templateId?: string;
  modules?: string[];
  governance: {
    privacy: 'private' | 'shared' | 'public';
    allowAiAgents: boolean;
    allowExternalInvites: boolean;
    dataRetentionDays?: number;
  };
  status: 'draft' | 'provisioning' | 'active' | 'suspended' | 'archived';
}

export class WorkspaceRepository {
  private static collection = adminDb.collection('workspaces');

  static async findById(id: string): Promise<WorkspaceDocument | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as WorkspaceDocument;
  }

  static async create(workspace: WorkspaceDocument): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(workspace));
    await this.collection.doc(workspace.id).set(cleanData);
  }

  static async update(id: string, updates: Partial<WorkspaceDocument>): Promise<void> {
    await this.collection.doc(id).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }
}
