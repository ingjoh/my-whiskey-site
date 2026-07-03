import { WorkspaceConfigurationRepository, WorkspaceConfiguration } from '../db/workspaceConfigurationRepository';
import { WorkspaceRepository, WorkspaceDocument } from '../db/workspaceRepository';

export const RESERVED_SUBDOMAINS = [
  'www', 'app', 'admin', 'api', 'auth', 
  'docs', 'status', 'support', 
  'cdn', 'assets', 'media', 
  'dev', 'staging', 'preview', 
  'login', 'account', 'mail'
];

export interface ResolvedWorkspaceContext {
  workspaceId: string | null;
  status: WorkspaceDocument['status'] | null;
  subdomain: string | null;
  customDomain: string | null;
  error?: string;
}

export class WorkspaceResolver {
  /**
   * Resolves the canonical workspace metadata from domain/subdomain/slug settings.
   */
  static async resolveWorkspace(identifier: string, isCustomDomain = false): Promise<ResolvedWorkspaceContext> {
    try {
      // 1. Reserved domain protection check
      if (!isCustomDomain && RESERVED_SUBDOMAINS.includes(identifier.toLowerCase())) {
        return { workspaceId: null, status: null, subdomain: identifier, customDomain: null };
      }

      // 2. Query workspace configurations
      let config: WorkspaceConfiguration | null = null;
      if (isCustomDomain) {
        config = await WorkspaceConfigurationRepository.findByCustomDomain(identifier);
      } else {
        config = await WorkspaceConfigurationRepository.findBySubdomain(identifier);
      }

      if (!config) {
        return { workspaceId: null, status: null, subdomain: isCustomDomain ? null : identifier, customDomain: isCustomDomain ? identifier : null };
      }

      // 3. Fetch status and verify administrative lifecycle state constraints
      const ws = await WorkspaceRepository.findById(config.workspaceId);
      if (!ws) {
        return { workspaceId: null, status: null, subdomain: config.website.subdomain, customDomain: config.website.customDomain || null };
      }

      if (ws.status === 'suspended') {
        return {
          workspaceId: ws.id,
          status: 'suspended',
          subdomain: config.website.subdomain,
          customDomain: config.website.customDomain || null,
          error: 'Workspace is suspended'
        };
      }

      return {
        workspaceId: ws.id,
        status: ws.status,
        subdomain: config.website.subdomain,
        customDomain: config.website.customDomain || null
      };

    } catch (err: any) {
      console.error('Error resolving workspace:', err);
      return { workspaceId: null, status: null, subdomain: null, customDomain: null, error: err.message };
    }
  }

  static async getActiveWorkspaceId(): Promise<string> {
    let slug: string | null = null;
    let domain: string | null = null;
    try {
      const { headers } = require('next/headers');
      const headersList = await headers();
      slug = headersList.get('x-workspace-slug');
      domain = headersList.get('x-custom-domain');
    } catch (e) {
      console.warn('Could not read request headers for workspace resolution:', e);
    }

    if (slug) {
      const res = await this.resolveWorkspace(slug, false);
      if (res.error === 'Workspace is suspended') {
        throw new Error('Workspace is suspended');
      }
      if (res.workspaceId) return res.workspaceId;
    }
    if (domain) {
      const res = await this.resolveWorkspace(domain, true);
      if (res.error === 'Workspace is suspended') {
        throw new Error('Workspace is suspended');
      }
      if (res.workspaceId) return res.workspaceId;
    }

    return 'ws_whiskey';
  }

  static async getSiteSettings(workspaceId: string): Promise<any> {
    const { WorkspaceConfigurationRepository } = require('../db/workspaceConfigurationRepository');
    const config = await WorkspaceConfigurationRepository.findByWorkspaceId(workspaceId);
    if (!config) return null;

    return {
      brand: {
        logoSquareUrl: config.brand.logoUrl || '',
        logoRectUrl: config.brand.logoUrl || '',
        name: config.identity.name,
        colors: [
          { name: 'Primary', value: config.brand.primaryColor },
          { name: 'Secondary', value: config.brand.secondaryColor }
        ]
      },
      typography: {
        headingFontFamily: "'Outfit', sans-serif",
        bodyFontFamily: "'Outfit', sans-serif"
      },
      contact: {
        email: config.identity.contactEmail,
        phone: '',
        address: ''
      },
      social: {
        instagram: '',
        facebook: '',
        youtube: ''
      },
      legal: {
        companyName: config.identity.name,
        taxId: ''
      }
    };
  }
}
