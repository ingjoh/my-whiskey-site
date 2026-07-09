const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID;

export interface VercelDomainVerificationRecord {
  type: string;
  domain: string;
  value: string;
  reason?: string;
}

export interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification?: VercelDomainVerificationRecord[];
}

export class DomainService {
  private static getHeaders() {
    if (!VERCEL_TOKEN) {
      console.warn('[DomainService] VERCEL_API_TOKEN environment variable is not defined.');
    }
    return {
      Authorization: `Bearer ${VERCEL_TOKEN || ''}`,
      'Content-Type': 'application/json',
    };
  }

  private static getUrl(path: string): string {
    const baseUrl = `https://api.vercel.com${path}`;
    const params = new URLSearchParams();
    if (TEAM_ID) {
      params.append('teamId', TEAM_ID);
    }
    const queryStr = params.toString();
    return queryStr ? `${baseUrl}?${queryStr}` : baseUrl;
  }

  /**
   * Registers a custom domain with the Vercel Project
   */
  static async registerCustomDomain(domain: string): Promise<VercelDomainResponse> {
    if (!PROJECT_ID) {
      throw new Error('VERCEL_PROJECT_ID is not configured');
    }

    const url = this.getUrl(`/v9/projects/${PROJECT_ID}/domains`);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name: domain }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Vercel API error (Status: ${response.status})`);
    }

    return {
      name: data.name,
      verified: data.verified || false,
      verification: data.verification || [],
    };
  }

  /**
   * Retrieves registration and verification details for a domain
   */
  static async checkVerificationStatus(domain: string): Promise<VercelDomainResponse> {
    if (!PROJECT_ID) {
      throw new Error('VERCEL_PROJECT_ID is not configured');
    }

    const url = this.getUrl(`/v9/projects/${PROJECT_ID}/domains/${domain}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Vercel API error (Status: ${response.status})`);
    }

    return {
      name: data.name,
      verified: data.verified || false,
      verification: data.verification || [],
    };
  }

  /**
   * Removes a custom domain from the Vercel Project
   */
  static async removeCustomDomain(domain: string): Promise<void> {
    if (!PROJECT_ID) {
      throw new Error('VERCEL_PROJECT_ID is not configured');
    }

    const url = this.getUrl(`/v9/projects/${PROJECT_ID}/domains/${domain}`);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error?.message || `Vercel API error (Status: ${response.status})`);
    }
  }
}
