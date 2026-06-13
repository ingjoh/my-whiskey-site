'use client';

import React, { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function RedirectContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!params) return;

    const rawType = params.type as string;
    const slug = params.slug as string;

    if (!rawType || !slug) {
      router.replace('/');
      return;
    }

    // Normalize type (staff, company, location)
    let type = 'company';
    const typeLower = rawType.toLowerCase();
    if (typeLower === 'staff' || typeLower === 'crew' || typeLower === 'captain') {
      type = 'staff';
    } else if (typeLower === 'location' || typeLower === 'port') {
      type = 'location';
    }

    // Campaign source override or general redirect campaign
    const campaign = searchParams ? (searchParams.get('campaign') || 'qr_redirect') : 'qr_redirect';
    const cookieExpirySeconds = 30 * 24 * 60 * 60; // 30 Days

    // Helper to write secure cookies
    const setCookie = (name: string, value: string) => {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const cookieStr = `${name}=${encodeURIComponent(value)}; path=/; max-age=${cookieExpirySeconds}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      document.cookie = cookieStr;
    };

    // Record attribution cookies
    setCookie('whiskey_referred_by_id', slug);
    setCookie('whiskey_referred_by_type', type);
    
    // UTM tracking details for Google Analytics / print analytics
    setCookie('whiskey_utm_source', 'print');
    setCookie('whiskey_utm_medium', 'collateral');
    setCookie('whiskey_utm_campaign', campaign);

    // Save LocalStorage backup for state recovery
    try {
      localStorage.setItem('whiskey_referred_by_id', slug);
      localStorage.setItem('whiskey_referred_by_type', type);
      localStorage.setItem('whiskey_utm_source', 'print');
      localStorage.setItem('whiskey_utm_medium', 'collateral');
      localStorage.setItem('whiskey_utm_campaign', campaign);
    } catch (e) {
      console.warn('LocalStorage bypass during redirect:', e);
    }

    // Process promo / discount code if present
    const promo = searchParams ? (searchParams.get('promo') || searchParams.get('discount')) : null;
    if (promo) {
      setCookie('whiskey_promo_code', promo);
      try {
        localStorage.setItem('whiskey_promo_code', promo);
      } catch (e) {}
    }

    // Build landing URL forwarding all attribution variables
    const redirectParams = new URLSearchParams();
    redirectParams.set('ref', `${type}:${slug}`);
    redirectParams.set('utm_source', 'print');
    redirectParams.set('utm_medium', 'collateral');
    redirectParams.set('utm_campaign', campaign);
    if (promo) {
      redirectParams.set('promo', promo);
    }

    // Forward any other searchParams that aren't already handled
    if (searchParams) {
      searchParams.forEach((val, key) => {
        const keyLower = key.toLowerCase();
        if (!['campaign', 'ref', 'promo', 'discount', 'utm_source', 'utm_medium', 'utm_campaign'].includes(keyLower)) {
          redirectParams.set(key, val);
        }
      });
    }

    // Execute redirection to landing home page with query params
    router.replace(`/?${redirectParams.toString()}`);
  }, [params, router, searchParams]);

  return (
    <div style={{ background: '#121416', color: '#F4F1EA', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontFamily: 'Georgia, serif', color: '#B9783B', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Welcome to M/Y Whiskey</h3>
        <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Redirecting to our booking platform...</p>
      </div>
    </div>
  );
}

export default function QRRedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#121416', color: '#F4F1EA', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h3>Loading Booking portal...</h3>
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
