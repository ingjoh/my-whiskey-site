import { adminDb } from '../firebase-admin';

export interface WorkspaceConfiguration {
  workspaceId: string;
  templateId?: string;
  templateVersion?: number;
  identity: {
    name: string;
    contactEmail: string;
    operatorOrgId?: string;
  };
  brand: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  website: {
    subdomain: string;
    customDomain?: string;
    layout: string;
    navigation: any[];
  };
  // Extensible aggregate bucket for future capabilities (AI helpers, Localizations, etc.)
  extensibleSettings?: Record<string, any>;
}

export class WorkspaceConfigurationRepository {
  private static collection = adminDb.collection('workspace_configurations');

  static async findByWorkspaceId(workspaceId: string): Promise<WorkspaceConfiguration | null> {
    const doc = await this.collection.doc(workspaceId).get();
    if (!doc.exists) return null;
    return doc.data() as WorkspaceConfiguration;
  }

  static async create(config: WorkspaceConfiguration): Promise<void> {
    const cleanData = JSON.parse(JSON.stringify(config));
    await this.collection.doc(config.workspaceId).set(cleanData);
  }

  static async update(workspaceId: string, updates: Partial<WorkspaceConfiguration>): Promise<void> {
    await this.collection.doc(workspaceId).update(updates);
  }
}
