import crypto from 'crypto';
import { loadSiteSettings } from './db';

/**
 * SHA-256 hashing helper for Meta payload compliance.
 * Inputs must be trimmed and converted to lowercase.
 */
export function hashSHA256(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex');
}

export interface MetaCapiUserParams {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbp?: string;
  fbc?: string;
}

export interface MetaCapiEventParams {
  eventName: 'Purchase' | 'InitiateCheckout' | 'PageView';
  eventId: string; // Used for de-duplication with client-side pixel
  eventSourceUrl: string;
  amount?: number;
  currency?: string;
  userData: MetaCapiUserParams;
}

/**
 * Dispatches a server-side Conversions API tracking event to Meta Graph API.
 */
export async function sendMetaServerEvent(params: MetaCapiEventParams): Promise<boolean> {
  try {
    const settings = await loadSiteSettings();
    
    // Load config from settings (fallback to env variables)
    const pixelId = settings?.injection?.metaPixelId || process.env.META_PIXEL_ID;
    const accessToken = settings?.injection?.metaConversionsApiToken || process.env.META_CONVERSIONS_API_TOKEN;

    if (!pixelId || !accessToken) {
      console.warn('Meta CAPI: Skipping tracking event because META_PIXEL_ID or META_CONVERSIONS_API_TOKEN is not configured.');
      return false;
    }

    const { eventName, eventId, eventSourceUrl, amount, currency, userData } = params;

    // Prepare compliance-hashed user data payload
    const formattedUserData: any = {};

    if (userData.email) {
      formattedUserData.em = [hashSHA256(userData.email)];
    }
    if (userData.phone) {
      // Remove any non-numeric formatting if present
      const cleanPhone = userData.phone.replace(/\D/g, '');
      formattedUserData.ph = [hashSHA256(cleanPhone)];
    }
    if (userData.firstName) {
      formattedUserData.fn = [hashSHA256(userData.firstName)];
    }
    if (userData.lastName) {
      formattedUserData.ln = [hashSHA256(userData.lastName)];
    }
    if (userData.fbp) {
      formattedUserData.fbp = userData.fbp;
    }
    if (userData.fbc) {
      formattedUserData.fbc = userData.fbc;
    }
    if (userData.clientIpAddress) {
      formattedUserData.client_ip_address = userData.clientIpAddress;
    }
    if (userData.clientUserAgent) {
      formattedUserData.client_user_agent = userData.clientUserAgent;
    }

    const eventPayload: any = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: formattedUserData,
    };

    if (amount !== undefined) {
      eventPayload.custom_data = {
        value: amount,
        currency: currency || 'USD',
      };
    }

    const requestBody: any = {
      data: [eventPayload]
    };

    // If a Meta CAPI Test Code is configured (for sandbox debugging in Events Manager), append it
    const testCode = process.env.META_TEST_EVENT_CODE;
    if (testCode) {
      requestBody.test_event_code = testCode;
      console.log(`Meta CAPI: Including test_event_code: ${testCode}`);
    }

    const url = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`;
    
    console.log(`Meta CAPI: Dispatching ${eventName} event (ID: ${eventId}) to Meta...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      console.log(`✓ Meta CAPI: Successfully tracked server event "${eventName}" for ID: ${eventId}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`✗ Meta CAPI Error: Meta API returned status ${response.status}: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('Meta CAPI Exception: Failed to send tracking event:', error);
    return false;
  }
}
