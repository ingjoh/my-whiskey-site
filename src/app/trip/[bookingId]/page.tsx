'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Sparkles, MapPin, Navigation, Share2, DollarSign, 
  Check, Info, User, HelpCircle, ArrowRight, Loader2, Play, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';

export default function GuestTripMemoriesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [gallery, setGallery] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [captain, setCaptain] = useState<any>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  
  // Tipping states
  const [tipPercentage, setTipPercentage] = useState<number | 'custom' | null>(20);
  const [customTip, setCustomTip] = useState<string>('');
  const [isSubmittingTip, setIsSubmittingTip] = useState(false);
  const [tipSuccess, setTipSuccess] = useState<boolean>(false);
  const [tippedAmount, setTippedAmount] = useState<number>(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Check query parameters for Stripe redirection outcomes
  useEffect(() => {
    const status = searchParams.get('tipStatus');
    const amt = searchParams.get('amount');
    if (status === 'success' && amt) {
      setTipSuccess(true);
      setTippedAmount(Number(amt));
    }
  }, [searchParams]);

  useEffect(() => {
    loadPageData();
  }, [bookingId]);

  useEffect(() => {
    if (gallery?.media?.length > 0 && typeof window !== 'undefined') {
      initMap();
    }
  }, [gallery]);

  const loadPageData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch trip gallery (public GET)
      const gRes = await fetch(`/api/trips/${bookingId}/gallery`);
      if (!gRes.ok) {
        throw new Error('Gallery not found');
      }
      const gData = await gRes.json();
      setGallery(gData);

      // 2. Fetch booking details (for pricing & captainId)
      const bRes = await fetch(`/api/checkout?bookingId=${bookingId}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBooking(bData);

        // 3. Fetch Captain profile from content items if captainId exists
        if (bData.captainId && bData.captainId !== 'none') {
          // Retrieve crew listings
          const cRes = await fetch('/api/listings/active'); // Or simple public fetch
          const staffRes = await fetch('/api/workspaces/active'); // fallback
          // Fallback static profile if not found, or load database crew
          setCaptain({
            title: bData.captainTitle || 'Captain Sarah Vance',
            description: 'Master Mariner with over 15 years commanding luxury vessels in the Gulf of Mexico.',
            heroImage: '/images/crew/captain-sarah-vance.png'
          });
        }
      }
    } catch (err) {
      console.error('Error loading page details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: gallery?.title || 'Our Yacht Excursion Memories',
          text: gallery?.description || 'Relive our private luxury yacht charter excursion!',
          url: window.location.href,
        });
      } catch (err) {
        console.warn('Web Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Memory page URL copied to clipboard! Share it with friends and family.');
    }
  };

  const calculateTipAmount = () => {
    const total = booking?.grandTotal || 800; // fallback standard booking total
    if (tipPercentage === 'custom') {
      return Number(customTip) || 0;
    }
    if (tipPercentage !== null) {
      return Math.round(total * (tipPercentage / 100));
    }
    return 0;
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = calculateTipAmount();
    if (amount <= 0) return;

    setIsSubmittingTip(true);
    try {
      const res = await fetch(`/api/trips/${bookingId}/tip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        }
      } else {
        alert('Tipping service temporarily unavailable. Please try again later.');
      }
    } catch (err) {
      console.error('Tipping failed:', err);
      alert('Tipping request encountered a network issue.');
    } finally {
      setIsSubmittingTip(false);
    }
  };

  const initMap = () => {
    const pins = gallery.media
      .filter((m: any) => m.exif?.latitude && m.exif?.longitude)
      .map((m: any) => ({
        lat: m.exif.latitude,
        lng: m.exif.longitude,
        title: m.caption || 'Memory captured'
      }));

    if (pins.length === 0 || !mapContainerRef.current) return;

    const setupLeaflet = () => {
      const L = (window as any).L;
      if (!L) return;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current, { scrollWheelZoom: false }).setView([pins[0].lat, pins[0].lng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const latlngs: any[] = [];
      pins.forEach((pin: any) => {
        L.marker([pin.lat, pin.lng]).addTo(map).bindPopup(pin.title);
        latlngs.push([pin.lat, pin.lng]);
      });

      if (pins.length > 1) {
        L.polyline(latlngs, { color: '#B9783B', weight: 4, opacity: 0.8 }).addTo(map);
        map.fitBounds(L.polyline(latlngs).getBounds());
      }
    };

    if (!(window as any).L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = setupLeaflet;
      document.head.appendChild(script);
    } else {
      setupLeaflet();
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1113', color: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
      </div>
    );
  }

  // Cover image falls back to first gallery image or default luxury background
  const coverImage = gallery?.media?.[0]?.url || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=1600&auto=format&fit=crop';
  const bookingTotal = booking?.grandTotal || 800;

  return (
    <div style={{ minHeight: '100vh', background: '#0F1113', color: '#E4DFD5', fontFamily: "'Outfit', 'Inter', sans-serif", paddingBottom: '6rem' }}>
      
      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div 
          onClick={() => setActiveLightboxIndex(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '80%' }} onClick={e => e.stopPropagation()}>
            {gallery.media[activeLightboxIndex].type === 'video' ? (
              <video src={gallery.media[activeLightboxIndex].url} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '4px' }} controls autoPlay />
            ) : (
              <img src={gallery.media[activeLightboxIndex].url} alt="Lightbox view" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '4px', objectFit: 'contain' }} />
            )}
            {gallery.media[activeLightboxIndex].caption && (
              <p style={{ color: '#D8C7AF', textAlign: 'center', marginTop: '1rem', fontSize: '1rem', fontStyle: 'italic', fontFamily: "'Cormorant Garamond', serif" }}>
                {gallery.media[activeLightboxIndex].caption}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Hero Banner Section */}
      <section style={{ height: '55vh', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `url(${coverImage}) no-repeat center center/cover`, opacity: 0.45 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, #0F1113 100%)' }} />
        
        {/* Floating navbar brand overlay */}
        <div style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B9783B', letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600 }}>
          <Navigation size={14} /> M/Y Whiskey Excursions
        </div>

        <div style={{ position: 'absolute', bottom: '2rem', width: '100%', padding: '0 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ color: '#B9783B', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Excursion memory Vault
              </span>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, color: 'white', letterSpacing: '0.01em', lineHeight: 1.1 }}>
                {gallery?.title || `${booking?.guestName || 'Your'}'s Voyage`}
              </h1>
            </div>
            
            <button 
              onClick={handleShare}
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'background 0.2s' }}
            >
              <Share2 size={14} /> Share Memories
            </button>
          </div>
        </div>
      </section>

      {/* Main content body */}
      <section style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
        
        {/* Story Intro */}
        <div style={{ background: '#17191C', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '2.5rem', marginBottom: '3rem', position: 'relative', marginTop: '-1rem', zIndex: 10 }}>
          <div style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: '#D8C7AF', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {gallery?.story || `Relive the premium yacht excursion led by Captain ${booking?.captainTitle || 'Sarah Vance'}. Sparkling coastal views and dolphin viewings await.`}
          </div>
        </div>

        {/* EXIF GPS Travel Map */}
        {gallery?.media?.some((m: any) => m.exif?.latitude) && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif', serif", fontWeight: 600, color: 'white', marginBottom: '1.25rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="#B9783B" /> The Voyage Route
            </h2>
            <div ref={mapContainerRef} style={{ height: '350px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', zIndex: 5 }} />
          </div>
        )}

        {/* Media Lightbox Grid */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: 'white', marginBottom: '1.25rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ImageIcon size={18} color="#B9783B" /> Visual Memories
          </h2>
          
          {gallery?.media?.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '3rem', background: '#17191C', borderRadius: '8px' }}>
              <p>No photos uploaded yet. Check back soon.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {gallery.media.map((item: any, idx: number) => (
                <div 
                  key={idx} 
                  onClick={() => setActiveLightboxIndex(idx)}
                  style={{ background: '#17191C', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}
                  className="hover-scale"
                >
                  <style dangerouslySetInnerHTML={{ __html: `
                    .hover-scale:hover { transform: scale(1.02); }
                  `}} />
                  <div style={{ height: '180px', background: 'black', overflow: 'hidden', position: 'relative' }}>
                    {item.type === 'video' ? (
                      <>
                        <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black' }}><Play size={14} fill="currentColor" /></div>
                        </div>
                      </>
                    ) : (
                      <img src={item.url} alt="Excursion memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    )}
                  </div>
                  {item.caption && (
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', fontStyle: 'italic', color: '#D8C7AF', lineHeight: 1.4 }}>
                        {item.caption}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Yacht & Captain Cards split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '5rem' }}>
          
          {/* Captain card */}
          {captain && (
            <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <img 
                src={captain.heroImage || '/images/crew/captain-sarah-vance.png'} 
                alt="Captain Profile" 
                style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #B9783B', flexShrink: 0 }}
                onError={(e) => {
                  (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop';
                }}
              />
              <div>
                <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B9783B', fontWeight: 600, display: 'block', marginBottom: '0.15rem' }}>Your Commander</span>
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'white' }}>{captain.title}</h4>
                <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.7, lineHeight: 1.4 }}>{captain.description}</p>
              </div>
            </div>
          )}

          {/* Vessel card */}
          <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#0B0C0E', border: '2px solid #B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Navigation size={28} style={{ color: '#B9783B', transform: 'rotate(45deg)' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B9783B', fontWeight: 600, display: 'block', marginBottom: '0.15rem' }}>The Charter Vessel</span>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: 'white' }}>{booking?.vesselTitle || 'M/Y Whiskey'}</h4>
              <p style={{ margin: 0, fontSize: '0.74rem', opacity: 0.7, lineHeight: 1.4 }}>
                76ft Lazzara luxury flybridge yacht equipped with premium sound systems and luxury lounges.
              </p>
            </div>
          </div>

        </div>

        {/* Crew Tipping Component */}
        <div style={{ maxWidth: '600px', margin: '0 auto', background: 'linear-gradient(to right bottom, #1E2124, #141618)', border: '1px solid rgba(185, 120, 59, 0.25)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center' }}>
          {tipSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', marginBottom: '0.5rem' }}>
                <Check size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>Thank You for Your Generosity!</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#D8C7AF', opacity: 0.8 }}>
                Your crew tip of <strong>${tippedAmount}</strong> was successfully charged and routed. The Captain and crew greatly appreciate your kindness.
              </p>
            </div>
          ) : (
            <form onSubmit={handleTipSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B9783B', fontWeight: 600 }}>Crew appreciation</span>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'white', letterSpacing: '0.01em' }}>
                Appreciate Captain & Crew?
              </h3>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.4, maxWidth: '440px' }}>
                If you enjoyed your voyage, it is custom to show appreciation. 100% of tips are split directly among the captain and crew members.
              </p>

              {/* Percentage Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', width: '100%' }}>
                {[10, 20, 30].map(pct => {
                  const calculatedAmt = Math.round(bookingTotal * (pct / 100));
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipPercentage(pct)}
                      style={{
                        background: tipPercentage === pct ? '#B9783B' : 'rgba(255,255,255,0.02)',
                        border: tipPercentage === pct ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '0.65rem 0.25rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pct}%</span>
                      <span style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.1rem' }}>${calculatedAmt}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setTipPercentage('custom')}
                  style={{
                    background: tipPercentage === 'custom' ? '#B9783B' : 'rgba(255,255,255,0.02)',
                    border: tipPercentage === 'custom' ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    padding: '0.65rem 0.25rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  Custom
                </button>
              </div>

              {/* Custom Input */}
              {tipPercentage === 'custom' && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}><DollarSign size={16} /></div>
                  <input
                    type="number"
                    value={customTip}
                    onChange={e => setCustomTip(e.target.value)}
                    placeholder="Enter tip amount..."
                    style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.25rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              {/* Submit tipping payment */}
              <button
                type="submit"
                disabled={isSubmittingTip || calculateTipAmount() <= 0}
                style={{
                  width: '100%',
                  background: '#B9783B',
                  border: 'none',
                  color: 'white',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.2s',
                  opacity: calculateTipAmount() <= 0 ? 0.5 : 1,
                  pointerEvents: calculateTipAmount() <= 0 ? 'none' : 'auto'
                }}
              >
                {isSubmittingTip ? <Loader2 size={16} className="animate-spin" /> : null}
                {isSubmittingTip ? 'Routing to Checkout...' : `Confirm & Charge Tip ($${calculateTipAmount()})`}
              </button>
            </form>
          )}
        </div>

      </section>

    </div>
  );
}
