/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
   Sparkles, MapPin, Navigation, Share2, DollarSign, 
   Check, Info, User, HelpCircle, ArrowRight, Loader2, Play, Image as ImageIcon,
   Phone, Calendar, Copy, ChevronLeft, ChevronRight, Wind, ShieldCheck, Ship, Users, Compass,
   Sun, Cloud, Star, Gift, Upload
 } from 'lucide-react';
import Link from 'next/link';
import { firebaseConfig } from '@/lib/firebase';
import { uploadFile } from '@/lib/storage';
import PublicFooter from '@/components/public/PublicFooter';

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a1c1e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1c1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d8c7af" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b9783b" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d8c7af" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#121415" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a7b66" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2d3135" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212427" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a7b66" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#383d42" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212427" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b9783b" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d0f10" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4e5357" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0d0f10" }],
  },
];

export default function GuestTripMemoriesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.bookingId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [gallery, setGallery] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [captain, setCaptain] = useState<any>(null);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tipping states
  const [tipPercentage, setTipPercentage] = useState<number | 'custom' | null>(20);
  const [customTip, setCustomTip] = useState<string>('');
  const [isSubmittingTip, setIsSubmittingTip] = useState(false);
  const [tipSuccess, setTipSuccess] = useState<boolean>(false);
  const [tippedAmount, setTippedAmount] = useState<number>(0);

  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [activeActionTab, setActiveActionTab] = useState<'gratuity' | 'testimonial'>('gratuity');

  const customTipRef = useRef<HTMLInputElement>(null);
  const testimonialTextRef = useRef<HTMLTextAreaElement>(null);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState<boolean>(false);

  const hasTipped = tipSuccess || tippedAmount > 0 || (gallery?.tippingLedger?.totalTipped || 0) > 0;
  const hasReviewed = reviewSuccess || existingReview !== null;

  const [gratuityTransitionSeconds, setGratuityTransitionSeconds] = useState<number | null>(null);

  // Auto-advance only if the tip was completed in a past session/already loaded
  useEffect(() => {
    if (hasTipped && !hasReviewed && !tipSuccess && gratuityTransitionSeconds === null) {
      setActiveActionTab('testimonial');
    }
  }, [hasTipped, hasReviewed, tipSuccess, gratuityTransitionSeconds]);

  // When tipSuccess is triggered, hold on Gratuity tab and start countdown
  useEffect(() => {
    if (tipSuccess) {
      setActiveActionTab('gratuity');
      setGratuityTransitionSeconds(5);
    }
  }, [tipSuccess]);

  // Countdown timer effect
  useEffect(() => {
    if (gratuityTransitionSeconds === null) return;
    if (gratuityTransitionSeconds <= 0) {
      setGratuityTransitionSeconds(null);
      setActiveActionTab('testimonial');
      return;
    }
    const timer = setTimeout(() => {
      setGratuityTransitionSeconds(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [gratuityTransitionSeconds]);

  useEffect(() => {
    if (tipPercentage === 'custom') {
      setTimeout(() => {
        customTipRef.current?.focus();
      }, 50);
    }
  }, [tipPercentage]);

  useEffect(() => {
    if (activeActionTab === 'testimonial') {
      setTimeout(() => {
        testimonialTextRef.current?.focus();
      }, 50);
    }
  }, [activeActionTab]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [waiver, setWaiver] = useState<any>(null);
  const [vessel, setVessel] = useState<any>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});
  const [otherExperiences, setOtherExperiences] = useState<any[]>([]);
  const [weather, setWeather] = useState<{ temp: number; wind: number; code: number } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchHistoricalWeather = async (dateStr: string) => {
    try {
      const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=30.3935&longitude=-86.4958&start_date=${dateStr}&end_date=${dateStr}&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph`);
      if (res.ok) {
        const data = await res.json();
        if (data.daily) {
          setWeather({
            temp: Math.round((data.daily.temperature_2m_max[0] + data.daily.temperature_2m_min[0]) / 2),
            wind: Math.round(data.daily.wind_speed_10m_max[0]),
            code: data.daily.weather_code[0]
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch historical weather:', err);
    }
  };

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

  useEffect(() => {
    if (!gallery?.media) return;
    gallery.media.forEach((item: any) => {
      const key = item.id || item.url;
      if (item.type === 'video') {
        setAspectRatios(prev => ({ ...prev, [key]: 1.77 }));
        return;
      }
      const img = new Image();
      img.src = item.url;
      img.onload = () => {
        setAspectRatios(prev => ({ ...prev, [key]: img.naturalWidth / img.naturalHeight }));
      };
    });
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
      if (gData.testimonial) {
        setExistingReview(gData.testimonial);
      }

      // 2. Extract booking details from embedded object (for pricing & captainId)
      if (gData.booking) {
        const bData = gData.booking;
        setBooking(bData);
        if (bData.token && !bookingId.startsWith('tkn_')) {
          window.location.replace(`/trip/${bData.token}`);
          return;
        }
        if (bData.date) {
          fetchHistoricalWeather(bData.date);
        }
      }

      if (gData.waiver) {
        setWaiver(gData.waiver);
      }
      if (gData.vessel) {
        setVessel(gData.vessel);
      }
      if (gData.captain) {
        setCaptain(gData.captain);
      }
      if (gData.otherExperiences) {
        setOtherExperiences(gData.otherExperiences);
      }
    } catch (err) {
      console.error('Error loading page details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trip/${booking?.token || bookingId}` : '';
    if (navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: gallery?.title || 'Our Yacht Excursion Memories',
          text: gallery?.description || 'Relive our private luxury yacht charter excursion!',
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.warn('Web Share failed:', err);
      }
    }
    
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('success', 'Trip link copied! Share it with friends or on social media.');
      } catch {
        showToast('error', 'Failed to copy link to clipboard.');
      }
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
        showToast('error', 'Tipping service temporarily unavailable. Please try again later.');
      }
    } catch (err) {
      console.error('Tipping failed:', err);
      showToast('error', 'Tipping request encountered a network issue.');
    } finally {
      setIsSubmittingTip(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setIsUploadingMedia(true);
    showToast('success', `Uploading ${files.length} media item(s)...`);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadFile(file, `testimonials/${bookingId}`);
        urls.push(url);
      }
      setUploadedMedia(prev => [...prev, ...urls]);
      showToast('success', 'Media uploaded successfully!');
    } catch (err) {
      console.error('Upload failed:', err);
      showToast('error', 'Failed to upload media. Please try again.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/trips/${bookingId}/testimonial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          text: reviewText,
          guestName: booking?.guestName || 'A Guest',
          experienceTitle: booking?.experienceTitle || 'Yacht Charter',
          media: uploadedMedia
        })
      });
      if (res.ok) {
        setReviewSuccess(true);
        setExistingReview({ rating, text: reviewText, media: uploadedMedia, status: 'pending_moderation' });
        showToast('success', 'Thank you! Your feedback has been submitted for moderation.');
      } else {
        showToast('error', 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      showToast('error', 'Error occurred while saving review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const initMap = () => {
    const pins = [...(gallery?.media || [])]
      .filter((m: any) => m.exif?.latitude && m.exif?.longitude)
      .sort((a: any, b: any) => {
        const timeA = a.exif.capturedAt ? new Date(a.exif.capturedAt).getTime() : (a.createdAt || 0);
        const timeB = b.exif.capturedAt ? new Date(b.exif.capturedAt).getTime() : (b.createdAt || 0);
        return timeA - timeB;
      })
      .map((m: any) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        lat: Number(m.exif.latitude),
        lng: Number(m.exif.longitude),
        title: m.caption || 'Memory captured',
        mediaIndex: gallery.media.findIndex((x: any) => x.id === m.id)
      }));

    if (pins.length === 0 || !mapContainerRef.current) return;

    const setupGoogleMap = () => {
      const google = (window as any).google;
      if (!google || !google.maps || !google.maps.Map) {
        setTimeout(setupGoogleMap, 100);
        return;
      }

      const mapOptions = {
        center: { lat: pins[0].lat, lng: pins[0].lng },
        zoom: 13,
        styles: darkMapStyles,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
          position: google.maps.ControlPosition.TOP_LEFT
        },
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative' // mobile scroll hijack prevention!
      };

      const map = new google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;

      const bounds = new google.maps.LatLngBounds();
      const pathCoordinates: any[] = [];

      // Custom HTML overlay implementation class
      class HTMLOverlay extends google.maps.OverlayView {
        private latlng: any;
        private element: HTMLElement;

        constructor(latlng: any, element: HTMLElement) {
          super();
          this.latlng = latlng;
          this.element = element;
          this.setMap(map);
        }

        onAdd() {
          const panes = this.getPanes();
          panes.overlayMouseTarget.appendChild(this.element);
        }

        draw() {
          const projection = this.getProjection();
          if (!projection) return;
          const position = projection.fromLatLngToDivPixel(this.latlng);
          if (position) {
            this.element.style.left = (position.x - 21) + 'px'; // centered on width (42px)
            this.element.style.top = (position.y - 21) + 'px'; // centered on height (42px)
          }
        }

        onRemove() {
          if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
          }
        }
      }

      pins.forEach((pin) => {
        bounds.extend({ lat: pin.lat, lng: pin.lng });
        pathCoordinates.push({ lat: pin.lat, lng: pin.lng });

        // Circular picture thumbnail element
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.width = '42px';
        el.style.height = '42px';
        el.style.borderRadius = '50%';
        el.style.border = '2.5px solid #B9783B';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.65)';
        el.style.cursor = 'pointer';
        el.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-radius 0.3s, box-shadow 0.3s, z-index 0s';
        el.style.transformOrigin = 'center center';
        el.style.background = '#121416';
        el.style.zIndex = '100';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.className = 'google-map-marker-thumb';

        const mediaEl = document.createElement(pin.type === 'video' ? 'video' : 'img');
        mediaEl.src = pin.url;
        mediaEl.style.width = '100%';
        mediaEl.style.height = '100%';
        mediaEl.style.borderRadius = '50%';
        mediaEl.style.objectFit = 'cover';
        mediaEl.style.transition = 'border-radius 0.3s';
        if (pin.type === 'video') {
          (mediaEl as HTMLVideoElement).muted = true;
          (mediaEl as HTMLVideoElement).playsInline = true;
        }

        el.appendChild(mediaEl);

        // Hover expansions
        const activateHover = () => {
          el.style.transform = 'scale(2.4)';
          el.style.zIndex = '9999';
          el.style.borderRadius = '8px';
          mediaEl.style.borderRadius = '6px';
          el.style.boxShadow = '0 12px 28px rgba(0,0,0,0.85)';
        };

        const deactivateHover = () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '100';
          el.style.borderRadius = '50%';
          mediaEl.style.borderRadius = '50%';
          el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.65)';
        };

        el.addEventListener('mouseenter', activateHover);
        el.addEventListener('mouseleave', deactivateHover);

        // Mobile touch highlights
        el.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          // Reset other markers on viewport touch
          document.querySelectorAll('.google-map-marker-thumb').forEach((m: any) => {
            if (m !== el) {
              m.style.transform = 'scale(1)';
              m.style.zIndex = '100';
              m.style.borderRadius = '50%';
              if (m.firstChild) m.firstChild.style.borderRadius = '50%';
            }
          });
          activateHover();
        });

        // Tap triggers lightbox index mapping
        el.addEventListener('click', () => {
          setActiveLightboxIndex(pin.mediaIndex);
        });

        // Spawn Overlay
        new HTMLOverlay(new google.maps.LatLng(pin.lat, pin.lng), el);
      });

      if (pins.length > 1) {
        // Draw chronological route line path
        new google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: '#B9783B',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map
        });

        map.fitBounds(bounds);
      }
    };

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
    
    if (existingScript) {
      if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Map) {
        setupGoogleMap();
      } else {
        existingScript.addEventListener('load', setupGoogleMap);
        // Fallback polling
        const interval = setInterval(() => {
          if ((window as any).google && (window as any).google.maps && (window as any).google.maps.Map) {
            clearInterval(interval);
            setupGoogleMap();
          }
        }, 100);
      }
    } else {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey || '';
      if (!apiKey) return;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = setupGoogleMap;
      document.head.appendChild(script);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1113', color: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLightboxIndex(prev => {
      if (prev === null) return null;
      return prev === 0 ? gallery.media.length - 1 : prev - 1;
    });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLightboxIndex(prev => {
      if (prev === null) return null;
      return prev === gallery.media.length - 1 ? 0 : prev + 1;
    });
  };

  // Cover image falls back to chosen hero image, first gallery image, or default luxury background
  const coverImage = gallery?.coverImageUrl || gallery?.media?.[0]?.url || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=1600&auto=format&fit=crop';
  const bookingTotal = booking?.grandTotal || 800;
  return (
    <div style={{ minHeight: '100vh', background: '#0F1113', color: '#E4DFD5', fontFamily: "'Outfit', 'Inter', sans-serif", paddingBottom: '6rem' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#708C84' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .hover-scale:hover { transform: scale(1.02); }
        @media (max-width: 640px) {
          .tipping-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.5rem !important;
          }
          .media-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 0.85rem !important;
          }
          .split-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
        }
      `}} />
      
      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div 
          onClick={() => setActiveLightboxIndex(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.97)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
        >
          {/* Left Arrow Button */}
          {gallery?.media?.length > 1 && (
            <button 
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 1010
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <ChevronLeft size={24} />
            </button>
          )}

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

          {/* Right Arrow Button */}
          {gallery?.media?.length > 1 && (
            <button 
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '1.5rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                zIndex: 1010
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

      {/* Hero Banner Section */}
      <section style={{ height: '55vh', position: 'relative', overflow: 'hidden' }}>
        {coverImage.endsWith('.mp4') || coverImage.includes('video') || (gallery?.media?.find((m: any) => m.url === coverImage)?.type === 'video') ? (
          <video 
            src={coverImage} 
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
            autoPlay 
            loop 
            muted 
            playsInline 
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `url(${coverImage}) no-repeat center center/cover`, opacity: 1 }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(15, 17, 19, 0) 0%, rgba(15, 17, 19, 0) 55%, rgba(15, 17, 19, 0.75) 80%, rgba(15, 17, 19, 0.95) 100%)' }} />
        
        {/* Floating navbar brand overlay */}
        <Link 
          href="/" 
          style={{ 
            position: 'absolute', 
            top: '2rem', 
            left: '2rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.65rem', 
            background: 'rgba(15, 17, 19, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            color: '#D8C7AF', 
            letterSpacing: '0.15em', 
            textTransform: 'uppercase', 
            fontSize: '0.74rem', 
            fontWeight: 700, 
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s',
            zIndex: 10
          }}
        >
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/settings%2F1778774138024_MY_Whiskey_favicon-2.jpg?alt=media&token=af9c3084-6b8e-407a-8096-04d4063c03c8"
            alt="M/Y Whiskey"
            style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <span>M/Y Whiskey Excursions</span>
        </Link>

        <div style={{ position: 'absolute', bottom: '2rem', width: '100%', padding: '0 2rem' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <span style={{ color: '#B9783B', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Excursion memory Vault
              </span>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, color: 'white', letterSpacing: '0.01em', lineHeight: 1.1 }}>
                {gallery?.title || `${booking?.guestName || 'Your'}'s Voyage`}
              </h1>
              
              {/* Date & Weather Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#B9783B', color: 'white', fontSize: '0.72rem', fontWeight: 650, padding: '0.3rem 0.75rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Calendar size={12} /> {booking?.date ? new Date(booking.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'July 21, 2026'}
                </div>
                {weather && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '0.72rem', fontWeight: 600, padding: '0.3rem 0.75rem', borderRadius: '4px' }}>
                    {weather.code === 0 || weather.code === 1 ? (
                      <Sun size={12} style={{ color: '#E2A15E' }} />
                    ) : (
                      <Cloud size={12} style={{ color: '#7895A2' }} />
                    )}
                    <span>{weather.temp}°F</span>
                    <span style={{ opacity: 0.35 }}>•</span>
                    <Wind size={12} style={{ opacity: 0.7 }} />
                    <span>{weather.wind} mph</span>
                  </div>
                )}
              </div>
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

        {/* Tipping & Testimonial Row */}
        {hasTipped && hasReviewed ? (
          /* Both Completed: Hide main container and show smaller summary cards */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            margin: '2rem auto 3.5rem auto',
            width: '100%'
          }}>
            {/* Gratuity Summary Card */}
            <div style={{
              background: 'rgba(112, 140, 132, 0.08)',
              border: '1px solid rgba(112, 140, 132, 0.25)',
              borderRadius: '12px',
              padding: '1.5rem 2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              color: '#708C84',
              textAlign: 'left'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(112, 140, 132, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={20} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.15rem 0', color: 'white', fontSize: '0.95rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Thank You for Your Tip!</h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.85 }}>
                  Your crew gratuity has been successfully processed. The crew greatly appreciates your kindness!
                </p>
              </div>
            </div>

            {/* Testimonial Summary Card */}
            <div style={{
              background: '#1E2124',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '12px',
              padding: '1.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Testimonial</span>
                <div style={{ display: 'flex', gap: '0.1rem', color: '#E9C46A' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} fill={i < existingReview?.rating ? '#E9C46A' : 'none'} stroke={i < existingReview?.rating ? 'none' : '#E9C46A'} />
                  ))}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.85, fontStyle: 'italic', lineHeight: 1.4 }}>
                "{existingReview?.text}"
              </p>

              {/* Media Attachments Preview */}
              {existingReview?.media && existingReview.media.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {existingReview.media.map((url: string, idx: number) => {
                    const isVideo = url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.webm');
                    return (
                      <div key={idx} style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {isVideo ? (
                          <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <img src={url} alt="Testimonial attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <span style={{ fontSize: '0.65rem', color: '#708C84', fontWeight: 600, marginTop: '0.25rem' }}>
                {existingReview?.status === 'pending_moderation' ? '✓ Submitted for moderation' : '✓ Live on website'}
              </span>
            </div>
          </div>
        ) : (
          /* Not Both Completed: Show Single Container with 2 Tabs */
          <div style={{
            maxWidth: '600px',
            margin: '2rem auto 3.5rem auto',
            background: 'linear-gradient(to right bottom, #1E2124, #141618)',
            border: '1px solid rgba(185, 120, 59, 0.25)',
            borderRadius: '12px',
            padding: '2rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Tabs Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1px', width: '100%' }}>
              <button
                type="button"
                onClick={() => setActiveActionTab('gratuity')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeActionTab === 'gratuity' ? '2px solid #B9783B' : '2px solid transparent',
                  color: activeActionTab === 'gratuity' ? 'white' : '#D8C7AF',
                  opacity: activeActionTab === 'gratuity' ? 1 : 0.6,
                  padding: '0.75rem 0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  outline: 'none'
                }}
              >
                <Gift size={15} /> Crew Gratuity
                {hasTipped && <span style={{ color: '#708C84', fontSize: '0.75rem' }}>✓</span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveActionTab('testimonial')}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeActionTab === 'testimonial' ? '2px solid #B9783B' : '2px solid transparent',
                  color: activeActionTab === 'testimonial' ? 'white' : '#D8C7AF',
                  opacity: activeActionTab === 'testimonial' ? 1 : 0.6,
                  padding: '0.75rem 0',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  outline: 'none'
                }}
              >
                <Star size={15} /> Testimonial
                {hasReviewed && <span style={{ color: '#708C84', fontSize: '0.75rem' }}>✓</span>}
              </button>
            </div>

            {/* Tab Contents */}
            {activeActionTab === 'gratuity' ? (
              /* Gratuity Tab */
              hasTipped ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', color: '#10b981', textAlign: 'center', padding: '1rem 0', width: '100%' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                    <Check size={24} />
                  </div>
                  <h4 style={{ margin: '0 0 0.15rem 0', color: 'white', fontSize: '1.15rem', fontFamily: "'Cormorant Garamond', serif" }}>Thank You for Your Generosity!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.85, maxWidth: '400px' }}>
                    Your crew tip of <strong>${tippedAmount || gallery?.tippingLedger?.totalTipped || 0}</strong> was successfully charged. The crew greatly appreciates your support!
                  </p>

                  {/* Visual transition countdown pill button */}
                  {gratuityTransitionSeconds !== null && !hasReviewed && (
                    <button
                      type="button"
                      onClick={() => {
                        setGratuityTransitionSeconds(null);
                        setActiveActionTab('testimonial');
                      }}
                      style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '320px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(185, 120, 59, 0.35)',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        borderRadius: '24px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        overflow: 'hidden',
                        outline: 'none',
                        marginTop: '1.25rem',
                        transition: 'border-color 0.2s'
                      }}
                    >
                      {/* Filling background animation */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(5 - gratuityTransitionSeconds) * 20}%`,
                        background: '#B9783B',
                        transition: 'width 1s linear',
                        zIndex: 0
                      }} />
                      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        Next: Leave a Testimonial ({gratuityTransitionSeconds}s) <ArrowRight size={12} />
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleTipSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B9783B', fontWeight: 600 }}>Crew appreciation</span>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'white', letterSpacing: '0.01em', textAlign: 'center' }}>
                    Appreciate Captain & Crew?
                  </h3>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.4, maxWidth: '440px', textAlign: 'center' }}>
                    If you enjoyed your voyage, it is custom to show appreciation. 100% of tips are split directly among the captain and crew members.
                  </p>

                  {/* Percentage Buttons */}
                  <div className="tipping-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', width: '100%' }}>
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
                        ref={customTipRef}
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
              )
            ) : (
              /* Testimonial Tab */
              hasReviewed ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{ display: 'flex', gap: '0.2rem', color: '#E9C46A', justifyContent: 'center' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={24} fill={i < existingReview?.rating ? '#E9C46A' : 'none'} stroke={i < existingReview?.rating ? 'none' : '#E9C46A'} />
                    ))}
                  </div>
                  <h4 style={{ margin: '0 0 0.15rem 0', color: 'white', fontSize: '1.15rem', fontFamily: "'Cormorant Garamond', serif" }}>Thank You for Your Testimonial!</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.8, fontStyle: 'italic', maxWidth: '400px', lineHeight: 1.4 }}>
                    "{existingReview?.text}"
                  </p>

                  {/* Media Attachments Preview */}
                  {existingReview?.media && existingReview.media.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                      {existingReview.media.map((url: string, idx: number) => {
                        const isVideo = url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.webm');
                        return (
                          <div key={idx} style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {isVideo ? (
                              <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <img src={url} alt="Testimonial attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span style={{ fontSize: '0.72rem', color: '#708C84', fontWeight: 600, marginTop: '0.5rem' }}>
                    {existingReview?.status === 'pending_moderation' ? '✓ Submitted for moderation' : '✓ Live on website'}
                  </span>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B9783B', fontWeight: 600 }}>Share Your Experience</span>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'white', letterSpacing: '0.01em', textAlign: 'center' }}>
                    Leave a Testimonial
                  </h3>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', opacity: 0.7, lineHeight: 1.4, maxWidth: '440px', textAlign: 'center' }}>
                    We love to hear from our guests! Share your favorite memories of your voyage aboard M/Y Whiskey.
                  </p>

                  {/* Star Selector */}
                  <div style={{ display: 'flex', gap: '0.35rem', cursor: 'pointer', justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setRating(val)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, outline: 'none' }}
                      >
                        <Star 
                          size={28} 
                          fill={val <= rating ? '#E9C46A' : 'none'} 
                          stroke={val <= rating ? 'none' : '#E9C46A'} 
                          style={{ transition: 'all 0.15s' }}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Text Input */}
                  <textarea
                    ref={testimonialTextRef}
                    rows={3}
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Tell us about your charter excursion..."
                    style={{ width: '100%', padding: '0.65rem 1rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '0.9rem', resize: 'none' }}
                    required
                  />

                  {/* Media Upload Area */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.7 }}>Attach photos or videos:</span>
                      <label htmlFor="testimonial-media-input" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(185, 120, 59, 0.15)', border: '1px solid rgba(185, 120, 59, 0.3)', color: '#D8C7AF', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s' }}>
                        {isUploadingMedia ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        {isUploadingMedia ? 'Uploading...' : 'Upload Media'}
                      </label>
                      <input
                        id="testimonial-media-input"
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleMediaUpload}
                        disabled={isUploadingMedia}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {/* Uploaded Media Previews */}
                    {uploadedMedia.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {uploadedMedia.map((url, i) => {
                          const isVideo = url.toLowerCase().includes('.mp4') || url.toLowerCase().includes('.mov') || url.toLowerCase().includes('.webm');
                          return (
                            <div key={i} style={{ width: '50px', height: '50px', borderRadius: '4px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                              {isVideo ? (
                                <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <img src={url} alt="Uploaded thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              <button
                                type="button"
                                onClick={() => setUploadedMedia(prev => prev.filter((_, idx) => idx !== i))}
                                style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#EF4444', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', padding: 0 }}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewText.trim()}
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
                      opacity: !reviewText.trim() ? 0.5 : 1
                    }}
                  >
                    {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : null}
                    {isSubmittingReview ? 'Submitting...' : 'Submit Testimonial'}
                  </button>
                </form>
              )
            )}
          </div>
        )}
        
        {/* Story Intro */}
        <div style={{ background: '#17191C', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', padding: '2.5rem', marginBottom: '3rem', position: 'relative', marginTop: '-1rem', zIndex: 10 }}>
          <div style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: '#D8C7AF', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {gallery?.story || `Relive the premium yacht excursion led by ${booking?.captainTitle?.startsWith('Captain') ? booking.captainTitle : `Captain ${booking?.captainTitle || 'Sarah Vance'}`}. Sparkling coastal views and dolphin viewings await.`}
          </div>
        </div>

        {/* Traveling Party Section */}
        <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '2rem 2.5rem', marginBottom: '3rem' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
            <Users size={18} style={{ color: '#B9783B' }} /> The Traveling Party
          </h3>
          {waiver?.passengers && waiver.passengers.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Primary Guest / Organizer */}
              <div style={{ background: 'rgba(185,120,59,0.05)', border: '1px solid rgba(185,120,59,0.15)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                  {(booking?.guestFirstName || 'I')[0]}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{booking?.guestName || 'Ingemar Johnsson'}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Primary Organizer</span>
                </div>
              </div>

              {/* Passengers from Waiver */}
              {waiver.passengers.map((passenger: any, idx: number) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                    {(passenger.name || 'G')[0]}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{passenger.name}</h4>
                    <span style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{passenger.relationship || 'Guest'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Primary Guest / Organizer */}
              <div style={{ background: 'rgba(185,120,59,0.05)', border: '1px solid rgba(185,120,59,0.15)', borderRadius: '8px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                  {(booking?.guestFirstName || 'I')[0]}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>{booking?.guestName || 'Ingemar Johnsson'}</h4>
                  <span style={{ fontSize: '0.7rem', color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Primary Organizer</span>
                </div>
              </div>
              {booking?.guestCount && booking.guestCount > 1 && (
                <div style={{ fontSize: '0.88rem', opacity: 0.7, padding: '0.5rem 1rem' }}>
                  plus <strong>{booking.guestCount - 1}</strong> other charter guests
                </div>
              )}
            </div>
          )}
        </div>

        {/* EXIF GPS Travel Map */}
        {gallery?.media?.some((m: any) => m.exif?.latitude) && (
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: 'white', marginBottom: '1.25rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          
          {!gallery?.media || gallery.media.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '3rem', background: '#17191C', borderRadius: '8px' }}>
              <p>No photos uploaded yet. Check back soon.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
              {gallery.media.map((item: any, idx: number) => {
                const ratio = aspectRatios[item.id || item.url] || 1.33;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setActiveLightboxIndex(idx)}
                    style={{ 
                      height: '260px',
                      flexGrow: ratio,
                      flexShrink: 1,
                      flexBasis: `${260 * ratio}px`,
                      background: '#17191C', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      cursor: 'pointer', 
                      position: 'relative',
                      maxWidth: '100%'
                    }}
                    className="hover-scale"
                  >
                  <div style={{ width: '100%', height: '100%', background: 'black', position: 'relative' }}>
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
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', display: 'flex', alignItems: 'flex-end' }}>
                      <p style={{ margin: 0, fontSize: '0.78rem', fontStyle: 'italic', color: '#E5D5C0', lineHeight: 1.4, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        {item.caption}
                      </p>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Yacht, Captain & Crew Section */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: 'white', marginBottom: '1.5rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ship size={18} color="#B9783B" /> The Vessel & Commander
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {/* Vessel Resource Card */}
            <Link 
              href={`/fleet/${vessel?.slug || 'my-whiskey-yacht'}`} 
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div 
                style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', transition: 'all 0.2s', height: '100%' }}
                className="hover-scale"
              >
                <img 
                  src={vessel?.heroImage || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=300'} 
                  alt="Vessel profile"
                  style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  onError={(e) => {
                    (e.target as any).src = 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=300';
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B9783B', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>The Charter Vessel</span>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{vessel?.title || vessel?.name || 'M/Y Whiskey'}</h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.76rem', opacity: 0.7, lineHeight: 1.4 }}>
                    {vessel?.shortDescription || 'Curated luxury cruising equipped with premium flybridge decks.'}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', fontSize: '0.72rem' }}>
                    <div>
                      <span style={{ opacity: 0.4, display: 'block' }}>Capacity</span>
                      <strong style={{ color: '#D8C7AF' }}>{vessel?.physicalConfig?.capacity || vessel?.specifications?.Length || '12 Guests'}</strong>
                    </div>
                    <div>
                      <span style={{ opacity: 0.4, display: 'block' }}>Home Port</span>
                      <strong style={{ color: '#D8C7AF' }}>{vessel?.physicalConfig?.homeLocation || vessel?.location || 'Destin Harbor, FL'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Captain Resource Card */}
            <Link 
              href={`/crew/${captain?.slug || 'captain-elena-rostova'}`} 
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div 
                style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'flex-start', transition: 'all 0.2s', height: '100%' }}
                className="hover-scale"
              >
                <img 
                  src={captain?.heroImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'} 
                  alt="Captain profile"
                  style={{ width: '100px', height: '100px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  onError={(e) => {
                    (e.target as any).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150';
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B9783B', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Your Commander</span>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{captain?.title || captain?.name || 'Captain Elena Rostova'}</h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.76rem', opacity: 0.7, lineHeight: 1.4 }}>
                    {captain?.shortDescription || 'USCG Licensed Master Captain and open-water navigation specialist.'}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem' }}>
                      <span style={{ opacity: 0.4, display: 'block' }}>Credentials</span>
                      <strong style={{ color: '#D8C7AF' }}>{captain?.certifications?.[0] || 'USCG 100-Ton'}</strong>
                    </div>
                    {/* Social Media Links */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#D8C7AF' }}>
                      {captain?.instagram && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const url = captain.instagram.startsWith('http') ? captain.instagram : `https://${captain.instagram}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          style={{ cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s', display: 'inline-flex' }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                        </span>
                      )}
                      {captain?.facebook && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const url = captain.facebook.startsWith('http') ? captain.facebook : `https://${captain.facebook}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          style={{ cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s', display: 'inline-flex' }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                        </span>
                      )}
                      {captain?.linkedin && (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const url = captain.linkedin.startsWith('http') ? captain.linkedin : `https://${captain.linkedin}`;
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                          style={{ cursor: 'pointer', opacity: 0.7, transition: 'opacity 0.2s', display: 'inline-flex' }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Voyage Itinerary Timeline */}
        <div style={{ maxWidth: '650px', margin: '0 auto 4rem auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: 'white', marginBottom: '1.5rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Compass size={18} color="#B9783B" /> Excursion Itinerary Stops
          </h2>
          <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '2rem 2.5rem', position: 'relative' }}>
            
            {/* Vertical line indicator */}
            <div style={{ position: 'absolute', left: '4.95rem', top: '2.5rem', bottom: '2.5rem', width: '2px', background: 'rgba(185, 120, 59, 0.15)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Stop 1 */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'right', flexShrink: 0 }}>08:30 AM</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#B9783B', border: '3px solid #17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779910268613_Marina-thumbs-up.webp?alt=media&token=eb68caa0-bad1-42f7-8e84-b90f3ce47f6f" 
                    alt="Baytowne Marina"
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>Departure from Baytowne Marina</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Boarding & safety walkthrough before lines cast.</p>
                  </div>
                </div>
              </div>

              {/* Stop 2 */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'right', flexShrink: 0 }}>09:30 AM</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#B9783B', border: '3px solid #17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  {/* No image assigned for Choctawhatchee Bay, allowing null */}
                  <div>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>Choctawhatchee Bay Cruising</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Scenic cruising through deep waters watching for wildlife.</p>
                  </div>
                </div>
              </div>

              {/* Stop 3 */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'right', flexShrink: 0 }}>11:00 AM</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#B9783B', border: '3px solid #17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779905691280_What_to_pack_for_crab_island_.webp?alt=media&token=e485e644-662b-4702-bfab-80d1cd9d7932" 
                    alt="Crab Island"
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>Crab Island Anchorage</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Drop anchor for swimming, floating, and lunch in the shallow sandbar.</p>
                  </div>
                </div>
              </div>

              {/* Stop 4 */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'right', flexShrink: 0 }}>02:00 PM</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#B9783B', border: '3px solid #17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779490705357_IMG_4093__1_.webp?alt=media&token=f538dd74-1810-4585-8e81-f0f558f83d34" 
                    alt="Destin Harbor"
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>Destin Harbor Tour</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Cruising the lively harborfront and looking for dolphin pods.</p>
                  </div>
                </div>
              </div>

              {/* Stop 5 */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', position: 'relative' }}>
                <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px', textAlign: 'right', flexShrink: 0 }}>04:30 PM</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#B9783B', border: '3px solid #17191C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }} />
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <img 
                    src="https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779910268613_Marina-thumbs-up.webp?alt=media&token=eb68caa0-bad1-42f7-8e84-b90f3ce47f6f" 
                    alt="Return Docking"
                    style={{ width: '50px', height: '50px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
                  />
                  <div>
                    <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.92rem', color: 'white', fontWeight: 600 }}>Return to Baytowne Marina</h4>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Smooth return cruise and secure harbor docking.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Share Memories Section */}
        <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', marginBottom: '3rem' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#B9783B', fontWeight: 600 }}>Share the journey</span>
          <h3 style={{ margin: '0.5rem 0 1rem 0', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
            Share Your Excursion Memories
          </h3>
          <p style={{ margin: '0 auto 1.5rem auto', fontSize: '0.85rem', opacity: 0.7, lineHeight: 1.4, maxWidth: '480px' }}>
            Send this private gallery to your friends, family, or share it on social media to showcase your premium voyage aboard the M/Y Whiskey.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleShare}
              style={{
                background: '#B9783B',
                border: 'none',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background 0.2s'
              }}
            >
              <Share2 size={15} /> Share Gallery
            </button>
            <button
              onClick={async () => {
                try {
                  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/trip/${booking?.token || bookingId}` : '';
                  if (shareUrl) {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast('success', 'Trip memories link copied to clipboard!');
                  }
                } catch {
                  showToast('error', 'Failed to copy link.');
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <Copy size={15} /> Copy Page Link
            </button>
          </div>
        </div>

        {/* Excursion Discovery Grid */}
        {otherExperiences && otherExperiences.length > 0 && (
          <div style={{ marginBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, color: 'white', marginBottom: '1.5rem', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#B9783B" /> Discover Curated Excursions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {otherExperiences.map((exp: any) => (
                <div key={exp.id} style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                    <img src={exp.heroImage || 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?q=80&w=600'} alt={exp.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', color: 'white', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{exp.title}</h4>
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.78rem', opacity: 0.7, lineHeight: 1.4, flex: 1 }}>{exp.shortDescription}</p>
                    <Link 
                      href="/"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', border: '1px solid rgba(185, 120, 59, 0.4)', background: 'none', color: '#D8C7AF', textDecoration: 'none', padding: '0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' }}
                    >
                      View Details & Book <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action (CTA) block */}
        <div style={{ background: '#17191C', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '3rem 2rem', textAlign: 'center', marginBottom: '5rem' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#B9783B', fontWeight: 600 }}>Plan your next voyage</span>
          <h2 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", color: 'white', marginTop: '0.5rem', marginBottom: '1rem' }}>Relive the Luxury or Charter Again</h2>
          <p style={{ maxWidth: '550px', margin: '0 auto 2rem auto', fontSize: '0.9rem', opacity: 0.7, lineHeight: 1.5 }}>
            Ready for another premium escape in Destin? Secure your future slots, browse curated itineraries, or coordinate directly with our concierge team.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Link 
              href="/" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#B9783B', color: 'white', textDecoration: 'none', padding: '0.75rem 1.75rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'background 0.2s' }}
            >
              <Calendar size={15} /> Book Next Experience
            </Link>
            <a 
              href="tel:+18505550190"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', padding: '0.75rem 1.75rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'background 0.2s' }}
            >
              <Phone size={15} /> Call & Book Direct
            </a>
          </div>
        </div>

      </section>

      <PublicFooter />
    </div>
  );
}
