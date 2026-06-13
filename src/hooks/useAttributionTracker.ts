'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function useAttributionTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    const ref = searchParams.get('ref');
    const utmSource = searchParams.get('utm_source');
    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');
    const promo = searchParams.get('promo') || searchParams.get('discount');

    const hasTracking = ref || utmSource || utmMedium || utmCampaign || promo;
    if (!hasTracking) return;

    const cookieExpirySeconds = 30 * 24 * 60 * 60; // 30 Days

    // Helper to write secure cookies
    const setCookie = (name: string, value: string) => {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const cookieStr = `${name}=${encodeURIComponent(value)}; path=/; max-age=${cookieExpirySeconds}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieStr;
    };

    // 1. Process Referral Attribution
    if (ref) {
      let referredById = ref;
      let referredByType: 'company' | 'staff' | 'location' = 'company';

      if (ref.includes(':')) {
        const parts = ref.split(':');
        const prefix = parts[0].toLowerCase();
        referredById = parts.slice(1).join(':'); // join remaining in case id contains colons

        if (prefix === 'staff' || prefix === 'crew' || prefix === 'captain') {
          referredByType = 'staff';
        } else if (prefix === 'location' || prefix === 'port') {
          referredByType = 'location';
        } else {
          referredByType = 'company';
        }
      }

      setCookie('whiskey_referred_by_id', referredById);
      setCookie('whiskey_referred_by_type', referredByType);
      
      // LocalStorage backup
      try {
        localStorage.setItem('whiskey_referred_by_id', referredById);
        localStorage.setItem('whiskey_referred_by_type', referredByType);
      } catch (e) {
        console.warn('LocalStorage disabled, bypassing attribution backup:', e);
      }
      
      console.log(`Attribution recorded: ${referredByType}:${referredById}`);
    }

    // 2. Process UTM Parameters
    if (utmSource) {
      setCookie('whiskey_utm_source', utmSource);
      try { localStorage.setItem('whiskey_utm_source', utmSource); } catch (e) {}
    }
    if (utmMedium) {
      setCookie('whiskey_utm_medium', utmMedium);
      try { localStorage.setItem('whiskey_utm_medium', utmMedium); } catch (e) {}
    }
    if (utmCampaign) {
      setCookie('whiskey_utm_campaign', utmCampaign);
      try { localStorage.setItem('whiskey_utm_campaign', utmCampaign); } catch (e) {}
    }

    // 3. Process Promo / Discount Code
    if (promo) {
      setCookie('whiskey_promo_code', promo);
      try { localStorage.setItem('whiskey_promo_code', promo); } catch (e) {}
      console.log(`Promo attribution recorded: ${promo}`);
    }
    
  }, [searchParams]);
}
