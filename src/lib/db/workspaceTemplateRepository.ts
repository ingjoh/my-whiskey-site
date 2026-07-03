export interface WorkspaceTemplate {
  id: string;
  templateVersion: number;
  defaultModules: string[];
  governanceDefaults: {
    privacy: 'private' | 'shared' | 'public';
    allowAiAgents: boolean;
    allowExternalInvites: boolean;
    dataRetentionDays?: number;
  };
  brandDefaults: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
  };
  websiteDefaults: {
    layout: string;
    navigation: any[];
  };
}

export class WorkspaceTemplateRepository {
  private static templates: Record<string, WorkspaceTemplate> = {
    wt_business: {
      id: 'wt_business',
      templateVersion: 1,
      defaultModules: ['chat', 'calendar', 'budget'],
      governanceDefaults: {
        privacy: 'private',
        allowAiAgents: false,
        allowExternalInvites: true
      },
      brandDefaults: {
        primaryColor: '#D8C7AF',
        secondaryColor: '#1C1F22'
      },
      websiteDefaults: {
        layout: 'standard',
        navigation: []
      }
    },
    wt_collaboration: {
      id: 'wt_collaboration',
      templateVersion: 1,
      defaultModules: ['chat', 'voting'],
      governanceDefaults: {
        privacy: 'shared',
        allowAiAgents: true,
        allowExternalInvites: true
      },
      brandDefaults: {
        primaryColor: '#34D399',
        secondaryColor: '#111827'
      },
      websiteDefaults: {
        layout: 'minimal',
        navigation: []
      }
    },
    wt_blank: {
      id: 'wt_blank',
      templateVersion: 1,
      defaultModules: [],
      governanceDefaults: {
        privacy: 'private',
        allowAiAgents: false,
        allowExternalInvites: false
      },
      brandDefaults: {
        primaryColor: '#9CA3AF',
        secondaryColor: '#1F2937'
      },
      websiteDefaults: {
        layout: 'none',
        navigation: []
      }
    }
  };

  static findById(id: string): WorkspaceTemplate | null {
    return this.templates[id] || null;
  }

  static getAll(): WorkspaceTemplate[] {
    return Object.values(this.templates);
  }
}
