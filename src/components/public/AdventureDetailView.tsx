'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import { 
  MapPin, Clock, Users, Check, ArrowRight, Compass, Shield, Info, Calendar, AlertCircle, Star,
  FileText, Film, Image as ImageIcon, Download, ExternalLink, X,
  Utensils, GlassWater, Wifi, Music, DollarSign, Sparkles, Waves, Fuel, Ship, ChevronLeft, ChevronRight, CreditCard, CheckCircle,
  ChevronDown, ChevronUp, Anchor, Tag
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SwipeScrollContainer } from '../builder/SwipeScrollContainer';
import { 
  saveBookingData, saveWaiverSignature, loadPageData, getCustomerProfile, getContentItem,
  getAllBookings, getAssetBlackouts, BookingRecord, AssetBlackout,
  acquireCheckoutLock, releaseCheckoutLock, getAllCheckoutLocks, CheckoutLock,
  getContentItems, checkSignatureMatch, getBookingById, getDiscountCode, DiscountCode
} from '@/lib/db';
import { firebaseConfig } from '@/lib/firebase';

interface ItineraryStep {
  title: string;
  description: string;
  offsetMinutes: number;
  isCrewOnly?: boolean;
  locationSlug?: string;
}

interface Addon {
  name: string;
  price: number;
  description: string;
}

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  contentType: string;
  shortDescription: string;
  heroImage?: string;
  location?: string;
  basePrice?: number;
  currency?: string;
  duration?: string;
  maxGuests?: number;
  startTimes?: string[];
  itinerary?: ItineraryStep[];
  includedItems?: string[];
  addons?: Addon[];
  gallery?: { type: 'image' | 'video' | 'document'; url: string; name?: string }[];
  description?: string;
  guestDurationMinutes?: number;
  crewDurationMinutes?: number;
  experienceBaseCost?: number;
  addonAssetSlugs?: string[];
  budgetLineItems?: Array<{ category: string; cost: number }>;
  linkedLocations?: string[];
  startLocation?: string;
  endLocation?: string;
  relocationSpeed?: number;
}

interface CaptainProfile {
  id: string;
  title: string;
  dailyRate: number;
  hourlyRate?: number;
  shortDescription: string;
  certifications?: string[];
  heroImage?: string;
  rating?: number;
  certifiedVessels?: string[];
}

interface AdventureDetailViewProps {
  item: ContentItem;
  captains: CaptainProfile[];
  theme: any;
  linkedAssets?: any[];
  linkedLocations?: any[];
  linkedStaff?: any[];
  globalIncludedItems?: any[];
}

const DEFAULT_ADDONS: Addon[] = [
  { name: 'Premium Whiskey & Cigar Selection', price: 150, description: 'Curated flight of 3 rare single malts paired with hand-rolled cigars.' },
  { name: 'Sunset Gourmet Catering Platter', price: 200, description: 'Artisanal charcuterie, fresh Gulf seafood bites, and seasonal fruits.' },
  { name: 'Water Sports Snorkeling Package', price: 75, description: 'Upgraded high-end snorkel sets, paddleboards, and floating island mat.' }
];

const DEFAULT_START_TIMES = ['09:00', '13:00', '17:00'];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

function getIncludedIcon(text: string, globalItems: any[] = []) {
  const matched = globalItems.find(item => item.name.toLowerCase().trim() === text.toLowerCase().trim());
  const iconName = matched ? matched.iconName : null;
  
  if (iconName) {
    switch (iconName) {
      case 'Fuel': return <Fuel size={14} />;
      case 'Utensils': return <Utensils size={14} />;
      case 'GlassWater': return <GlassWater size={14} />;
      case 'Users': return <Users size={14} />;
      case 'Compass': return <Compass size={14} />;
      case 'Sparkles': return <Sparkles size={14} />;
      case 'Wifi': return <Wifi size={14} />;
      case 'Music': return <Music size={14} />;
      case 'Shield': return <Shield size={14} />;
      case 'DollarSign': return <DollarSign size={14} />;
      case 'Waves': return <Waves size={14} />;
      case 'Check': return <Check size={14} />;
    }
  }

  const lower = text.toLowerCase();
  if (lower.includes('fuel') || lower.includes('diesel') || lower.includes('gas')) {
    return <Fuel size={14} />;
  }
  if (lower.includes('lunch') || lower.includes('food') || lower.includes('catering') || lower.includes('snack') || lower.includes('charcuterie') || lower.includes('dining') || lower.includes('meal')) {
    return <Utensils size={14} />;
  }
  if (lower.includes('drink') || lower.includes('water') || lower.includes('beverage') || lower.includes('soda') || lower.includes('coke') || lower.includes('wine') || lower.includes('whiskey') || lower.includes('champagne')) {
    return <GlassWater size={14} />;
  }
  if (lower.includes('captain') || lower.includes('crew') || lower.includes('host') || lower.includes('guide')) {
    return <Users size={14} />;
  }
  if (lower.includes('snorkel') || lower.includes('fins') || lower.includes('mask') || lower.includes('paddleboard') || lower.includes('board') || lower.includes('gear')) {
    return <Compass size={14} />;
  }
  if (lower.includes('towel') || lower.includes('sunscreen') || lower.includes('amenities') || lower.includes('clean') || lower.includes('fresh')) {
    return <Sparkles size={14} />;
  }
  if (lower.includes('wifi') || lower.includes('internet')) {
    return <Wifi size={14} />;
  }
  if (lower.includes('audio') || lower.includes('sound') || lower.includes('bluetooth') || lower.includes('music')) {
    return <Music size={14} />;
  }
  if (lower.includes('safety') || lower.includes('cpr') || lower.includes('vest') || lower.includes('life')) {
    return <Shield size={14} />;
  }
  if (lower.includes('tax') || lower.includes('fee') || lower.includes('cost') || lower.includes('gratuity') || lower.includes('tip')) {
    return <DollarSign size={14} />;
  }
  if (lower.includes('sea') || lower.includes('ocean') || lower.includes('beach') || lower.includes('wave')) {
    return <Waves size={14} />;
  }
  return <Check size={14} />;
}

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

const getMarkerIcon = (number: number, isHighlighted: boolean) => {
  const color = isHighlighted ? '#e2954c' : '#b9783b';
  const size = isHighlighted ? 38 : 30;
  const stroke = isHighlighted ? '#ffffff' : '#121416';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="14" fill="${encodeURIComponent(color)}" stroke="${encodeURIComponent(stroke)}" stroke-width="2"/>
    <text x="16" y="21" font-family="'Cormorant Garamond', serif" font-weight="bold" font-size="14" fill="%23121416" text-anchor="middle">${number}</text>
  </svg>`;
  
  const hasMaps = typeof window !== 'undefined' && 
                  (window as any).google && 
                  (window as any).google.maps && 
                  (window as any).google.maps.Size && 
                  (window as any).google.maps.Point;

  return {
    url: 'data:image/svg+xml;utf8,' + svg,
    scaledSize: hasMaps ? new (window as any).google.maps.Size(size, size) : null,
    anchor: hasMaps ? new (window as any).google.maps.Point(size / 2, size / 2) : null
  };
};

interface ItineraryMapProps {
  steps: any[];
  allLocations: any[];
  hoveredLocationIndex: number | null;
  setHoveredLocationIndex: (idx: number | null) => void;
  isMapsApiLoaded: boolean;
}

function ItineraryMap({ steps, allLocations, hoveredLocationIndex, setHoveredLocationIndex, isMapsApiLoaded }: ItineraryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const markersRef = useRef<any[]>([]);

  // Filter steps that have coordinates, deduplicating by locationSlug
  const stops = useMemo(() => {
    const list: any[] = [];
    const seenSlugs = new Set<string>();

    steps.forEach((step, idx) => {
      if (!step.locationSlug) return;
      if (seenSlugs.has(step.locationSlug)) return;

      const loc = allLocations.find((l: any) => l.slug === step.locationSlug);
      if (loc && loc.latitude && loc.longitude) {
        seenSlugs.add(step.locationSlug);
        list.push({
          stepIndex: idx,
          locationSlug: step.locationSlug,
          title: loc.title,
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
        });
      }
    });
    return list;
  }, [steps, allLocations]);

  // Load Google Map
  useEffect(() => {
    if (!mapRef.current || 
        !(window as any).google || 
        !(window as any).google.maps || 
        !(window as any).google.maps.Map || 
        !(window as any).google.maps.LatLngBounds || 
        stops.length === 0) {
      return;
    }

    const mapOptions = {
      center: { lat: stops[0].lat, lng: stops[0].lng },
      zoom: 12,
      styles: darkMapStyles,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    };

    const gMap = new (window as any).google.maps.Map(mapRef.current, mapOptions);
    setMap(gMap);

    // Fit bounds to show all markers
    const bounds = new (window as any).google.maps.LatLngBounds();
    stops.forEach(stop => bounds.extend({ lat: stop.lat, lng: stop.lng }));
    gMap.fitBounds(bounds);

    if (stops.length === 1) {
      gMap.setZoom(13);
    }
  }, [stops.length, isMapsApiLoaded]);

  // Update Markers
  useEffect(() => {
    if (!map || 
        !(window as any).google || 
        !(window as any).google.maps || 
        !(window as any).google.maps.Marker) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const hoveredStepSlug = hoveredLocationIndex !== null ? steps[hoveredLocationIndex]?.locationSlug : null;

    stops.forEach((stop, i) => {
      const latLng = { lat: stop.lat, lng: stop.lng };

      const isHighlighted = hoveredStepSlug === stop.locationSlug;
      const marker = new (window as any).google.maps.Marker({
        position: latLng,
        map: map,
        title: stop.title,
        icon: getMarkerIcon(i + 1, isHighlighted),
        zIndex: isHighlighted ? 1000 : 100
      });

      // Add mouseover and mouseout listeners to marker
      marker.addListener('mouseover', () => {
        setHoveredLocationIndex(stop.stepIndex);
      });
      marker.addListener('mouseout', () => {
        setHoveredLocationIndex(null);
      });

      markersRef.current.push(marker);
    });
  }, [map, stops, hoveredLocationIndex, setHoveredLocationIndex, steps]);

  if (stops.length === 0) return null;

  return (
    <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2.5rem' }}>
      <h3 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', marginBottom: '1.25rem' }}>
        Route & Stops Map
      </h3>
      <div style={{ position: 'relative', width: '100%' }}>
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%', 
            height: '380px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }} 
        />

        {/* Floating Location Card Overlay */}
        {(() => {
          if (hoveredLocationIndex === null) return null;
          
          const hoveredStop = stops.find(s => s.stepIndex === hoveredLocationIndex);
          if (!hoveredStop) return null;
          
          const linkedLocation = allLocations.find((l: any) => l.slug === steps[hoveredLocationIndex]?.locationSlug);
          if (!linkedLocation) return null;
          
          return (
            <div 
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                width: '280px',
                background: 'rgba(18, 20, 22, 0.98)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(185, 120, 59, 0.25)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(185, 120, 59, 0.1)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              {linkedLocation.heroImage && (
                <div style={{ width: '100%', height: '120px', overflow: 'hidden', position: 'relative' }}>
                  <img src={linkedLocation.heroImage} alt={linkedLocation.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '40px', background: 'linear-gradient(to top, rgba(18, 20, 22, 0.98), transparent)' }} />
                </div>
              )}
              <div style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 600, margin: '0 0 0.35rem 0', fontFamily: "'Cormorant Garamond', serif" }}>
                  {linkedLocation.title}
                </h4>
                
                {linkedLocation.latitude && linkedLocation.longitude && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#B9783B', fontWeight: 500, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <MapPin size={10} />
                    {Number(linkedLocation.latitude).toFixed(4)}°, {Number(linkedLocation.longitude).toFixed(4)}°
                  </div>
                )}

                <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8, margin: '0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {linkedLocation.shortDescription || linkedLocation.description}
                </p>

                {linkedLocation.suitability && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {linkedLocation.suitability.split(',').slice(0, 2).map((s: string, sIdx: number) => (
                      <span key={sIdx} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function AdventureDetailView({ 
  item, captains, theme,
  linkedAssets = [],
  linkedLocations = [],
  linkedStaff = [],
  globalIncludedItems = []
}: AdventureDetailViewProps) {
  const { settings } = useSiteSettings();
  const depositPercentage = settings?.financial?.depositPercentage ?? 20;
  const depositDeadlineDays = settings?.financial?.depositDeadlineDays ?? 7;

  const price = item.basePrice || 0;
  const currencySymbol = CURRENCY_SYMBOLS[item.currency || 'USD'] || '$';
  const duration = item.duration || 'Flexible';
  const capacity = item.maxGuests || 1;
  const location = item.location || 'Destin, FL';
  const rawItinerary = item.itinerary || [];
  const included = item.includedItems || [];
  const startTimes = item.startTimes && item.startTimes.length > 0 ? item.startTimes : DEFAULT_START_TIMES;
  const addonsList = item.addons || [];
  const galleryItems = item.gallery || [];
  const markdownDescription = item.description || '';

  // Filter linked assets into Vessels and Gear
  const vesselsList = linkedAssets.filter((asset: any) => asset.isVessel === true);
  const gearList = linkedAssets.filter((asset: any) => asset.isVessel !== true);
  const addonGearList = gearList.filter((asset: any) => (item.addonAssetSlugs || []).includes(asset.slug));
  const includedGearList = gearList.filter((asset: any) => !(item.addonAssetSlugs || []).includes(asset.slug));

  // Client states
  const [selectedStartTime, setSelectedStartTime] = useState(startTimes[0] || '09:00');
  const [selectedVesselSlug, setSelectedVesselSlug] = useState<string>(vesselsList[0]?.slug || '');
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>(''); // empty means "none / Bring my own"
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [selectedGearSlugs, setSelectedGearSlugs] = useState<Record<string, boolean>>({});
  const [isCaptainsExpanded, setIsCaptainsExpanded] = useState(false);
  const [showCrewDuties, setShowCrewDuties] = useState(false);
  const [hoveredLocationIndex, setHoveredLocationIndex] = useState<number | null>(null);

  // Stepped Booking Flow states
  const [bookingStep, setBookingStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [isCalendarExpanded, setIsCalendarExpanded] = useState<boolean>(true);
  const [isDietaryExpanded, setIsDietaryExpanded] = useState<boolean>(false);
  const [guestTitle, setGuestTitle] = useState<string>('');
  const [guestFirstName, setGuestFirstName] = useState<string>('');
  const [guestMiddleInitial, setGuestMiddleInitial] = useState<string>('');
  const [guestLastName, setGuestLastName] = useState<string>('');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(true);
  const [cancellationInsurance, setCancellationInsurance] = useState<boolean>(false);
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [showTermsError, setShowTermsError] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [termsText, setTermsText] = useState<string>('');
  const [showWaiverModal, setShowWaiverModal] = useState<boolean>(false);
  const [waiverFullName, setWaiverFullName] = useState<string>('');
  const [waiverAddress, setWaiverAddress] = useState<string>('');
  const [waiverCity, setWaiverCity] = useState<string>('');
  const [waiverStateZip, setWaiverStateZip] = useState<string>('');
  const [waiverConsent, setWaiverConsent] = useState<boolean>(false);
  const [waiverSignText, setWaiverSignText] = useState<string>('');
  const [generatedBookingId, setGeneratedBookingId] = useState<string>('');
  const [generatedBookingToken, setGeneratedBookingToken] = useState<string>('');
  const [paymentPlan, setPaymentPlan] = useState<'full' | 'deposit'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'eft'>('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [isSigningWaiver, setIsSigningWaiver] = useState<boolean>(false);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [specialConsiderations, setSpecialConsiderations] = useState<string>('');
  const [passengersList, setPassengersList] = useState<Array<{ name: string; relationship: string }>>([]);

  // Discount/Promo states
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<DiscountCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<boolean>(false);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);

  const handleApplyPromoCode = async (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).toUpperCase().trim();
    if (!code) {
      setPromoError('Please enter a promo code.');
      setPromoSuccess(false);
      return;
    }
    
    setIsApplyingPromo(true);
    setPromoError(null);
    try {
      const discount = await getDiscountCode(code);
      if (!discount) {
        setPromoError('Invalid promo code.');
        setPromoSuccess(false);
        setAppliedPromo(null);
        return;
      }
      
      if (!discount.active) {
        setPromoError('This promo code is no longer active.');
        setPromoSuccess(false);
        setAppliedPromo(null);
        return;
      }
      
      if (discount.expirationDate) {
        const today = new Date();
        today.setHours(0,0,0,0);
        const expDate = new Date(discount.expirationDate + 'T23:59:59');
        if (today.getTime() > expDate.getTime()) {
          setPromoError('This promo code has expired.');
          setPromoSuccess(false);
          setAppliedPromo(null);
          return;
        }
      }
      
      setAppliedPromo(discount);
      setPromoSuccess(true);
      setPromoError(null);
      
      // Save in session storage / cookies just in case
      try {
        localStorage.setItem('whiskey_promo_code', discount.code);
        document.cookie = `whiskey_promo_code=${discount.code}; path=/; max-age=2592000; SameSite=Lax`;
      } catch (e) {}
      
    } catch (err) {
      console.error('Error applying promo code:', err);
      setPromoError('Error validating coupon. Please try again.');
      setPromoSuccess(false);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromo(null);
    setPromoSuccess(false);
    setPromoCodeInput('');
    setPromoError(null);
    try {
      localStorage.removeItem('whiskey_promo_code');
      document.cookie = `whiskey_promo_code=; path=/; max-age=0; SameSite=Lax`;
    } catch (e) {}
  };

  // Load and auto-apply promo code on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check URL parameters first
    const params = new URLSearchParams(window.location.search);
    let code = params.get('promo') || params.get('discount') || '';
    
    // If not in URL, check cookies
    if (!code) {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('whiskey_promo_code='))
        ?.split('=')[1];
      if (cookieValue) {
        code = decodeURIComponent(cookieValue);
      }
    }
    
    // If still not found, check localStorage
    if (!code) {
      try {
        code = localStorage.getItem('whiskey_promo_code') || '';
      } catch (e) {}
    }
    
    if (code) {
      setPromoCodeInput(code.toUpperCase());
      // Wait a tiny bit for component to initialize database listeners
      setTimeout(() => {
        handleApplyPromoCode(code);
      }, 500);
    }
  }, []);

  // Sync structured name fields to guestName
  useEffect(() => {
    setGuestName([guestTitle, guestFirstName, guestMiddleInitial, guestLastName].filter(Boolean).join(' '));
  }, [guestTitle, guestFirstName, guestMiddleInitial, guestLastName]);

  // Scroll to booking widget when step changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasParams = params.has('status') || params.has('bookingId');
    if (bookingStep > 1 || hasParams) {
      const el = document.getElementById('booking-widget');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [bookingStep]);

  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);
  const [assetBlackouts, setAssetBlackouts] = useState<AssetBlackout[]>([]);
  const [checkoutLocks, setCheckoutLocks] = useState<CheckoutLock[]>([]);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const refreshAvailabilityData = async () => {
    try {
      const [bookingsList, blackoutsList, locksList, locationsList] = await Promise.all([
        getAllBookings(),
        getAssetBlackouts(),
        getAllCheckoutLocks(),
        getContentItems('location')
      ]);
      setAllBookings(bookingsList);
      setAssetBlackouts(blackoutsList);
      setCheckoutLocks(locksList);
      setAllLocations(locationsList);
    } catch (error) {
      console.error('Error refreshing availability data:', error);
    }
  };

  useEffect(() => {
    const loadAvailabilityData = async () => {
      try {
        const [bookingsList, blackoutsList, locksList, locationsList] = await Promise.all([
          getAllBookings(),
          getAssetBlackouts(),
          getAllCheckoutLocks(),
          getContentItems('location')
        ]);
        setAllBookings(bookingsList);
        setAssetBlackouts(blackoutsList);
        setCheckoutLocks(locksList);
        setAllLocations(locationsList);
      } catch (error) {
        console.error('Error loading bookings, blackouts, and holds for client availability:', error);
      }
    };
    loadAvailabilityData();
  }, []);

  // Handle Stripe redirect returns
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');
    const stripeStatus = params.get('status');
    
    if (bookingId || stripeStatus) {
      console.log('[Stripe Redirect Check] Found params in URL on load:', { bookingId, stripeStatus });
    }
    
    if (bookingId && stripeStatus === 'success') {
      const initWaiverStep = async () => {
        try {
          console.log('[Stripe Redirect Check] Attempting to retrieve booking by ID:', bookingId);
          const booking = await getBookingById(bookingId);
          if (booking) {
            console.log('[Stripe Redirect Check] Booking successfully retrieved:', booking);
            // Load state
            setGeneratedBookingId(bookingId);
            setGeneratedBookingToken(booking.token || '');
            setGuestEmail(booking.guestEmail);
            setGuestPhone(booking.guestPhone);
            setGuestName(booking.guestName);
            setGuestCount(booking.guestCount);
            setPaymentPlan(booking.paymentPlan);
            setPaymentMethod(booking.paymentMethod || 'card');
            
            // Extract waiver name fields
            setWaiverFullName(booking.guestName);
            if (booking.guestCount > 1) {
              const emptyPassengers = Array.from({ length: booking.guestCount - 1 }, () => ({ name: '', relationship: 'Friend' }));
              setPassengersList(emptyPassengers);
            }

            // Set step to step 4 (Waiver)
            console.log('[Stripe Redirect Check] Switching to bookingStep 4 (Waiver)');
            setBookingStep(4);
            
            // Clean up the URL search parameters to make the UX clean
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            console.log('[Stripe Redirect Check] Replaced URL search parameters. URL is now clean.');
          } else {
            console.error('[Stripe Redirect Check] getBookingById returned null. Booking not found in database.');
          }
        } catch (err) {
          console.error('[Stripe Redirect Check] Error resuming booking from Stripe success redirect:', err);
        }
      };
      initWaiverStep();
    } else if (bookingId && stripeStatus === 'cancelled') {
      const resumeCancelledBooking = async () => {
        try {
          console.log('[Stripe Redirect Check] Processing cancelled status. Fetching booking:', bookingId);
          const booking = await getBookingById(bookingId);
          if (booking) {
            console.log('[Stripe Redirect Check] Booking retrieved for cancellation recovery:', booking);
            // Populate state so they don't have to fill it again
            setSelectedDate(booking.date);
            setSelectedStartTime(booking.startTime);
            setSelectedVesselSlug(booking.vesselSlug);
            setGuestEmail(booking.guestEmail);
            setGuestPhone(booking.guestPhone);
            setGuestName(booking.guestName);
            setGuestCount(booking.guestCount);
            setPaymentPlan(booking.paymentPlan);
            setPaymentMethod(booking.paymentMethod || 'card');
            
            // Open modal to Step 3 (Payment) so they can retry
            console.log('[Stripe Redirect Check] Switching to bookingStep 3 (Payment Recovery)');
            setBookingStep(3);
            
            // Clean up URL parameters
            const newUrl = window.location.pathname;
            window.history.replaceState({}, '', newUrl);
            
            alert('Your payment session was cancelled. You can select your payment method and try again.');
          } else {
            console.error('[Stripe Redirect Check] getBookingById returned null during cancellation recovery.');
          }
        } catch (err) {
          console.error('[Stripe Redirect Check] Error resuming booking from Stripe cancel redirect:', err);
        }
      };
      resumeCancelledBooking();
    }
  }, []);

  // Reset selected captain if they become unavailable on the selected date/time
  useEffect(() => {
    if (selectedCaptainId && selectedDate && selectedStartTime) {
      const isBooked = allBookings.some(
        b => b.captainId === selectedCaptainId && b.date === selectedDate && b.startTime === selectedStartTime && b.status !== 'cancelled'
      );
      if (isBooked) {
        setSelectedCaptainId('');
      }
    }
  }, [selectedDate, selectedStartTime, selectedCaptainId, allBookings]);

  const getTransitHoursBetween = (fromSlug: string, toSlug: string, speedKnots: number = 15): number => {
    if (!fromSlug || !toSlug || fromSlug === toSlug) return 0;
    const fromLoc = allLocations.find(l => l.slug === fromSlug);
    const toLoc = allLocations.find(l => l.slug === toSlug);
    if (!fromLoc || !toLoc || !fromLoc.latitude || !fromLoc.longitude || !toLoc.latitude || !toLoc.longitude) {
      return 1.5; // Default relocation time in hours if coordinates are not resolved
    }
    
    const R = 3440.065; // Earth radius in nautical miles
    const lat1 = (fromLoc.latitude * Math.PI) / 180;
    const lat2 = (toLoc.latitude * Math.PI) / 180;
    const dLat = ((toLoc.latitude - fromLoc.latitude) * Math.PI) / 180;
    const dLon = ((toLoc.longitude - fromLoc.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    const speed = speedKnots > 0 ? speedKnots : 15;
    return distance / speed;
  };

  const getAdventureLeadTime = (adv: any): number => {
    if (!adv.itinerary || adv.itinerary.length === 0) return 60; // 1 hour default
    const publicIndices = adv.itinerary
      .map((step: any, idx: number) => (!step.isCrewOnly ? idx : -1))
      .filter((idx: number) => idx !== -1);
    
    if (publicIndices.length === 0) return 0;
    
    let cumulative = 0;
    for (let i = 0; i <= publicIndices[0]; i++) {
      if (i > 0) {
        cumulative += Number(adv.itinerary[i].offsetMinutes || 0);
      }
    }
    return cumulative;
  };

  const checkSlotAvailability = (
    vesselSlug: string,
    dateStr: string,
    timeStr: string,
    holderEmail: string = ''
  ): { blocked: boolean; reason?: string; detail?: string } => {
    // 1. Blackout checks
    const matchedBlackout = assetBlackouts.find(b => {
      if (b.vesselSlug !== vesselSlug) return false;
      
      const bStartStr = b.startTime ? `${b.startDate}T${b.startTime}:00` : `${b.startDate}T00:00:00`;
      const bEndStr = b.endTime ? `${b.endDate}T${b.endTime}:00` : `${b.endDate}T23:59:59`;
      
      const bStart = new Date(bStartStr).getTime();
      const bEnd = new Date(bEndStr).getTime();
      
      const leadMins = getAdventureLeadTime(item);
      const crewMins = item.crewDurationMinutes || item.guestDurationMinutes || 240;
      
      const candStart = new Date(`${dateStr}T${timeStr}:00`).getTime() - leadMins * 60 * 1000;
      const candEnd = candStart + crewMins * 60 * 1000;
      
      return candStart < bEnd && candEnd > bStart;
    });
    
    if (matchedBlackout) {
      return { blocked: true, reason: 'vessel-blackout', detail: matchedBlackout.title };
    }
    
    // 2. Checkout lock check
    const hasLock = checkoutLocks.some(
      l => l.vesselSlug === vesselSlug && 
           l.date === dateStr && 
           l.startTime === timeStr && 
           l.holderEmail.toLowerCase().trim() !== holderEmail.toLowerCase().trim()
    );
    if (hasLock) {
      return { blocked: true, reason: 'checkout-lock' };
    }
    
    // 3. Captain availability check
    const certifiedCaptainsForVessel = captains.filter(c => {
      const isAssigned = (linkedStaff || []).some(s => s.id === c.id || s.slug === c.id);
      if (!isAssigned) return false;
      return c.certifiedVessels && c.certifiedVessels.includes(vesselSlug);
    });
    const hasAvailableCaptain = certifiedCaptainsForVessel.length > 0 && certifiedCaptainsForVessel.some(cap => {
      const leadMins = getAdventureLeadTime(item);
      const guestMins = item.guestDurationMinutes || 240;
      
      const candStart = new Date(`${dateStr}T${timeStr}:00`).getTime();
      const candEnd = candStart + guestMins * 60 * 1000;
      
      const isCapBooked = allBookings.some(b => {
        if (b.captainId !== cap.id || b.status === 'cancelled') return false;
        
        const bLeadMins = b.leadTimeMinutes || 60;
        const bGuestMins = (b.crewDurationMinutes ? (b.crewDurationMinutes - bLeadMins - 60) : 240);
        const bStart = new Date(`${b.date}T${b.startTime}:00`).getTime();
        const bEnd = bStart + bGuestMins * 60 * 1000;
        
        return candStart < bEnd && candEnd > bStart;
      });
      
      return !isCapBooked;
    });
    
    if (!hasAvailableCaptain && certifiedCaptainsForVessel.length > 0) {
      return { blocked: true, reason: 'no-captain' };
    }
    
    // 4. Overlapping bookings and relocation buffers
    const candLeadMins = getAdventureLeadTime(item);
    const candCrewMins = item.crewDurationMinutes || item.guestDurationMinutes || 240;
    const candStart = new Date(`${dateStr}T${timeStr}:00`).getTime() - candLeadMins * 60 * 1000;
    const candEnd = candStart + candCrewMins * 60 * 1000;
    
    const candStartLoc = item.startLocation || selectedVessel?.homeLocation || 'destin-harbor';
    const candEndLoc = item.endLocation || selectedVessel?.homeLocation || 'destin-harbor';
    const vesselSpeed = selectedVessel?.relocationSpeed || 15;
    
    const matchedConflict = allBookings.find(b => {
      if (b.vesselSlug !== vesselSlug || b.status === 'cancelled') return false;
      
      const bLeadMins = b.leadTimeMinutes !== undefined ? b.leadTimeMinutes : 60;
      const bCrewMins = b.crewDurationMinutes !== undefined ? b.crewDurationMinutes : 360;
      const bStart = new Date(`${b.date}T${b.startTime}:00`).getTime() - bLeadMins * 60 * 1000;
      const bEnd = bStart + bCrewMins * 60 * 1000;
      
      const bStartLoc = b.startLocation || selectedVessel?.homeLocation || 'destin-harbor';
      const bEndLoc = b.endLocation || selectedVessel?.homeLocation || 'destin-harbor';
      
      // Direct overlap
      if (candStart < bEnd && candEnd > bStart) {
        return true;
      }
      
      // Relocation buffer: Candidate starts after B ends
      if (bEnd <= candStart) {
        const transitHours = getTransitHoursBetween(bEndLoc, candStartLoc, vesselSpeed);
        const transitMs = transitHours * 60 * 60 * 1000;
        if (candStart - bEnd < transitMs) {
          return true;
        }
      }
      
      // Relocation buffer: Candidate ends before B starts
      if (candEnd <= bStart) {
        const transitHours = getTransitHoursBetween(candEndLoc, bStartLoc, vesselSpeed);
        const transitMs = transitHours * 60 * 60 * 1000;
        if (bStart - candEnd < transitMs) {
          return true;
        }
      }
      
      return false;
    });
    
    if (matchedConflict) {
      return { blocked: true, reason: 'booking-overlap', detail: matchedConflict.guestName };
    }
    
    return { blocked: false };
  };

  // Countdown Timer for Checkout Hold Lock
  useEffect(() => {
    if (bookingStep !== 3 || lockTimeRemaining === null) return;
    if (lockTimeRemaining <= 0) {
      const handleExpire = async () => {
        try {
          if (selectedVesselSlug && selectedDate && selectedStartTime && guestEmail) {
            await releaseCheckoutLock(selectedVesselSlug, selectedDate, selectedStartTime, guestEmail);
          }
        } catch (err) {
          console.error(err);
        }
        alert('Your checkout hold has expired. The time slot has been released.');
        setLockTimeRemaining(null);
        setBookingStep(1);
        refreshAvailabilityData();
      };
      handleExpire();
      return;
    }

    const timer = setInterval(() => {
      setLockTimeRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [bookingStep, lockTimeRemaining, selectedVesselSlug, selectedDate, selectedStartTime, guestEmail]);

  // Release lock on unmount or page exit/unload
  useEffect(() => {
    const handleUnload = () => {
      if (bookingStep === 3 && selectedVesselSlug && selectedDate && selectedStartTime && guestEmail) {
        releaseCheckoutLock(selectedVesselSlug, selectedDate, selectedStartTime, guestEmail);
      }
    };
    return () => {
      handleUnload();
    };
  }, [bookingStep, selectedVesselSlug, selectedDate, selectedStartTime, guestEmail]);

  // Sync guestCount to passengers list slots
  useEffect(() => {
    const requiredSlots = Math.max(0, guestCount - 1);
    setPassengersList(prev => {
      const nextList = [...prev];
      if (nextList.length < requiredSlots) {
        for (let i = nextList.length; i < requiredSlots; i++) {
          nextList.push({ name: '', relationship: 'Friend' });
        }
      } else if (nextList.length > requiredSlots) {
        return nextList.slice(0, requiredSlots);
      }
      return nextList;
    });
  }, [guestCount]);
  const [showInsuranceModal, setShowInsuranceModal] = useState<boolean>(false);
  const [insuranceText, setInsuranceText] = useState<string>('');
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState<boolean>(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [waiverAddressInputElement, setWaiverAddressInputElement] = useState<HTMLInputElement | null>(null);
  const [showPackingChecklist, setShowPackingChecklist] = useState<boolean>(false);
  const [stopsInfo, setStopsInfo] = useState<Array<{ slug: string; title: string }>>([]);
  
  // Gallery states
  const [activeGalleryTab, setActiveGalleryTab] = useState<'all' | 'images' | 'videos' | 'documents'>('all');
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [activeLightboxType, setActiveLightboxType] = useState<'image' | 'video' | null>(null);

  // Helper to format currency values nicely
  const formatCost = (val: number) => {
    return `${currencySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  const guestMinutes = item.guestDurationMinutes !== undefined 
    ? item.guestDurationMinutes 
    : (() => {
        if (rawItinerary.length === 0) return 4 * 60;
        let cumulative = 0;
        const offsets = rawItinerary.map((step, idx) => {
          if (idx > 0) cumulative += rawItinerary[idx - 1].offsetMinutes || 0;
          return cumulative;
        });
        const publicIndices = rawItinerary.map((s, i) => !s.isCrewOnly ? i : -1).filter(i => i !== -1);
        if (publicIndices.length === 0) return 0;
        return offsets[publicIndices[publicIndices.length - 1]] - offsets[publicIndices[0]];
      })();

  const crewMinutes = item.crewDurationMinutes !== undefined
    ? item.crewDurationMinutes
    : (() => {
        if (rawItinerary.length === 0) return 6 * 60;
        return guestMinutes + rawItinerary
          .filter(step => step.isCrewOnly)
          .reduce((sum, step) => sum + (step.offsetMinutes || 0), 0);
      })();

  const guestHours = guestMinutes / 60;
  const crewHours = crewMinutes / 60;

  const calculateTimeline = (startTimeStr: string, itinerary: ItineraryStep[]) => {
    if (!startTimeStr || itinerary.length === 0) return [];
    
    const firstPublicIdx = itinerary.findIndex(s => !s.isCrewOnly);
    const anchorIdx = firstPublicIdx === -1 ? 0 : firstPublicIdx;
    
    let cumulative = 0;
    const absoluteOffsets = itinerary.map((step, idx) => {
      if (idx > 0) {
        cumulative += itinerary[idx - 1].offsetMinutes || 0;
      }
      return cumulative;
    });
    
    const anchorOffset = absoluteOffsets[anchorIdx];
    const targetStartMinutes = parseTimeToMinutes(startTimeStr);
    const baseMinutes = targetStartMinutes - anchorOffset;
    
    return itinerary.map((step, idx) => {
      const currentMinutes = baseMinutes + absoluteOffsets[idx];
      const positiveMinutes = (currentMinutes % 1440 + 1440) % 1440;
      const h24 = Math.floor(positiveMinutes / 60);
      const m = positiveMinutes % 60;
      
      const ampm = h24 >= 12 ? 'PM' : 'AM';
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      const formattedTime = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      
      return {
        ...step,
        formattedTime,
        absoluteOffset: absoluteOffsets[idx]
      };
    });
  };
  const computedItinerary = calculateTimeline(selectedStartTime, rawItinerary);

  // Calculations for Invoice
  const selectedVessel = vesselsList.find(v => v.slug === selectedVesselSlug) || vesselsList[0];
  const vesselCost = selectedVessel ? (Number(selectedVessel.hourlyRate) || 0) * guestHours : 0;
  
  const cheapestVesselRate = vesselsList.length > 0 ? Math.min(...vesselsList.map(v => Number(v.hourlyRate) || 0)) : 0;
  const baseExperienceCost = item.experienceBaseCost !== undefined 
    ? Number(item.experienceBaseCost) 
    : Math.max(0, (item.basePrice || 0) - (cheapestVesselRate * guestHours));

  const gearTotal = addonGearList.reduce((acc, gear) => {
    if (selectedGearSlugs[gear.slug]) {
      return acc + ((Number(gear.hourlyRate) || 0) * guestHours);
    }
    return acc;
  }, 0);

  const selectedCaptain = captains.find(c => c.id === selectedCaptainId);
  
  const totalDutyMinutes = crewMinutes;
  const totalDutyHours = crewHours;

  const selectedCaptainRate = selectedCaptain ? Number(selectedCaptain.hourlyRate || selectedCaptain.dailyRate || 0) : 0;
  const captainFee = selectedCaptain ? selectedCaptainRate * totalDutyHours : 0;

  // Filter captains certified to the selected vessel AND assigned to this experience
  const certifiedCaptains = captains.filter(c => {
    const isAssigned = (linkedStaff || []).some(s => s.id === c.id || s.slug === c.id);
    if (!isAssigned) return false;
    if (!selectedVesselSlug) return true;
    return (c.certifiedVessels || []).includes(selectedVesselSlug);
  });

  const captainOptions = [
    { id: '', title: 'No Captain', hourlyRate: 0, dailyRate: 0, heroImage: '', rating: undefined as number | undefined },
    ...certifiedCaptains
  ];

  const addonsTotal = addonsList.reduce((acc, addon) => {
    if (selectedAddons[addon.name]) {
      const isPerPerson = addon.name.toLowerCase().includes('catering') || 
                          addon.name.toLowerCase().includes('whiskey') || 
                          addon.name.toLowerCase().includes('cigar') || 
                          addon.name.toLowerCase().includes('lunch') || 
                          addon.name.toLowerCase().includes('drink') || 
                          addon.name.toLowerCase().includes('package');
      return acc + (isPerPerson ? Number(addon.price || 0) * guestCount : Number(addon.price || 0));
    }
    return acc;
  }, 0);

  const subtotal = baseExperienceCost + vesselCost + gearTotal + addonsTotal;
  
  // Calculate Promo Code Discount
  const discountAmount = appliedPromo 
    ? (appliedPromo.discountType === 'percent' 
        ? subtotal * (appliedPromo.value / 100) 
        : Math.min(subtotal, appliedPromo.value))
    : 0;

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  
  const insuranceCost = cancellationInsurance ? discountedSubtotal * 0.05 : 0;
  // Insurance premium is tax-free. Tax is only on subtotal.
  const salesTax = discountedSubtotal * 0.075;
  const grandTotalWithoutInsurance = discountedSubtotal + salesTax + captainFee;
  const grandTotal = grandTotalWithoutInsurance + insuranceCost;

  // Verify if date is within deposit cutoff period
  const isWithinDepositCutoff = (() => {
    if (!selectedDate) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const tripDate = new Date(selectedDate + 'T00:00:00');
    const diffTime = tripDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= depositDeadlineDays;
  })();

  // Fallback to full payment if date is within cutoff period
  useEffect(() => {
    if (isWithinDepositCutoff && paymentPlan === 'deposit') {
      setPaymentPlan('full');
    }
  }, [isWithinDepositCutoff, paymentPlan]);

  // Clear terms error when checkbox is ticked
  useEffect(() => {
    if (acceptTerms) {
      setShowTermsError(false);
    }
  }, [acceptTerms]);

  // Sync guest name to waiver input
  useEffect(() => {
    setWaiverFullName(guestName);
  }, [guestName]);

  // Load returning customer profile to auto-populate details
  useEffect(() => {
    const fetchProfile = async () => {
      const email = guestEmail.trim().toLowerCase();
      if (email.includes('@') && email.includes('.')) {
        try {
          const profile = await getCustomerProfile(email);
          if (profile) {
            if (profile.title && !guestTitle) setGuestTitle(profile.title);
            if (profile.firstName && !guestFirstName) setGuestFirstName(profile.firstName);
            if (profile.middleInitial && !guestMiddleInitial) setGuestMiddleInitial(profile.middleInitial);
            if (profile.lastName && !guestLastName) setGuestLastName(profile.lastName);
            
            if (!guestTitle && !guestFirstName && !guestLastName && profile.name) {
              const nameParts = profile.name.split(' ').filter(Boolean);
              if (nameParts.length === 2) {
                setGuestFirstName(nameParts[0]);
                setGuestLastName(nameParts[1]);
              } else if (nameParts.length >= 3) {
                const titles = ['mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.', 'dr', 'dr.', 'capt', 'capt.'];
                if (titles.includes(nameParts[0].toLowerCase())) {
                  setGuestTitle(nameParts[0]);
                  setGuestFirstName(nameParts[1]);
                  if (nameParts.length > 3) {
                    setGuestMiddleInitial(nameParts[2]);
                    setGuestLastName(nameParts.slice(3).join(' '));
                  } else {
                    setGuestLastName(nameParts[2]);
                  }
                } else {
                  setGuestFirstName(nameParts[0]);
                  setGuestMiddleInitial(nameParts[1]);
                  setGuestLastName(nameParts.slice(2).join(' '));
                }
              } else if (nameParts.length === 1) {
                setGuestFirstName(nameParts[0]);
              }
            }

            if (!guestPhone.trim()) setGuestPhone(profile.phone || '');
            if (profile.address) {
              const parts = profile.address.split(',').map(s => s.trim());
              if (parts.length >= 3) {
                if (!waiverAddress.trim()) setWaiverAddress(parts[0]);
                if (!waiverCity.trim()) setWaiverCity(parts[1]);
                if (!waiverStateZip.trim()) setWaiverStateZip(parts.slice(2).join(', '));
              } else {
                if (!waiverAddress.trim()) setWaiverAddress(profile.address);
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch customer profile:', err);
        }
      }
    };
    fetchProfile();
  }, [guestEmail]);

  // Fetch terms page text from Firestore
  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const data = await loadPageData('terms');
        if (data && data.nodes && data.nodes['terms-text']) {
          setTermsText(data.nodes['terms-text'].props.text || '');
        }
      } catch (err) {
        console.error('Error fetching terms for modal:', err);
      }
    };
    fetchTerms();
  }, []);

  // Load Google Maps API script for places autocomplete in Waiver modal
  useEffect(() => {
    if ((window as any).google && (window as any).google.maps) {
      setIsMapsApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-api-script-public');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsMapsApiLoaded(true));
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey || '';
    if (!apiKey) {
      setMapsApiError('No API key provided.');
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script-public';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsMapsApiLoaded(true);
    script.onerror = () => {
      console.error('Error loading Google Maps script.');
      setMapsApiError('Failed to load Google Maps script.');
    };
    document.head.appendChild(script);
  }, []);

  // Fetch insurance page text from Firestore
  useEffect(() => {
    const fetchInsurance = async () => {
      try {
        const data = await loadPageData('insurance');
        if (data && data.nodes && data.nodes['insurance-text']) {
          setInsuranceText(data.nodes['insurance-text'].props.text || '');
        }
      } catch (err) {
        console.error('Error fetching insurance policy for modal:', err);
      }
    };
    fetchInsurance();
  }, []);

  // Load stops/locations names to display links in Step 4
  useEffect(() => {
    const fetchStops = async () => {
      if (item.linkedLocations && item.linkedLocations.length > 0) {
        try {
          const stops = await Promise.all(
            item.linkedLocations.map(async (slug: string) => {
              const locItem = await getContentItem(slug);
              return locItem ? { slug: locItem.slug, title: locItem.title } : null;
            })
          );
          setStopsInfo(stops.filter((s: { slug: string; title: string } | null): s is { slug: string; title: string } => s !== null));
        } catch (err) {
          console.warn('Failed to load stops details for Step 4:', err);
        }
      }
    };
    fetchStops();
  }, [item.linkedLocations]);

  // Adjust guestCount if vessel capacity changes
  useEffect(() => {
    if (selectedVessel && guestCount > (selectedVessel.capacity || 12)) {
      setGuestCount(selectedVessel.capacity || 12);
    }
  }, [selectedVessel, guestCount]);

  // Autocomplete initialization logic
  const initWaiverAutocomplete = (inputElement: HTMLInputElement) => {
    if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) {
      return;
    }
    if ((inputElement as any)._autocompleteInitialized) {
      return;
    }
    (inputElement as any)._autocompleteInitialized = true;

    try {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputElement, {
        types: ['address']
      });

      inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
          let streetNumber = '';
          let route = '';
          let city = '';
          let state = '';
          let zip = '';

          for (const component of place.address_components) {
            const types = component.types;
            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            } else if (types.includes('route')) {
              route = component.long_name;
            } else if (types.includes('locality')) {
              city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
              state = component.short_name;
            } else if (types.includes('postal_code')) {
              zip = component.long_name;
            }
          }

          const streetAddress = [streetNumber, route].filter(Boolean).join(' ');
          setWaiverAddress(streetAddress || place.name || '');
          if (city) setWaiverCity(city);
          if (state || zip) setWaiverStateZip([state, zip].filter(Boolean).join(' '));
        } else {
          setWaiverAddress(place.formatted_address || place.name || '');
        }
      });
    } catch (err) {
      console.error('Error instantiating Waiver Places Autocomplete:', err);
    }
  };

  useEffect(() => {
    if (isMapsApiLoaded && waiverAddressInputElement) {
      initWaiverAutocomplete(waiverAddressInputElement);
    }
  }, [isMapsApiLoaded, waiverAddressInputElement]);

  const waiverAddressCallbackRef = (node: HTMLInputElement | null) => {
    if (node) {
      setWaiverAddressInputElement(node);
      initWaiverAutocomplete(node);
    }
  };

  const isConvenienceFeeEnabled = settings?.financial?.enableConvenienceFee ?? true;
  const convenienceFeeRate = settings?.financial?.convenienceFeePercentage ?? 3.5;

  const baseAmountDueToday = paymentPlan === 'deposit' 
    ? (grandTotalWithoutInsurance * (depositPercentage / 100)) + insuranceCost 
    : grandTotal;
  const convenienceFeeToday = isConvenienceFeeEnabled && paymentMethod === 'card' 
    ? (baseAmountDueToday * (convenienceFeeRate / 100)) 
    : 0;
  const amountDueToday = baseAmountDueToday + convenienceFeeToday;

  const baseAmountDueLater = paymentPlan === 'deposit' 
    ? grandTotalWithoutInsurance * ((100 - depositPercentage) / 100) 
    : 0;
  const convenienceFeeLater = isConvenienceFeeEnabled && paymentMethod === 'card' 
    ? (baseAmountDueLater * (convenienceFeeRate / 100)) 
    : 0;
  const amountDueLater = baseAmountDueLater + convenienceFeeLater;

  const convenienceFeeTotal = convenienceFeeToday + convenienceFeeLater;

  const toggleAddon = (name: string) => {
    setSelectedAddons(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const getRemainingGearQuantity = (gearSlug: string, totalQuantity: number = 1) => {
    if (!selectedDate) return totalQuantity;
    const allocatedCount = allBookings.reduce((sum, b) => {
      if (b.date === selectedDate && b.status !== 'cancelled' && b.gearSlugs && b.gearSlugs.includes(gearSlug)) {
        return sum + 1;
      }
      return sum;
    }, 0);
    return Math.max(0, totalQuantity - allocatedCount);
  };

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const getDaysInMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    
    const days: Array<{ day: number | null; dateStr: string; isAvailable: boolean }> = [];
    
    // Padding for empty spots before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateStr: '', isAvailable: false });
    }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Calendar days
    for (let day = 1; day <= numDays; day++) {
      const dayDate = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isPast = dayDate.getTime() < today.getTime();
      
      let isAvailable = !isPast;
      
      if (isAvailable && selectedVesselSlug) {
        const allTimesBlocked = startTimes.every(time => {
          const check = checkSlotAvailability(selectedVesselSlug, dateStr, time, guestEmail);
          return check.blocked;
        });
        if (allTimesBlocked) {
          isAvailable = false;
        }
      }
      
      days.push({ day, dateStr, isAvailable });
    }
    
    return days;
  };

  const getDepositDeadlineDateStr = () => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - depositDeadlineDays);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const [isCopied, setIsCopied] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);

  const handleDownloadBookingIcs = () => {
    if (!selectedDate) return;
    const title = `M/Y Whiskey Charter: ${item.title}`;
    const startIso = selectedDate.replace(/-/g, '') + 'T' + selectedStartTime.replace(/:/g, '') + '00';
    const endMinutes = parseTimeToMinutes(selectedStartTime) + guestMinutes;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endIso = selectedDate.replace(/-/g, '') + 'T' + String(endH).padStart(2, '0') + String(endM).padStart(2, '0') + '00';
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `LOCATION:${location}`,
      `DESCRIPTION:Your private charter experience on the vessel ${selectedVessel ? selectedVessel.title : 'vessel'}. Thank you for booking!`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `charter-booking.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadReminderIcs = () => {
    if (!selectedDate) return;
    const reminderDate = new Date(selectedDate + 'T00:00:00');
    reminderDate.setDate(reminderDate.getDate() - depositDeadlineDays);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];
    const reminderIsoStart = reminderDateStr.replace(/-/g, '') + 'T090000'; // 9:00 AM
    const reminderIsoEnd = reminderDateStr.replace(/-/g, '') + 'T100000';   // 10:00 AM
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Reminder: Final Payment Due - M/Y Whiskey Charter`,
      `DTSTART:${reminderIsoStart}`,
      `DTEND:${reminderIsoEnd}`,
      `LOCATION:${location}`,
      `DESCRIPTION:Reminder to pay the final balance of ${formatCost(amountDueLater)} for your charter booking on ${selectedDate}.`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `charter-payment-reminder.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGoogleCalendarUrl = () => {
    if (!selectedDate) return '';
    const title = encodeURIComponent(`M/Y Whiskey Charter: ${item.title}`);
    const startIso = selectedDate.replace(/-/g, '') + 'T' + selectedStartTime.replace(/:/g, '') + '00';
    const endMinutes = parseTimeToMinutes(selectedStartTime) + guestMinutes;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endIso = selectedDate.replace(/-/g, '') + 'T' + String(endH).padStart(2, '0') + String(endM).padStart(2, '0') + '00';
    const details = encodeURIComponent(`Your private charter experience. Vessel: ${selectedVessel ? selectedVessel.title : 'None'}. Captain: ${selectedCaptain ? selectedCaptain.title : 'None'}`);
    const loc = encodeURIComponent(location);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${loc}`;
  };

  const getGoogleCalendarReminderUrl = () => {
    if (!selectedDate) return '';
    const title = encodeURIComponent(`Reminder: Final Payment Due - M/Y Whiskey Charter`);
    const reminderDate = new Date(selectedDate + 'T00:00:00');
    reminderDate.setDate(reminderDate.getDate() - depositDeadlineDays);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];
    const startIso = reminderDateStr.replace(/-/g, '') + 'T090000';
    const endIso = reminderDateStr.replace(/-/g, '') + 'T100000';
    const details = encodeURIComponent(`Reminder to pay the remaining balance of ${formatCost(amountDueLater)} for your M/Y Whiskey charter on ${selectedDate}.`);
    const loc = encodeURIComponent(location);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${loc}`;
  };

  const handleShare = () => {
    const text = `We're going on the ${item.title}! ⛵ Date: ${selectedDate} at ${selectedStartTime} on the ${selectedVessel ? selectedVessel.title : 'Yacht'}. Details: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({
        title: `M/Y Whiskey Charter`,
        text: text,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleContinueToPayment = async () => {
    if (!selectedVesselSlug || !selectedDate || !selectedStartTime) {
      alert('Please select date, time, and vessel in Step 1 first.');
      setBookingStep(1);
      return;
    }
    if (!guestEmail.trim()) {
      alert('Please enter your email in Step 1 first to capture your reservation.');
      setBookingStep(1);
      return;
    }

    setIsAcquiringLock(true);
    setLockError(null);
    try {
      const res = await acquireCheckoutLock(selectedVesselSlug, selectedDate, selectedStartTime, guestEmail);
      if (res.success) {
        setLockTimeRemaining(10 * 60);
        setBookingStep(3);
        refreshAvailabilityData();
      } else {
        const remainingSecs = Math.max(0, Math.floor((new Date(res.activeLock!.expiresAt).getTime() - Date.now()) / 1000));
        const minStr = Math.floor(remainingSecs / 60);
        const secStr = String(remainingSecs % 60).padStart(2, '0');
        
        alert(`This slot is temporarily held in another checkout. It will release in ${minStr}:${secStr} if payment is not completed. Please try again or select another time.`);
        setLockError(`Held by another checkout. Releases in ${minStr}:${secStr}.`);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to establish checkout hold. Please try again.');
    } finally {
      setIsAcquiringLock(false);
    }
  };

  const handleBackToStep2 = async () => {
    try {
      if (selectedVesselSlug && selectedDate && selectedStartTime && guestEmail) {
        await releaseCheckoutLock(selectedVesselSlug, selectedDate, selectedStartTime, guestEmail);
      }
    } catch (err) {
      console.error(err);
    }
    setLockTimeRemaining(null);
    setBookingStep(2);
    refreshAvailabilityData();
  };

  const handleProcessPayment = async () => {
    setIsProcessingPayment(true);
    try {
      const leadMins = getAdventureLeadTime(item);
      const crewMins = item.crewDurationMinutes || item.guestDurationMinutes || 240;

      const isEft = paymentMethod === 'eft';
      // Initial status before Stripe completes. The user will be redirected to Stripe to pay.
      // Webhook will set status to 'pending waiver' or 'pending_funds_verification' accordingly.
      const bookingData = {
        experienceId: item.id || '',
        experienceTitle: item.title,
        vesselSlug: selectedVessel?.slug || '',
        vesselTitle: selectedVessel?.title || 'None',
        captainId: selectedCaptain?.id || '',
        captainTitle: selectedCaptain?.title || 'Independent Operator',
        date: selectedDate,
        startTime: selectedStartTime,
        guestName,
        guestEmail,
        guestPhone,
        guestCount,
        specialConsiderations,
        subtotal,
        salesTax,
        grandTotal: isEft ? grandTotal : grandTotal + convenienceFeeTotal,
        amountPaidToday: 0,
        discountCode: appliedPromo?.code || '',
        discountAmount: discountAmount,
        amountDueLater: paymentPlan === 'deposit' ? amountDueLater : 0,
        paymentPlan,
        cancellationInsurance,
        marketingOptIn,
        status: 'pending' as const,
        guestTitle,
        guestFirstName,
        guestMiddleInitial,
        guestLastName,
        gearSlugs: Object.keys(selectedGearSlugs).filter(slug => selectedGearSlugs[slug]),
        startLocation: item.startLocation || selectedVessel?.homeLocation || 'destin-harbor',
        endLocation: item.endLocation || selectedVessel?.homeLocation || 'destin-harbor',
        leadTimeMinutes: leadMins,
        crewDurationMinutes: crewMins,
        paymentMethod: paymentMethod,
        convenienceFeeAmount: isEft ? 0 : convenienceFeeTotal
      };
      
      const { bookingId, token } = await saveBookingData(bookingData);
      
      try {
        if (selectedVesselSlug && selectedDate && selectedStartTime && guestEmail) {
          await releaseCheckoutLock(selectedVesselSlug, selectedDate, selectedStartTime, guestEmail);
        }
      } catch (lockErr) {
        console.error('Failed to release lock after booking:', lockErr);
      }
      setLockTimeRemaining(null);

      // Trigger Stripe checkout redirect
      const checkRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount: isEft ? amountDueToday : amountDueToday, // amountDueToday includes convenience fees if card
          email: guestEmail,
          experienceTitle: item.title,
          experienceSlug: item.slug,
          date: selectedDate,
          startTime: selectedStartTime,
          vesselTitle: selectedVessel?.title || 'None',
          paymentPlan,
        }),
      });

      if (!checkRes.ok) {
        throw new Error('Failed to create Stripe checkout session');
      }

      const { url } = await checkRes.json();
      window.location.href = url;
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      alert(`Failed to process payment reservation: ${err.message || err}. Please try again.`);
      setIsProcessingPayment(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'clip' }}>
      {/* Dynamic styles for hover states and animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes goldPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(185, 120, 59, 0.3);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(185, 120, 59, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(185, 120, 59, 0);
          }
        }

        .adventure-hero-content {
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .adventure-exclusive-tag {
          animation: goldPulse 2s infinite;
          transition: all 0.3s ease;
        }
        .adventure-exclusive-tag:hover {
          background: rgba(185, 120, 59, 0.35) !important;
          border-color: rgba(185, 120, 59, 0.6) !important;
        }

        .adventure-specs-container {
          margin-top: -3.5rem;
          margin-bottom: 4.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .adventure-spec-card {
          background: rgba(30, 33, 36, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 3px solid transparent;
          backdrop-filter: blur(20px);
          border-radius: 10px;
          padding: 1.5rem 1.75rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .adventure-spec-card:hover {
          transform: translateY(-4px);
          background: rgba(30, 33, 36, 0.9);
          border-top-color: #B9783B;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
          border-color: rgba(185, 120, 59, 0.2) rgba(255, 255, 255, 0.08) rgba(255, 255, 255, 0.08) rgba(255, 255, 255, 0.08);
        }

        .adventure-spec-card:hover .spec-icon-wrapper {
          background: rgba(185, 120, 59, 0.2) !important;
          transform: scale(1.08);
        }

        .spec-icon-wrapper {
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255, 255, 255, 0.03);
          padding: 0.85rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .adventure-spec-info {
          display: flex;
          flex-direction: column;
        }

        .adventure-spec-label {
          font-size: 0.75rem;
          color: #D8C7AF;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.15rem;
        }

        .adventure-spec-value {
          font-size: 1.15rem;
          font-weight: 600;
          color: white;
          font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .adventure-spec-value.highlight {
          color: #B9783B;
        }

        .spec-price-symbol {
          font-size: 1.35rem;
          font-weight: 700;
          color: #B9783B;
          line-height: 1;
        }

        @media (max-width: 767px) {
          .adventure-specs-container {
            margin-top: -2.5rem !important;
            margin-bottom: 2.5rem !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.25rem !important;
            padding: 0 0.25rem !important;
          }
          .adventure-spec-card {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            padding: 0.65rem 0.15rem !important;
            gap: 0.2rem !important;
            justify-content: center !important;
            border-top: 2px solid transparent !important;
            border-radius: 8px !important;
            min-width: 0 !important;
          }
          .adventure-spec-card:hover {
            transform: none !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2) !important;
          }
          .spec-icon-wrapper {
            padding: 0.35rem !important;
            border-radius: 6px !important;
          }
          .spec-icon-wrapper svg {
            width: 16px !important;
            height: 16px !important;
          }
          .spec-price-symbol {
            font-size: 0.95rem !important;
          }
          .adventure-spec-info {
            align-items: center !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .adventure-spec-label {
            font-size: 0.55rem !important;
            letter-spacing: 0.02em !important;
            margin-bottom: 0.1rem !important;
            white-space: normal !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.15 !important;
            width: 100% !important;
            min-height: 2.3em !important;
          }
          .adventure-spec-value {
            font-size: 0.7rem !important;
            font-weight: 700 !important;
            width: 100% !important;
            white-space: normal !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            line-height: 1.15 !important;
            min-height: 2.3em !important;
          }
          .desktop-only {
            display: none !important;
          }
        }

        .adventure-included-card {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .adventure-included-card:hover {
          transform: translateY(-2px);
          border-color: rgba(185, 120, 59, 0.3) !important;
          background: rgba(30, 33, 36, 0.6) !important;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }

        .adventure-itinerary-container {
          display: flex;
          flex-direction: column;
          position: relative;
          padding-left: 2.25rem;
          border-left: 2px solid rgba(185, 120, 59, 0.15);
        }

        .adventure-itinerary-step {
          position: relative;
          margin-bottom: 1.5rem;
          transition: all 0.3s ease;
        }

        .adventure-itinerary-step:hover {
          transform: translateX(6px);
        }

        .adventure-itinerary-step:hover .timeline-dot {
          background: #B9783B !important;
          color: white !important;
          box-shadow: 0 0 0 6px rgba(185, 120, 59, 0.25);
          border-color: #B9783B !important;
        }

        .timeline-dot {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: absolute;
          left: -2.95rem;
          top: 0.1rem;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          color: #B9783B;
          z-index: 2;
        }

        .itinerary-step-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.15rem;
        }

        .itinerary-step-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: white;
          margin: 0;
          font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.01em;
        }

        .itinerary-step-time {
          font-size: 0.8rem;
          color: #B9783B;
          font-weight: 600;
          text-transform: uppercase;
        }

        .itinerary-step-description {
          font-size: 0.95rem;
          color: #D8C7AF;
          line-height: 1.5;
          margin: 0;
          opacity: 0.9;
        }

        .itinerary-step-offset {
          font-size: 0.75rem;
          color: #D8C7AF;
          opacity: 0.4;
          margin-top: 0.2rem;
          font-style: italic;
        }

        .itinerary-location-row {
          position: relative;
          margin-top: 0.5rem;
          display: flex;
        }

        .itinerary-location-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0.3rem 0.6rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }

        .itinerary-location-badge:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(185, 120, 59, 0.3);
        }

        .itinerary-location-image {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          object-fit: cover;
        }

        .itinerary-location-fallback {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: rgba(185, 120, 59, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .itinerary-location-info {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .itinerary-location-title {
          font-size: 0.82rem;
          font-weight: 600;
          color: white;
        }

        .itinerary-location-link {
          font-size: 0.72rem;
          color: #B9783B;
          text-decoration: none;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s;
        }

        .itinerary-location-link:hover {
          border-bottom-color: #B9783B;
        }

        @media (max-width: 767px) {
          .adventure-itinerary-container {
            padding-left: 1.4rem !important;
          }
          .adventure-itinerary-step {
            margin-bottom: 0.9rem !important;
          }
          .adventure-itinerary-step:hover {
            transform: none !important;
          }
          .adventure-itinerary-step:hover .timeline-dot {
            box-shadow: 0 0 0 3px rgba(185, 120, 59, 0.25) !important;
          }
          .timeline-dot {
            left: -1.825rem !important;
            width: 17px !important;
            height: 17px !important;
            font-size: 0.55rem !important;
            top: 0.08rem !important;
          }
          .itinerary-step-header {
            gap: 0.3rem !important;
            margin-bottom: 0.05rem !important;
          }
          .itinerary-step-title {
            font-size: 0.95rem !important;
          }
          .itinerary-step-time {
            font-size: 0.68rem !important;
          }
          .itinerary-step-description {
            font-size: 0.8rem !important;
            line-height: 1.35 !important;
          }
          .itinerary-step-offset {
            font-size: 0.68rem !important;
            margin-top: 0.1rem !important;
          }
          .itinerary-location-row {
            margin-top: 0.35rem !important;
          }
          .itinerary-location-badge {
            padding: 0.2rem 0.45rem !important;
            gap: 0.4rem !important;
            border-radius: 4px !important;
          }
          .itinerary-location-image,
          .itinerary-location-fallback {
            width: 22px !important;
            height: 22px !important;
          }
          .itinerary-location-info {
            gap: 0.35rem !important;
          }
          .itinerary-location-title {
            font-size: 0.75rem !important;
          }
          .itinerary-location-link {
            font-size: 0.68rem !important;
          }
        }

        .adventure-sidebar-card {
          border-top: 4px solid #B9783B !important;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .adventure-sidebar-card:hover {
          box-shadow: 0 25px 50px rgba(0,0,0,0.4) !important;
          border-top-color: #d28c4b !important;
          transform: translateY(-2px);
        }

        .adventure-inquiry-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }

        .adventure-inquiry-btn:hover {
          background: #a2642e !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(185, 120, 59, 0.4) !important;
        }

        .custom-select-dark {
          background-color: #121416;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #F4F1EA;
          padding: 0.75rem;
          border-radius: 6px;
          outline: none;
          font-size: 0.9rem;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .custom-select-dark:focus {
          border-color: #B9783B;
        }

        .addon-checkbox-label {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 6px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer;
          transition: all 0.2s;
        }

        .addon-checkbox-label:hover {
          background: rgba(185, 120, 59, 0.05);
          border-color: rgba(185, 120, 59, 0.2);
        }

        .addon-checkbox-label.checked {
          background: rgba(185, 120, 59, 0.1);
          border-color: rgba(185, 120, 59, 0.4);
        }

        .adventure-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 420px;
          gap: 3.5rem;
          align-items: start;
        }

        .adventure-sidebar-wrapper {
          position: sticky;
          top: 100px;
        }

        .mobile-bottom-bar {
          display: none;
        }

        .adventure-content-container {
          padding: 0 2rem 6rem 2rem;
        }

        @media (max-width: 992px) {
          .adventure-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 2rem;
          }
          .adventure-sidebar-wrapper {
            position: relative;
            top: 0;
            margin-top: 1rem;
          }
          .mobile-bottom-bar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(18, 20, 22, 0.98);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(185, 120, 59, 0.2);
            padding: 1rem 1.5rem;
            z-index: 1000;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 -5px 25px rgba(0,0,0,0.5);
          }
        }

        @media (max-width: 767px) {
          .adventure-content-container {
            padding: 0 1rem 4rem 1rem !important;
          }
        }
      ` }} />

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        height: '70vh',
        minHeight: '500px',
        width: '100%',
        background: item.heroImage ? `url(${item.heroImage}) no-repeat center/cover` : '#1E2124',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start'
      }}>
        {/* Dark Cinematic Vignette */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(18, 20, 22, 1) 0%, rgba(18, 20, 22, 0.5) 50%, rgba(18, 20, 22, 0.2) 100%)',
          zIndex: 1
        }} />

        <div 
          className="adventure-hero-content"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            padding: '0 2rem 5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          <div 
            className="adventure-exclusive-tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(185, 120, 59, 0.2)',
              border: '1px solid rgba(185, 120, 59, 0.45)',
              color: '#B9783B',
              padding: '0.45rem 1.15rem',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              width: 'fit-content',
              cursor: 'default'
            }}
          >
            <Compass size={14} style={{ color: '#B9783B' }} />
            Exclusive Adventure
          </div>
          
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 700,
            lineHeight: 1.05,
            color: 'white',
            margin: 0,
            letterSpacing: '0.01em',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            {item.title}
          </h1>

          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            color: '#D8C7AF',
            maxWidth: '750px',
            margin: 0,
            lineHeight: '1.65',
            fontWeight: 400,
            opacity: 0.95,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)'
          }}>
            {item.shortDescription}
          </p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div 
        className="adventure-content-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 5
        }}
      >
        {/* Specs Bar (Overlap Hero) */}
        <div className="adventure-specs-container">
          {/* Duration */}
          <div className="adventure-spec-card">
            <div className="spec-icon-wrapper">
              <Clock size={22} color="#B9783B" />
            </div>
            <div className="adventure-spec-info">
              <div className="adventure-spec-label">Duration</div>
              <div className="adventure-spec-value">
                {formatDuration(guestMinutes)}
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div className="adventure-spec-card">
            <div className="spec-icon-wrapper">
              <Users size={22} color="#B9783B" />
            </div>
            <div className="adventure-spec-info">
              <div className="adventure-spec-label">Capacity</div>
              <div className="adventure-spec-value">Up to {capacity} Guests</div>
            </div>
          </div>

          {/* Departure */}
          <div className="adventure-spec-card">
            <div className="spec-icon-wrapper">
              <MapPin size={22} color="#B9783B" />
            </div>
            <div className="adventure-spec-info">
              <div className="adventure-spec-label">Departure</div>
              <div className="adventure-spec-value">{location}</div>
            </div>
          </div>

          {/* Price */}
          <div className="adventure-spec-card">
            <div className="spec-icon-wrapper">
              <span className="spec-price-symbol">{currencySymbol}</span>
            </div>
            <div className="adventure-spec-info">
              <div className="adventure-spec-label">
                <span className="desktop-only">Charter </span>Price
              </div>
              <div className="adventure-spec-value highlight">
                {price > 0 ? `From ${formatCost(price)}` : 'Book'}
              </div>
            </div>
          </div>
        </div>

        {/* Layout Splitting */}
        <div className="adventure-layout">
          
          {/* Main Left Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            
            {/* Overview & Detailed Description */}
            <div>
              <h2 className="adventure-section-heading">
                Overview
              </h2>
              <div style={{ fontSize: '1.05rem', color: '#D8C7AF', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: 0.95 }} className="prose prose-invert">
                {markdownDescription ? (
                  <ReactMarkdown>{markdownDescription}</ReactMarkdown>
                ) : (
                  <>
                    <p>{item.shortDescription || 'Experience the crystal clear waters of Destin on our premium private yacht charter. Tailored to your every desire, this private experience is fully customizable, offering the ultimate luxury cruise.'}</p>
                    <p>Our experienced captain and deckhands will take care of every detail, ensuring your safety and luxury standard. Relax in style and comfort, and make unforgettable memories.</p>
                  </>
                )}
              </div>
            </div>

            {/* What's Included */}
            {included.length > 0 && (
              <div>
                <h2 className="adventure-section-heading">
                  What's Included
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {included.map((incItem: string, idx: number) => {
                    const icon = getIncludedIcon(incItem, globalIncludedItems);
                    return (
                      <div 
                        key={idx} 
                        className="adventure-included-card"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          background: '#1E2124', 
                          border: '1px solid rgba(255, 255, 255, 0.05)', 
                          padding: '0.45rem 0.85rem', 
                          borderRadius: '20px',
                          fontSize: '0.875rem',
                          color: '#F4F1EA',
                          fontWeight: 500,
                          boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ 
                          color: '#B9783B', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0 
                        }}>
                          {icon}
                        </div>
                        <span>{incItem}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Itinerary */}
            {computedItinerary.length > 0 && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '1rem', 
                  marginBottom: '2.25rem', 
                  borderBottom: '1px solid rgba(255,255,255,0.05)', 
                  paddingBottom: '0.75rem' 
                }}>
                  <div>
                    <h2 className="adventure-section-heading" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
                      Itinerary & Schedule
                    </h2>
                    {/* Time sums under the title */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(185, 120, 59, 0.1)', border: '1px solid rgba(185, 120, 59, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600 }}>
                        <Clock size={13} />
                        <span>Experience Time: {formatDuration(guestMinutes)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {computedItinerary.some((s: any) => s.isCrewOnly) && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#D8C7AF', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                          type="checkbox"
                          checked={showCrewDuties}
                          onChange={e => setShowCrewDuties(e.target.checked)}
                          style={{ width: '15px', height: '15px', accentColor: '#B9783B', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 600 }}>Show Crew Duties</span>
                      </label>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.8 }}>Select Time:</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {startTimes.map(time => {
                        const isSelected = selectedStartTime === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedStartTime(time)}
                            style={{
                              padding: '0.45rem 0.85rem',
                              borderRadius: '6px',
                              border: isSelected ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.1)',
                              background: isSelected ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                              color: isSelected ? '#B9783B' : '#D8C7AF',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                              }
                            }}
                            onMouseOut={e => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
                <div className="adventure-itinerary-container">
                  {computedItinerary
                    .filter((step: any) => showCrewDuties || !step.isCrewOnly)
                    .map((step: any, idx: number) => {
                      const isCrewStep = step.isCrewOnly;
                      return (
                        <div 
                          key={idx} 
                          className="adventure-itinerary-step"
                          style={{ 
                            opacity: isCrewStep ? 0.75 : 1,
                            zIndex: hoveredLocationIndex === idx ? 10 : 1
                          }}
                        >
                          {/* Timeline node dot (Numbered) */}
                          <div 
                            className="timeline-dot" 
                            style={{
                              background: isCrewStep ? 'rgba(185, 120, 59, 0.1)' : '#121416',
                              border: isCrewStep ? '2px dashed #B9783B' : '2px solid #B9783B',
                            }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </div>

                          <div className="itinerary-step-header">
                            <h3 className="itinerary-step-title">
                              {step.title}
                            </h3>
                            {step.formattedTime && (
                              <span className="itinerary-step-time">
                                ({step.formattedTime})
                              </span>
                            )}
                            {isCrewStep && (
                              <span style={{ 
                                display: 'inline-block',
                                background: 'rgba(185, 120, 59, 0.15)',
                                color: '#B9783B',
                                border: '1px solid rgba(185, 120, 59, 0.3)',
                                fontSize: '0.65rem',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Crew Only
                              </span>
                            )}
                          </div>
                          
                          <p className="itinerary-step-description">
                            {step.description}
                          </p>

                          {/* Connected Location Row */}
                          {(() => {
                            const linkedLocation = step.locationSlug ? allLocations.find((l: any) => l.slug === step.locationSlug) : null;
                            if (!linkedLocation) return null;
                            
                            const isHovered = hoveredLocationIndex === idx;
                            
                            return (
                              <div className="itinerary-location-row">
                                <div 
                                  className="itinerary-location-badge"
                                  onMouseEnter={() => setHoveredLocationIndex(idx)}
                                  onMouseLeave={() => setHoveredLocationIndex(null)}
                                >
                                  {linkedLocation.heroImage ? (
                                    <img 
                                      src={linkedLocation.heroImage} 
                                      alt={linkedLocation.title} 
                                      className="itinerary-location-image"
                                    />
                                  ) : (
                                    <div className="itinerary-location-fallback">
                                      <Anchor size={14} style={{ color: '#B9783B' }} />
                                    </div>
                                  )}
                                  <div className="itinerary-location-info">
                                    <span className="itinerary-location-title">
                                      {linkedLocation.title}
                                    </span>
                                    <a 
                                      href={`/locations/${linkedLocation.slug}`}
                                      className="itinerary-location-link"
                                      onMouseEnter={(e) => e.stopPropagation()} // keep card showing when hovering the link
                                    >
                                      Learn more
                                    </a>
                                  </div>
                                </div>

                                {/* Floating Location Card Popover */}
                                {isHovered && (
                                  <div 
                                    style={{
                                      position: 'absolute',
                                      left: '0',
                                      top: 'calc(100% + 8px)',
                                      width: '280px',
                                      background: 'rgba(18, 20, 22, 0.98)',
                                      backdropFilter: 'blur(12px)',
                                      border: '1px solid rgba(185, 120, 59, 0.25)',
                                      borderRadius: '12px',
                                      overflow: 'hidden',
                                      boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(185, 120, 59, 0.1)',
                                      zIndex: 50,
                                    }}
                                    onMouseEnter={() => setHoveredLocationIndex(idx)}
                                    onMouseLeave={() => setHoveredLocationIndex(null)}
                                  >
                                    {linkedLocation.heroImage && (
                                      <div style={{ width: '100%', height: '120px', overflow: 'hidden', position: 'relative' }}>
                                        <img src={linkedLocation.heroImage} alt={linkedLocation.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', height: '40px', background: 'linear-gradient(to top, rgba(18,20,22,0.98), transparent)' }} />
                                      </div>
                                    )}
                                    <div style={{ padding: '1rem' }}>
                                      <h4 style={{ fontSize: '1.05rem', color: 'white', fontWeight: 600, margin: '0 0 0.35rem 0', fontFamily: "'Cormorant Garamond', serif" }}>
                                        {linkedLocation.title}
                                      </h4>
                                      
                                      {linkedLocation.latitude && linkedLocation.longitude && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#B9783B', fontWeight: 500, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                          <MapPin size={10} />
                                          {Number(linkedLocation.latitude).toFixed(4)}°, {Number(linkedLocation.longitude).toFixed(4)}°
                                        </div>
                                      )}

                                      <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8, margin: '0 0 0.75rem 0', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {linkedLocation.shortDescription || linkedLocation.description}
                                      </p>

                                      {linkedLocation.suitability && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                          {linkedLocation.suitability.split(',').slice(0, 2).map((s: string, sIdx: number) => (
                                            <span key={sIdx} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                              {s.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                      
                      {idx > 0 && step.offsetMinutes > 0 && (
                        <div className="itinerary-step-offset">
                          +{step.offsetMinutes} minutes from previous step
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
                
                {/* Interactive Stops Route Map */}
                <ItineraryMap 
                  steps={computedItinerary.filter((step: any) => showCrewDuties || !step.isCrewOnly)}
                  allLocations={allLocations}
                  hoveredLocationIndex={hoveredLocationIndex}
                  setHoveredLocationIndex={setHoveredLocationIndex}
                  isMapsApiLoaded={isMapsApiLoaded}
                />
              </div>
            )}

            {/* Connected Relations (Assets, Locations, Staff) */}
            {(linkedAssets.length > 0 || linkedLocations.length > 0 || linkedStaff.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '3.5rem', marginTop: '1rem' }}>
                
                {/* Linked Locations stops */}
                {linkedLocations.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', marginBottom: '1.25rem' }}>
                      Key Stops & Highlights
                    </h3>
                    <SwipeScrollContainer
                      active={true}
                      gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
                      gap="1.5rem"
                      arrowColor="#B9783B"
                    >
                      {linkedLocations.map((loc: any) => (
                        <a
                          key={loc.id}
                          href={`/locations/${loc.slug}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#1E2124',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            transition: 'all 0.25s'
                          }}
                          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {loc.heroImage && (
                            <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
                              <img src={loc.heroImage} alt={loc.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          <div style={{ padding: '1.25rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Explore Location</span>
                            <h4 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: "'Cormorant Garamond', serif" }}>{loc.title}</h4>
                            <p style={{ fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.7, margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', height: '2.4rem' }}>{loc.shortDescription}</p>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600, marginTop: '0.75rem' }}>
                              View Location Guide <ExternalLink size={12} />
                            </span>
                          </div>
                        </a>
                      ))}
                    </SwipeScrollContainer>
                  </div>
                )}

                {/* Linked Assets stops */}
                {linkedAssets.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', marginBottom: '1.25rem' }}>
                      Featured Vessel & Equipment
                    </h3>
                    <SwipeScrollContainer
                      active={true}
                      gridTemplateColumns="repeat(auto-fit, minmax(260px, 1fr))"
                      gap="1.5rem"
                      arrowColor="#B9783B"
                    >
                      {linkedAssets.map((asset: any) => (
                        <a
                          key={asset.id}
                          href={`/fleet/${asset.slug}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#1E2124',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            transition: 'all 0.25s'
                          }}
                          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          {asset.heroImage && (
                            <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
                              <img src={asset.heroImage} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                          <div style={{ padding: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{asset.category || 'Asset'}</span>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                color: asset.isVessel ? '#B9783B' : ((item.addonAssetSlugs || []).includes(asset.slug) ? '#D8C7AF' : '#10B981'), 
                                background: asset.isVessel ? 'rgba(185,120,59,0.1)' : ((item.addonAssetSlugs || []).includes(asset.slug) ? 'rgba(216,199,175,0.08)' : 'rgba(16,185,129,0.1)'), 
                                border: asset.isVessel ? '1px solid rgba(185,120,59,0.2)' : ((item.addonAssetSlugs || []).includes(asset.slug) ? '1px solid rgba(216,199,175,0.15)' : '1px solid rgba(16,185,129,0.2)'),
                                padding: '0.15rem 0.45rem', 
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                              }}>
                                {asset.isVessel ? 'Vessel Option' : ((item.addonAssetSlugs || []).includes(asset.slug) ? 'Optional Add-on' : 'Included')}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: "'Cormorant Garamond', serif" }}>{asset.title}</h4>
                            <p style={{ fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.7, margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', height: '2.4rem' }}>{asset.shortDescription}</p>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600, marginTop: '0.75rem' }}>
                              View Equipment Specs <ExternalLink size={12} />
                            </span>
                          </div>
                        </a>
                      ))}
                    </SwipeScrollContainer>
                  </div>
                )}

                {/* Linked Crew stops */}
                {linkedStaff.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.75rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', marginBottom: '1.25rem' }}>
                      Assigned Crew & Guides
                    </h3>
                    <SwipeScrollContainer
                      active={true}
                      gridTemplateColumns="repeat(auto-fit, minmax(260px, 1fr))"
                      gap="1.5rem"
                      arrowColor="#B9783B"
                    >
                      {linkedStaff.map((staff: any) => {
                        const isCaptain = staff.isCaptain === true;
                        const isSelected = selectedCaptainId === staff.id;
                        const isCertified = !selectedVesselSlug || (staff.certifiedVessels || []).includes(selectedVesselSlug);
                        
                        if (isCaptain) {
                          return (
                            <div
                              key={staff.id}
                              onClick={() => {
                                if (isCertified) {
                                  setSelectedCaptainId(isSelected ? '' : staff.id);
                                }
                              }}
                              style={{
                                display: 'flex',
                                background: '#1E2124',
                                border: isSelected ? '2px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                transition: 'all 0.25s',
                                cursor: isCertified ? 'pointer' : 'not-allowed',
                                opacity: isCertified ? 1 : 0.45,
                                position: 'relative'
                              }}
                              onMouseOver={e => { if (isCertified) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                              onMouseOut={e => { if (isCertified) e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              {staff.heroImage && (
                                <div style={{ width: '90px', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                                  <img src={staff.heroImage} alt={staff.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}
                              <div style={{ padding: '1rem', flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: isCertified ? '#B9783B' : '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {staff.role || 'Captain'}
                                  </span>
                                  {isSelected && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem',
                                      background: '#B9783B',
                                      color: 'white',
                                      fontSize: '0.65rem',
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontWeight: 600
                                    }}>
                                      <Check size={10} strokeWidth={3} /> Selected Captain
                                    </span>
                                  )}
                                </div>
                                <h4 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600, margin: '0 0 0.25rem 0', fontFamily: "'Cormorant Garamond', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {staff.title}
                                </h4>
                                
                                {/* Star Rating */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginBottom: '0.35rem' }}>
                                  {[...Array(5)].map((_, i) => {
                                    const ratingVal = staff.rating !== undefined ? Number(staff.rating) : 5;
                                    const isFilled = i < Math.floor(ratingVal);
                                    return (
                                      <Star 
                                        key={i} 
                                        size={11} 
                                        color="#B9783B"
                                        fill={isFilled ? "#B9783B" : "transparent"} 
                                        style={{ opacity: isFilled ? 1 : 0.2 }}
                                      />
                                    );
                                  })}
                                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginLeft: '0.25rem', fontWeight: 600 }}>
                                    {Number(staff.rating !== undefined ? staff.rating : 5).toFixed(1)}
                                  </span>
                                </div>
 
                                <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {staff.shortDescription}
                                </p>
                                
                                {!isCertified ? (
                                  <div style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600, marginTop: '0.35rem' }}>
                                    Not certified for selected vessel
                                  </div>
                                ) : (
                                  <div style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, marginTop: '0.35rem' }}>
                                    Rate: +{formatCost(staff.hourlyRate || staff.dailyRate)}/hr (+{formatCost((staff.hourlyRate || staff.dailyRate) * crewHours)} Total)
                                  </div>
                                )}
                                <a
                                  href={`/crew/${staff.slug}`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.75rem',
                                    color: '#B9783B',
                                    fontWeight: 600,
                                    marginTop: '0.5rem',
                                    textDecoration: 'none'
                                  }}
                                  onMouseOver={e => e.currentTarget.style.color = '#d48d48'}
                                  onMouseOut={e => e.currentTarget.style.color = '#B9783B'}
                                >
                                  View Profile <ExternalLink size={10} />
                                </a>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <a
                            key={staff.id}
                            href={`/crew/${staff.slug}`}
                            style={{
                              display: 'flex',
                              background: '#1E2124',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              textDecoration: 'none',
                              transition: 'all 0.25s'
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            {staff.heroImage && (
                              <div style={{ width: '90px', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
                                <img src={staff.heroImage} alt={staff.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            )}
                            <div style={{ padding: '1rem', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.15rem' }}>{staff.role || 'Crew'}</span>
                              <h4 style={{ fontSize: '1.1rem', color: 'white', fontWeight: 600, margin: '0 0 0.25rem 0', fontFamily: "'Cormorant Garamond', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.title}</h4>
                              
                              {/* Star Rating */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', marginBottom: '0.35rem' }}>
                                {[...Array(5)].map((_, i) => {
                                  const ratingVal = staff.rating !== undefined ? Number(staff.rating) : 5;
                                  const isFilled = i < Math.floor(ratingVal);
                                  return (
                                    <Star 
                                      key={i} 
                                      size={11} 
                                      color="#B9783B"
                                      fill={isFilled ? "#B9783B" : "transparent"} 
                                      style={{ opacity: isFilled ? 1 : 0.2 }}
                                    />
                                  );
                                })}
                                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginLeft: '0.25rem', fontWeight: 600 }}>
                                  {Number(staff.rating !== undefined ? staff.rating : 5).toFixed(1)}
                                </span>
                              </div>

                              <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{staff.shortDescription}</p>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, marginTop: '0.5rem' }}>
                                View Profile <ExternalLink size={10} />
                              </span>
                            </div>
                          </a>
                        );
                      })}
                    </SwipeScrollContainer>
                  </div>
                )}

              </div>
            )}

            {/* Media Gallery & Documents Section */}
            {galleryItems.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '3.5rem', marginTop: '1rem' }}>
                <h2 className="adventure-section-heading">
                  Gallery & Documents
                </h2>
                
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                  {(['all', 'images', 'videos', 'documents'] as const).map(tab => {
                    const count = tab === 'all' 
                      ? galleryItems.length 
                      : galleryItems.filter(item => {
                          if (tab === 'images') return item.type === 'image';
                          if (tab === 'videos') return item.type === 'video';
                          if (tab === 'documents') return item.type === 'document';
                          return false;
                        }).length;
                    
                    if (count === 0 && tab !== 'all') return null;

                    const isActive = activeGalleryTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveGalleryTab(tab)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderBottom: isActive ? '2px solid #B9783B' : '2px solid transparent',
                          color: isActive ? '#B9783B' : '#D8C7AF',
                          padding: '0.5rem 0.25rem',
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'all 0.25s'
                        }}
                      >
                        {tab} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Filtered Gallery Grid */}
                <SwipeScrollContainer
                  active={true}
                  gridTemplateColumns="repeat(auto-fill, minmax(220px, 1fr))"
                  gap="1rem"
                  arrowColor="#B9783B"
                >
                  {galleryItems
                    .filter(media => {
                      if (activeGalleryTab === 'all') return true;
                      if (activeGalleryTab === 'images') return media.type === 'image';
                      if (activeGalleryTab === 'videos') return media.type === 'video';
                      if (activeGalleryTab === 'documents') return media.type === 'document';
                      return true;
                    })
                    .map((media, idx) => {
                      if (media.type === 'document') {
                        return (
                          <a
                            key={idx}
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                              background: '#1E2124',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              padding: '1.25rem',
                              textDecoration: 'none',
                              color: 'white',
                              transition: 'all 0.25s'
                            }}
                            onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.4)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                          >
                            <div style={{ background: 'rgba(185,120,59,0.1)', color: '#B9783B', width: '36px', height: '36px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <FileText size={20} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {media.name || 'View Document'}
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                Download File <Download size={12} />
                              </span>
                            </div>
                          </a>
                        );
                      }

                      // Image/Video Rendering
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setActiveLightboxUrl(media.url);
                            setActiveLightboxType(media.type === 'video' ? 'video' : 'image');
                          }}
                          style={{
                            position: 'relative',
                            aspectRatio: '4/3',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.06)',
                            background: '#1E2124'
                          }}
                        >
                          {media.type === 'image' ? (
                            <img src={media.url} alt={media.name || 'Gallery Image'} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                              {/* Simple video thumbnail overlay */}
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 1 }}>
                                <div style={{ background: '#B9783B', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                  <Film size={16} />
                                </div>
                              </div>
                              <div style={{ width: '100%', height: '100%', background: '#121416' }} />
                            </div>
                          )}
                          {media.name && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 2 }}>
                              {media.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </SwipeScrollContainer>
              </div>
            )}
          </div>

          {/* Sidebar Booking Card */}
          <div className="adventure-sidebar-wrapper" id="booking-widget">
            <div 
              className="adventure-sidebar-card"
              style={{
                background: '#1E2124',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.75rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                animation: 'fadeInUp 0.3s ease-out',
                width: '100%',
                maxWidth: '420px',
                marginLeft: 'auto'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.25rem 0', letterSpacing: '0.01em' }}>
                  {bookingStep === 4 ? 'Sign Passenger Waiver' : bookingStep === 5 ? 'Booking Completed' : 'Request Bareboat Charter'}
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.6, margin: 0 }}>
                  {bookingStep === 4 ? 'Federal regulation passenger liability waiver' : bookingStep === 5 ? 'Your luxury voyage has been scheduled' : 'Customize your luxury private experience'}
                </p>
              </div>

              {/* Progress Steps Header */}
              {bookingStep < 5 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem', marginBottom: '0.25rem' }}>
                  {[1, 2, 3, 4].map((stepNum) => {
                    const isActive = bookingStep === stepNum;
                    const isCompleted = bookingStep > stepNum;
                    return (
                      <div key={stepNum} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: isCompleted ? '#708C84' : isActive ? '#B9783B' : 'rgba(255,255,255,0.05)',
                          color: isCompleted || isActive ? 'white' : '#D8C7AF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          border: isActive ? '1px solid #B9783B' : 'none'
                        }}>
                          {isCompleted ? <Check size={10} /> : stepNum}
                        </div>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: isActive ? 600 : 400, 
                          color: isActive ? '#B9783B' : isCompleted ? '#708C84' : '#D8C7AF', 
                          opacity: isActive || isCompleted ? 1 : 0.5 
                        }}>
                          {stepNum === 1 ? 'Configure' : stepNum === 2 ? 'Add-ons' : stepNum === 3 ? 'Checkout' : 'Waiver'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 1: CONFIGURE BASE DETAILS */}
              {bookingStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Select Date (Interactive Calendar) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Date</span>
                    
                    {!isCalendarExpanded && selectedDate ? (
                      <div 
                        onClick={() => setIsCalendarExpanded(true)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: '#121416', 
                          border: '1px solid rgba(185, 120, 59, 0.3)', 
                          borderRadius: '8px', 
                          padding: '0.6rem 0.75rem', 
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#B9783B';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(185, 120, 59, 0.3)';
                          e.currentTarget.style.background = '#121416';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.9rem' }}>📅</span>
                          <span style={{ fontSize: '0.78rem', color: 'white', fontWeight: 600 }}>
                            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#B9783B', fontWeight: 600 }}>Change</span>
                      </div>
                    ) : (
                      <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.65rem 0.7rem' }}>
                        {/* Calendar Navigation Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const prevMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
                              const now = new Date();
                              now.setDate(1);
                              now.setHours(0,0,0,0);
                              if (prevMonth.getTime() >= now.getTime()) {
                                setCalendarMonth(prevMonth);
                              }
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                            {calendarMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {selectedDate && (
                              <button
                                type="button"
                                onClick={() => setIsCalendarExpanded(false)}
                                style={{ background: 'transparent', border: 'none', color: '#708C84', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.3rem' }}
                              >
                                Close
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Calendar Weekday Names */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', marginBottom: '0.3rem' }}>
                          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                            <span key={dayName} style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600 }}>{dayName}</span>
                          ))}
                        </div>

                        {/* Calendar Days Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
                          {getDaysInMonth(calendarMonth).map((dayObj, idx) => {
                            if (dayObj.day === null) {
                              return <div key={`empty-${idx}`} />;
                            }
                            const isSelected = selectedDate === dayObj.dateStr;
                            return (
                              <button
                                key={`day-${dayObj.dateStr}`}
                                type="button"
                                disabled={!dayObj.isAvailable}
                                onClick={() => {
                                  setSelectedDate(dayObj.dateStr);
                                  setIsCalendarExpanded(false);
                                }}
                                style={{
                                  border: 'none',
                                  background: isSelected 
                                    ? '#B9783B' 
                                    : 'transparent',
                                  color: isSelected 
                                    ? 'white' 
                                    : dayObj.isAvailable 
                                      ? '#D8C7AF' 
                                      : 'rgba(255,255,255,0.15)',
                                  padding: '0.35rem 0',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: dayObj.isAvailable ? 'pointer' : 'not-allowed',
                                  textDecoration: dayObj.isAvailable ? 'none' : 'line-through',
                                  position: 'relative'
                                }}
                                title={dayObj.isAvailable ? undefined : 'Fully Booked / Unavailable'}
                              >
                                {dayObj.day}
                                {/* Tiny dot below day for availability status */}
                                <span style={{
                                  position: 'absolute',
                                  bottom: '2px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: '3px',
                                  height: '3px',
                                  borderRadius: '50%',
                                  background: isSelected 
                                    ? 'white' 
                                    : dayObj.isAvailable 
                                      ? '#708C84' 
                                      : '#ef4444'
                                }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Select Time */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Departure Time</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {startTimes.map(time => {
                        const isSelected = selectedStartTime === time;
                        const checkResult = selectedDate 
                          ? checkSlotAvailability(selectedVesselSlug || '', selectedDate, time, guestEmail) 
                          : { blocked: false };
                        const isTimeBlocked = checkResult.blocked;
                        
                        let titleText = undefined;
                        if (isTimeBlocked) {
                          if (checkResult.reason === 'booking-overlap') {
                            titleText = `Booked by ${checkResult.detail || 'another guest'} (or blocked by transit buffer)`;
                          } else if (checkResult.reason === 'vessel-blackout') {
                            titleText = `Blocked for maintenance: ${checkResult.detail || 'blackout'}`;
                          } else if (checkResult.reason === 'checkout-lock') {
                            titleText = "Temporarily held in another guest's checkout";
                          } else if (checkResult.reason === 'no-captain') {
                            titleText = 'No certified captain available at this time';
                          } else {
                            titleText = 'Unavailable';
                          }
                        }

                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={isTimeBlocked}
                            onClick={() => setSelectedStartTime(time)}
                            style={{
                              flex: 1,
                              minWidth: '70px',
                              padding: '0.5rem 0.6rem',
                              borderRadius: '6px',
                              border: isSelected 
                                ? '1px solid #B9783B' 
                                : isTimeBlocked 
                                  ? '1px dashed rgba(255,255,255,0.04)' 
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                              background: isSelected 
                                ? 'rgba(185, 120, 59, 0.15)' 
                                : isTimeBlocked 
                                  ? 'rgba(255,255,255,0.01)' 
                                  : 'rgba(255, 255, 255, 0.02)',
                              color: isSelected 
                                ? '#B9783B' 
                                : isTimeBlocked 
                                  ? 'rgba(255,255,255,0.15)' 
                                  : '#D8C7AF',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isTimeBlocked ? 'not-allowed' : 'pointer',
                              textDecoration: isTimeBlocked ? 'line-through' : 'none',
                              transition: 'all 0.2s',
                              textAlign: 'center'
                            }}
                            title={titleText}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Select Vessel */}
                  {vesselsList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Vessel (Required)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                        {vesselsList.map(vessel => {
                          const isSelected = selectedVesselSlug === vessel.slug;
                          const vesselHourlyRate = Number(vessel.hourlyRate) || 0;
                          const includedGearRate = includedGearList.reduce((sum: number, g: any) => sum + (Number(g.hourlyRate) || 0), 0);
                          const customBudgetTotal = (item.budgetLineItems || []).reduce((sum: number, li: any) => sum + (Number(li.cost) || 0), 0);
                          const vesselTotalBaseCost = baseExperienceCost + (vesselHourlyRate * guestHours) + (includedGearRate * guestHours) + customBudgetTotal;
                          return (
                            <button
                              key={vessel.slug}
                              type="button"
                              onClick={() => {
                                setSelectedVesselSlug(vessel.slug);
                                if (selectedCaptainId) {
                                  const newCaptain = captains.find(c => c.id === selectedCaptainId);
                                  if (newCaptain && !(newCaptain.certifiedVessels || []).includes(vessel.slug)) {
                                    setSelectedCaptainId('');
                                  }
                                }
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.1rem',
                                padding: '0.35rem 0.25rem',
                                borderRadius: '8px',
                                border: isSelected ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.08)',
                                background: isSelected ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                color: isSelected ? 'white' : '#D8C7AF',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                width: '100%',
                                minHeight: '56px',
                                boxSizing: 'border-box'
                              }}
                            >
                              <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>{vessel.title}</span>
                              <span style={{ fontSize: '0.68rem', color: '#B9783B' }}>{formatCost(vesselTotalBaseCost)} Total</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Select Captain */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Captain & Crew</span>
                      <button 
                        type="button"
                        onClick={() => setShowCrewDuties(!showCrewDuties)}
                        style={{ background: 'transparent', border: 'none', color: '#708C84', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: 0 }}
                      >
                        <Info size={12} /> Duties
                      </button>
                    </div>

                    {showCrewDuties && (
                      <div style={{ background: 'rgba(112, 140, 132, 0.06)', border: '1px solid rgba(112, 140, 132, 0.15)', padding: '0.65rem 0.8rem', borderRadius: '6px', fontSize: '0.72rem', color: '#D8C7AF', lineHeight: '1.4' }}>
                        Under Bareboat regulations, the charterer hires the captain directly as an independent operator. Listed captains are certified for the selected vessel.
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                      {captainOptions.slice(0, isCaptainsExpanded ? undefined : 6).map(captain => {
                        const isSelected = selectedCaptainId === captain.id;
                        const isCapt = captain.id !== '';
                        const isCaptainBooked = !!(isCapt && selectedDate && selectedStartTime && allBookings.some(
                          b => b.captainId === captain.id && b.date === selectedDate && b.startTime === selectedStartTime && b.status !== 'cancelled'
                        ));
                        const name = isCapt ? captain.title.replace('Captain', 'Capt.') : 'Bring Own';
                        const rate = isCapt ? Number(captain.hourlyRate || captain.dailyRate || 0) : 0;
                        const totalRate = rate * totalDutyHours;
                        return (
                          <div
                            key={captain.id}
                            onClick={() => {
                              if (isCaptainBooked) return;
                              setSelectedCaptainId(captain.id);
                            }}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              gap: '0.2rem',
                              padding: '0.4rem 0.2rem',
                              borderRadius: '8px',
                              border: isSelected 
                                ? '1px solid #B9783B' 
                                : isCaptainBooked 
                                  ? '1px dashed rgba(239, 68, 68, 0.2)' 
                                  : '1px solid rgba(255, 255, 255, 0.06)',
                              background: isSelected 
                                ? 'rgba(185, 120, 59, 0.15)' 
                                : isCaptainBooked 
                                  ? 'rgba(239, 68, 68, 0.03)' 
                                  : 'rgba(255, 255, 255, 0.02)',
                              cursor: isCaptainBooked ? 'not-allowed' : 'pointer',
                              opacity: isCaptainBooked ? 0.4 : 1,
                              transition: 'all 0.2s',
                              minHeight: '74px',
                              textAlign: 'center',
                              boxSizing: 'border-box'
                            }}
                            title={isCaptainBooked ? `${captain.title} is already booked for another charter at this time.` : undefined}
                          >
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {captain.heroImage ? (
                                <img src={captain.heroImage} alt={captain.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Users size={12} color="#B9783B" />
                              )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'white', display: 'block' }}>{name}</span>
                              <span style={{ fontSize: '0.6rem', color: '#B9783B', marginTop: '0.05rem' }}>
                                {isCapt ? `+${formatCost(totalRate)}` : 'Operator'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>



                  {/* Contact Info (for Early Lead Capture) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Contact Information</span>
                    
                    {/* Compact Stacked Name Grid to prevent overflow */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
                        <select
                          value={guestTitle}
                          onChange={e => setGuestTitle(e.target.value)}
                          style={{ width: '70px', flexShrink: 0, padding: '0.5rem 0.3rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                        >
                          <option value="">Title</option>
                          <option value="Mr.">Mr.</option>
                          <option value="Ms.">Ms.</option>
                          <option value="Mrs.">Mrs.</option>
                          <option value="Dr.">Dr.</option>
                          <option value="Capt.">Capt.</option>
                        </select>
                        <input 
                          type="text" 
                          placeholder="First Name"
                          value={guestFirstName}
                          onChange={e => setGuestFirstName(e.target.value)}
                          style={{ flex: 1, padding: '0.5rem 0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', minWidth: 0 }}
                          required
                        />
                        <input 
                          type="text" 
                          placeholder="M.I."
                          value={guestMiddleInitial}
                          onChange={e => setGuestMiddleInitial(e.target.value.substring(0, 1))}
                          maxLength={1}
                          style={{ width: '45px', flexShrink: 0, padding: '0.5rem 0.2rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', textAlign: 'center' }}
                        />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Last Name"
                        value={guestLastName}
                        onChange={e => setGuestLastName(e.target.value)}
                        style={{ padding: '0.5rem 0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <input 
                        type="tel" 
                        placeholder="Phone Number"
                        value={guestPhone}
                        onChange={e => setGuestPhone(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', minWidth: 0 }}
                        required
                      />
                      <input 
                        type="email" 
                        placeholder="Email Address"
                        value={guestEmail}
                        onChange={e => setGuestEmail(e.target.value)}
                        style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', minWidth: 0 }}
                        required
                      />
                    </div>
                    <p style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.7, margin: '0.2rem 0', lineHeight: '1.3' }}>
                      * Both phone and email are required. We will send your booking confirmation, digital receipt, and digital waiver links here.
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                      <input 
                        type="checkbox" 
                        checked={marketingOptIn}
                        onChange={e => setMarketingOptIn(e.target.checked)}
                        style={{ accentColor: '#B9783B' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8 }}>Keep me updated on special sailing rates and news.</span>
                    </label>
                  </div>

                  {/* Next Action */}
                  <button
                    type="button"
                    disabled={!selectedDate || !selectedVesselSlug || !guestFirstName.trim() || !guestLastName.trim() || !guestPhone.trim() || !guestEmail.trim() || !guestEmail.includes('@') || !guestEmail.includes('.')}
                    onClick={() => {
                      // Simulated Lead Capture write to DB/Log
                      console.log('Abandoned Cart Trigger: Captured guest info', { guestName, guestEmail, guestPhone, guestCount, specialConsiderations, selectedDate, selectedVesselSlug });
                      setBookingStep(2);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: (!selectedDate || !selectedVesselSlug || !guestFirstName.trim() || !guestLastName.trim() || !guestPhone.trim() || !guestEmail.trim() || !guestEmail.includes('@') || !guestEmail.includes('.')) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                      color: (!selectedDate || !selectedVesselSlug || !guestFirstName.trim() || !guestLastName.trim() || !guestPhone.trim() || !guestEmail.trim() || !guestEmail.includes('@') || !guestEmail.includes('.')) ? '#666' : 'white',
                      padding: '0.8rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      border: 'none',
                      cursor: (!selectedDate || !selectedVesselSlug || !guestName.trim() || !guestPhone.trim() || !guestEmail.trim() || !guestEmail.includes('@') || !guestEmail.includes('.')) ? 'not-allowed' : 'pointer',
                      boxShadow: (!selectedDate || !selectedVesselSlug || !guestName.trim() || !guestPhone.trim() || !guestEmail.trim() || !guestEmail.includes('@') || !guestEmail.includes('.')) ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.3)',
                      transition: 'all 0.2s',
                      marginTop: '0.5rem'
                    }}
                  >
                    Next: Add-ons & Gear <ArrowRight size={14} />
                  </button>
                </div>
              )}

              {/* STEP 2: CHOOSE ADDONS & OPTIONAL GEAR */}
              {bookingStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  
                  {/* Selected Summary Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem' }}>
                    <span style={{ color: '#D8C7AF' }}>Date: {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @ {selectedStartTime}</span>
                    <span style={{ color: '#B9783B', fontWeight: 600 }}>{selectedVessel ? selectedVessel.title : ''}</span>
                  </div>

                  {/* Guests & Group Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Excursion Group Details</span>
                      <span style={{ fontSize: '0.7rem', color: '#B9783B' }}>Max {selectedVessel ? (selectedVessel.capacity || 12) : 12} guests</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8 }}>Number of Passengers / Guests</label>
                      <select 
                        value={guestCount}
                        onChange={e => setGuestCount(Number(e.target.value))}
                        style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
                      >
                        {Array.from({ length: selectedVessel ? (selectedVessel.capacity || 12) : 12 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.2rem' }}>
                      {!isDietaryExpanded ? (
                        <button
                          type="button"
                          onClick={() => setIsDietaryExpanded(true)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#708C84',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            textDecoration: 'underline',
                            textAlign: 'left',
                            padding: '0.2rem 0',
                            width: 'fit-content',
                            outline: 'none'
                          }}
                        >
                          + Add Dietary, Allergy, or Medical Requests
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', animation: 'fadeInUp 0.2s ease-out' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8 }}>Dietary, Allergy, or Medical requests (Optional)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDietaryExpanded(false);
                                setSpecialConsiderations('');
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.65rem', padding: 0 }}
                            >
                              Remove
                            </button>
                          </div>
                          <textarea 
                            placeholder="e.g. Gluten-free requests, allergies, mobility assistance..."
                            value={specialConsiderations}
                            onChange={e => setSpecialConsiderations(e.target.value)}
                            style={{ padding: '0.5rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none', minHeight: '52px', resize: 'vertical' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add-on Products (Food, Drinks, Services) */}
                  {addonsList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Exclusive Experience Add-ons</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {addonsList.map(addon => {
                          const isChecked = !!selectedAddons[addon.name];
                          return (
                            <div
                              key={addon.name}
                              className={`addon-checkbox-label ${isChecked ? 'checked' : ''}`}
                              onClick={() => toggleAddon(addon.name)}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: isChecked ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                                background: isChecked ? 'rgba(185, 120, 59, 0.08)' : 'rgba(255,255,255,0.02)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ accentColor: '#B9783B', marginTop: '0.2rem', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>
                                  <span>{addon.name}</span>
                                  <span style={{ color: '#B9783B' }}>+{formatCost(addon.price)}</span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, margin: '0.15rem 0 0 0', lineHeight: '1.3' }}>
                                  {addon.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gear & Water Toys Checklist */}
                  {addonGearList.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Gear & Water Toys Add-ons</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {addonGearList.map(gear => {
                          const remainingQty = getRemainingGearQuantity(gear.slug, gear.quantity || 1);
                          const isChecked = !!selectedGearSlugs[gear.slug];
                          const isCapReached = !isChecked && remainingQty <= 0;
                          const gearHourlyRate = Number(gear.hourlyRate) || 0;
                          const gearTotalCost = gearHourlyRate * guestHours;
                          return (
                            <div 
                              key={gear.slug} 
                              className={`addon-checkbox-label ${isChecked ? 'checked' : ''} ${isCapReached ? 'disabled' : ''}`}
                              onClick={() => {
                                if (isCapReached) return;
                                setSelectedGearSlugs(prev => ({
                                  ...prev,
                                  [gear.slug]: !prev[gear.slug]
                                }));
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '8px',
                                border: isChecked 
                                  ? '1px solid #B9783B' 
                                  : isCapReached 
                                    ? '1px dashed rgba(255,255,255,0.04)' 
                                    : '1px solid rgba(255, 255, 255, 0.06)',
                                background: isChecked 
                                  ? 'rgba(185, 120, 59, 0.08)' 
                                  : isCapReached 
                                    ? 'rgba(255, 255, 255, 0.01)' 
                                    : 'rgba(255, 255, 255, 0.02)',
                                cursor: isCapReached ? 'not-allowed' : 'pointer',
                                opacity: isCapReached ? 0.5 : 1,
                                transition: 'all 0.2s'
                              }}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                disabled={isCapReached}
                                onChange={() => {}}
                                style={{ accentColor: '#B9783B', marginTop: '0.8rem', cursor: isCapReached ? 'not-allowed' : 'pointer' }}
                              />
                              {gear.heroImage ? (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)', marginTop: '0.1rem' }}>
                                  <img src={gear.heroImage} alt={gear.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              ) : (
                                <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem' }}>
                                  <Compass size={16} color="#B9783B" />
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {gear.title}
                                    {isCapReached && (
                                      <span style={{ fontSize: '0.65rem', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)', padding: '1px 4px', borderRadius: '3px', background: 'rgba(239,68,68,0.05)' }}>
                                        Fully Allocated
                                      </span>
                                    )}
                                    {!isCapReached && gear.quantity && gear.quantity > 1 && (
                                      <span style={{ fontSize: '0.65rem', color: '#708C84', border: '1px solid rgba(112,140,132,0.2)', padding: '1px 4px', borderRadius: '3px', background: 'rgba(112,140,132,0.05)' }}>
                                        {remainingQty} left
                                      </span>
                                    )}
                                  </span>
                                  <span style={{ color: isCapReached ? 'rgba(255,255,255,0.2)' : '#B9783B' }}>
                                    +{formatCost(gearTotalCost)} Total
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, margin: '0.15rem 0 0 0', lineHeight: '1.3' }}>
                                  {gear.shortDescription}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Cancellation Insurance */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Trip Protection</span>
                    <div 
                      onClick={() => setCancellationInsurance(!cancellationInsurance)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: cancellationInsurance ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                        background: cancellationInsurance ? 'rgba(185, 120, 59, 0.08)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input 
                        type="checkbox"
                        checked={cancellationInsurance}
                        onChange={() => {}}
                        style={{ accentColor: '#B9783B', marginTop: '0.2rem', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>
                          <span>Cancellation Insurance</span>
                          <span style={{ color: '#B9783B' }}>+5% of subtotal</span>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, margin: '0.15rem 0 0 0', lineHeight: '1.3' }}>
                          Protect your charter from sudden severe weather, mechanical failures, or sudden medical emergencies. Cancel up to 24 hours prior for a 100% full refund.
                        </p>
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowInsuranceModal(true);
                          }}
                          style={{ 
                            display: 'inline-block', 
                            marginTop: '0.35rem', 
                            fontSize: '0.7rem', 
                            color: '#B9783B', 
                            textDecoration: 'underline', 
                            cursor: 'pointer' 
                          }}
                        >
                          View Cancellation Insurance Policy details
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueToPayment}
                      disabled={isAcquiringLock}
                      style={{
                        flex: 2,
                        background: isAcquiringLock ? 'rgba(255,255,255,0.05)' : '#B9783B',
                        color: isAcquiringLock ? '#666' : 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: isAcquiringLock ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        border: 'none',
                        boxShadow: isAcquiringLock ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.3)'
                      }}
                    >
                      {isAcquiringLock ? 'Holding Slot...' : <>Next: Payment <ArrowRight size={14} /></>}
                    </button>
                  </div>

                </div>
              )}

              {/* STEP 3: BILLING PLAN, TERMS & CREDIT CARD */}
              {bookingStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  
                  {/* Lock Countdown Banner */}
                  {lockTimeRemaining !== null && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      background: 'rgba(112, 140, 132, 0.08)', 
                      border: '1px solid rgba(112, 140, 132, 0.2)', 
                      padding: '0.65rem 0.8rem', 
                      borderRadius: '6px', 
                      fontSize: '0.78rem', 
                      color: '#D8C7AF' 
                    }}>
                      <Clock size={14} color="#708C84" style={{ flexShrink: 0 }} />
                      <span>
                        Checkout held for <strong>{Math.floor(lockTimeRemaining / 60)}:{String(lockTimeRemaining % 60).padStart(2, '0')}</strong>
                      </span>
                    </div>
                  )}

                  {/* Payment Plan Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Payment Plan</span>
                    {isWithinDepositCutoff ? (
                      <div style={{ background: 'rgba(185, 120, 59, 0.05)', border: '1px solid rgba(185, 120, 59, 0.15)', padding: '0.65rem 0.8rem', borderRadius: '6px', fontSize: '0.72rem', color: '#D8C7AF', lineHeight: '1.4' }}>
                        ⚠️ <strong>Full Payment Required:</strong> Your booking is scheduled within {depositDeadlineDays} days of departure. The deposit option is disabled.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div
                          onClick={() => setPaymentPlan('full')}
                          style={{
                            padding: '0.65rem 0.5rem',
                            borderRadius: '8px',
                            border: paymentPlan === 'full' ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.06)',
                            background: paymentPlan === 'full' ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            minHeight: '75px'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>Pay in Full</span>
                          <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.15rem' }}>100% paid today</span>
                          <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, marginTop: '0.2rem' }}>{formatCost(grandTotal)}</span>
                        </div>
                        <div
                          onClick={() => setPaymentPlan('deposit')}
                          style={{
                            padding: '0.65rem 0.5rem',
                            borderRadius: '8px',
                            border: paymentPlan === 'deposit' ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.06)',
                            background: paymentPlan === 'deposit' ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            minHeight: '75px'
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>{depositPercentage}% Deposit</span>
                          <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.15rem' }}>Bal. ({formatCost(grandTotalWithoutInsurance * ((100 - depositPercentage) / 100))}) due {getDepositDeadlineDateStr()}</span>
                          <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, marginTop: '0.2rem' }}>{formatCost((grandTotalWithoutInsurance * (depositPercentage / 100)) + insuranceCost)} Today</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Deposit Authorization Disclaimer */}
                  {paymentPlan === 'deposit' && (
                    <div style={{
                      padding: '0.65rem 0.8rem',
                      borderRadius: '6px',
                      background: 'rgba(185, 120, 59, 0.04)',
                      border: '1px dashed rgba(185, 120, 59, 0.25)',
                      fontSize: '0.72rem',
                      lineHeight: '1.45',
                      color: '#D8C7AF',
                      animation: 'fadeInUp 0.3s ease-out'
                    }}>
                      ℹ️ <strong>Deposit Authorization:</strong> By selecting this option, you authorize us to charge your card today for the amount of {formatCost(amountDueToday)} (which includes the {depositPercentage}% charter deposit plus 100% of any selected cancellation insurance). You also consent to us charging the remaining charter balance of {formatCost(amountDueLater)} to the same card on {getDepositDeadlineDateStr()}.
                    </div>
                  )}

                  {/* Bareboat Regulatory Disclaimer */}
                  <div style={{ 
                    background: 'rgba(185, 120, 59, 0.03)', 
                    border: '1px solid rgba(185, 120, 59, 0.1)', 
                    padding: '0.65rem 0.8rem', 
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    lineHeight: '1.35',
                    color: '#D8C7AF'
                  }}>
                    <strong>Bareboat Regulation Notice:</strong> Under federal law, this vessel is chartered bareboat. The captain is an independent contractor. Estimated captain fees are included below for convenience, but selection remains at your discretion.
                  </div>

                  {/* Promo / Discount Code Input */}
                  <div style={{ 
                    borderTop: '1px solid rgba(255,255,255,0.06)', 
                    paddingTop: '0.75rem',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem' 
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Have a Promo Code?
                    </span>
                    
                    {!appliedPromo ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="ENTER CODE"
                          value={promoCodeInput}
                          onChange={e => setPromoCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.6rem',
                            background: '#121416',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.75rem',
                            outline: 'none',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyPromoCode()}
                          disabled={isApplyingPromo}
                          style={{
                            background: '#B9783B',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.45rem 1rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                        >
                          {isApplyingPromo ? 'Applying...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        background: 'rgba(112, 140, 132, 0.08)',
                        border: '1px solid rgba(112, 140, 132, 0.2)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#D8C7AF' }}>
                          <Tag size={12} color="#708C84" />
                          <span>Code <strong>{appliedPromo.code}</strong> Applied</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleRemovePromoCode}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.1rem 0.3rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {promoError && (
                      <span style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '0.1rem' }}>
                        ⚠️ {promoError}
                      </span>
                    )}
                    {promoSuccess && appliedPromo && (
                      <span style={{ fontSize: '0.7rem', color: '#708C84', marginTop: '0.1rem' }}>
                        ✓ {appliedPromo.discountType === 'percent' ? `${appliedPromo.value}%` : `$${appliedPromo.value}`} discount applied!
                      </span>
                    )}
                  </div>

                  {/* Invoice Summary */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Invoice Summary
                    </span>

                    {vesselsList.length > 0 && selectedVessel && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Vessel Rental ({selectedVessel.title}):</span>
                        <span style={{ color: 'white' }}>{formatCost(vesselCost)}</span>
                      </div>
                    )}

                    {baseExperienceCost > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Experience Base Cost:</span>
                        <span style={{ color: 'white' }}>{formatCost(baseExperienceCost)}</span>
                      </div>
                    )}

                    {gearTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Gear & Toys Rental:</span>
                        <span style={{ color: 'white' }}>+{formatCost(gearTotal)}</span>
                      </div>
                    )}

                    {addonsTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Selected Add-ons:</span>
                        <span style={{ color: 'white' }}>+{formatCost(addonsTotal)}</span>
                      </div>
                    )}

                    {discountAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#708C84' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Tag size={12} />
                          Discount ({appliedPromo?.code}):
                        </span>
                        <span>-{formatCost(discountAmount)}</span>
                      </div>
                    )}

                    {cancellationInsurance && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Cancellation Insurance:</span>
                        <span style={{ color: 'white' }}>+{formatCost(insuranceCost)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Sales Tax (7.5%):</span>
                      <span style={{ color: 'white' }}>{formatCost(salesTax)}</span>
                    </div>

                    {selectedCaptain && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '0.35rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Captain Service ({selectedCaptain.title.replace('Captain', 'Capt.')}):</span>
                        <span style={{ color: '#B9783B', fontWeight: 500 }}>+{formatCost(captainFee)}</span>
                      </div>
                    )}

                    {isConvenienceFeeEnabled && paymentMethod === 'card' && convenienceFeeTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '0.35rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.7 }}>Card Convenience Fee ({convenienceFeeRate}%):</span>
                        <span style={{ color: 'white' }}>+{formatCost(convenienceFeeTotal)}</span>
                      </div>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'baseline', 
                      borderTop: '1px solid rgba(255,255,255,0.1)', 
                      paddingTop: '0.65rem', 
                      marginTop: '0.15rem' 
                    }}>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>Grand Total Estimate:</span>
                      <span style={{ color: '#B9783B', fontWeight: 800, fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif" }}>
                        {formatCost(grandTotal + convenienceFeeTotal)}
                      </span>
                    </div>

                    {paymentPlan === 'deposit' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span style={{ color: '#B9783B' }}>Amount Due Today:</span>
                          <span style={{ color: '#B9783B' }}>{formatCost(amountDueToday)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7 }}>
                          <span style={{ color: '#D8C7AF' }}>Amount Scheduled (due {getDepositDeadlineDateStr()}):</span>
                          <span style={{ color: 'white' }}>{formatCost(amountDueLater)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.35rem',
                    padding: showTermsError ? '0.55rem' : '0',
                    border: showTermsError ? '1px solid #ef4444' : '1px solid transparent',
                    borderRadius: '6px',
                    background: showTermsError ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                    transition: 'all 0.25s ease'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginTop: '0.1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={acceptTerms}
                        onChange={e => setAcceptTerms(e.target.checked)}
                        style={{ accentColor: '#B9783B', marginTop: '0.15rem' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: showTermsError ? '#ef4444' : '#D8C7AF', opacity: 0.8, lineHeight: '1.3', fontWeight: showTermsError ? 600 : 'normal' }}>
                        I agree to the Bareboat Charter terms, digital liability waiver, and cancellation policies.
                      </span>
                    </label>
                    <div style={{ paddingLeft: '1.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button 
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        style={{ 
                          fontSize: '0.68rem', 
                          color: '#B9783B', 
                          textDecoration: 'underline', 
                          fontWeight: 600,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        Read Full Terms & Conditions
                      </button>
                      {showTermsError && (
                        <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>
                          * Acceptance required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Select Payment Method</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div
                        onClick={() => setPaymentMethod('card')}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'card' ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.06)',
                          background: paymentMethod === 'card' ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          minHeight: '65px'
                        }}
                      >
                        <CreditCard size={16} color={paymentMethod === 'card' ? '#B9783B' : '#D8C7AF'} />
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>Credit / Debit Card</span>
                        {isConvenienceFeeEnabled && (
                          <span style={{ fontSize: '0.62rem', color: '#B9783B', fontWeight: 600 }}>+{convenienceFeeRate}% Fee</span>
                        )}
                      </div>
                      <div
                        onClick={() => setPaymentMethod('eft')}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: paymentMethod === 'eft' ? '1px solid #B9783B' : '1px solid rgba(255, 255, 255, 0.06)',
                          background: paymentMethod === 'eft' ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          minHeight: '65px'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', color: paymentMethod === 'eft' ? '#708C84' : '#D8C7AF', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>🏦</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>ACH Bank Transfer</span>
                        <span style={{ fontSize: '0.62rem', color: '#708C84', fontWeight: 600 }}>Fee-Free (0%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info Form - Conditional */}
                  {paymentMethod === 'card' ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.4rem', 
                      borderTop: '1px dashed rgba(255,255,255,0.06)', 
                      paddingTop: '0.75rem',
                      background: 'rgba(185, 120, 59, 0.05)',
                      border: '1px solid rgba(185, 120, 59, 0.15)',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      color: '#D8C7AF',
                      fontSize: '0.72rem',
                      lineHeight: '1.45',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#B9783B' }}>
                        <CreditCard size={14} /> Secure Payment via Stripe
                      </div>
                      <div>
                        Clicking below will securely redirect you to Stripe to enter your payment details. Once complete, you will return here to sign the mandatory passenger waiver.
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.5rem', 
                      borderTop: '1px dashed rgba(255,255,255,0.06)', 
                      paddingTop: '0.75rem',
                      background: 'rgba(112, 140, 132, 0.05)',
                      border: '1px solid rgba(112, 140, 132, 0.15)',
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      color: '#D8C7AF',
                      fontSize: '0.72rem',
                      lineHeight: '1.45',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: '#708C84' }}>
                        <span>🏦</span> Direct ACH/EFT Instructions
                      </div>
                      <div>
                        To complete booking without convenience fees, please submit your request. 
                        We support instant verification using <strong>Stripe Financial Connections</strong> or manually via Routing & Account numbers.
                      </div>
                      <div style={{ fontStyle: 'italic', marginTop: '0.25rem', opacity: 0.8 }}>
                        Booking will be placed in a <strong>pending_funds_verification</strong> hold state and immediately locked for 72 hours until funds transfer initiates.
                      </div>
                    </div>
                  )}

                  {/* Navigation Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={handleBackToStep2}
                      disabled={isProcessingPayment}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.05)',
                        color: 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!acceptTerms) {
                          setShowTermsError(true);
                          return;
                        }
                        handleProcessPayment();
                      }}
                      disabled={isProcessingPayment}
                      style={{
                        flex: 2,
                        background: isProcessingPayment ? 'rgba(255,255,255,0.05)' : '#B9783B',
                        color: isProcessingPayment ? '#666' : 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        border: 'none',
                        boxShadow: isProcessingPayment ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.3)',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {isProcessingPayment ? (
                        <>Processing...</>
                      ) : paymentMethod === 'card' ? (
                        <>Proceed to Secure Payment ({formatCost(amountDueToday)}) <ArrowRight size={14} /></>
                      ) : (
                        <>Confirm ACH Booking ({formatCost(amountDueToday)}) <ArrowRight size={14} /></>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: MANDATORY DIGITAL WAIVER SIGNING */}
              {bookingStep === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'left', animation: 'fadeInUp 0.4s ease-out' }}>
                  <div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'white', fontFamily: "'Cormorant Garamond', serif", margin: '0 0 0.3rem 0' }}>Step 4: Sign Passenger Waiver</h4>
                    <p style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.45', margin: 0 }}>
                      Federal regulations require all charter passengers to sign the bareboat release waiver prior to boarding.
                    </p>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSigningWaiver(true);

                      let ipInfo = {
                        ip: 'Unknown',
                        city: 'Unknown',
                        region: 'Unknown',
                        country: 'Unknown',
                        loc: 'Unknown'
                      };

                      try {
                        const res = await fetch('https://ipapi.co/json/').catch(() => null);
                        if (res && res.ok) {
                          const data = await res.json();
                          ipInfo = {
                            ip: data.ip || 'Unknown',
                            city: data.city || 'Unknown',
                            region: data.region || 'Unknown',
                            country: data.country_name || 'Unknown',
                            loc: `${data.latitude || ''},${data.longitude || ''}`
                          };
                        }
                      } catch (err) {
                        console.warn('Waiver IP check failed:', err);
                      }

                      const ua = navigator.userAgent;
                      let os = 'Unknown OS';
                      let browser = 'Unknown Browser';
                      let device = 'Desktop';

                      if (/windows/i.test(ua)) os = 'Windows';
                      else if (/macintosh/i.test(ua)) os = 'macOS';
                      else if (/linux/i.test(ua)) os = 'Linux';
                      else if (/android/i.test(ua)) os = 'Android';
                      else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

                      if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
                      else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
                      else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
                      else if (/edge|edg/i.test(ua)) browser = 'Edge';

                      if (/mobile|android|iphone|ipod/i.test(ua)) device = 'Mobile';
                      else if (/ipad|tablet/i.test(ua)) device = 'Tablet';

                      const signatureData = {
                        bookingId: generatedBookingId,
                        guestEmail: guestEmail,
                        name: waiverFullName,
                        address: `${waiverAddress}, ${waiverCity}, ${waiverStateZip}`,
                        ip: ipInfo.ip,
                        city: ipInfo.city,
                        region: ipInfo.region,
                        country: ipInfo.country,
                        loc: ipInfo.loc,
                        userAgent: ua,
                        browser,
                        os,
                        device,
                        screenResolution: `${window.screen.width}x${window.screen.height}`,
                        language: navigator.language || 'en',
                        passengers: passengersList.map(p => ({
                          name: p.name,
                          relationship: p.relationship,
                          addedToMainWaiver: p.relationship === 'Spouse' || p.relationship === 'Child'
                        }))
                      };

                      try {
                        await saveWaiverSignature(generatedBookingId, signatureData);
                        setWaiverSigned(true);
                        setBookingStep(5);
                      } catch (err) {
                        console.error('Waiver signing error:', err);
                        alert('An error occurred while submitting your waiver signature. Please try again.');
                      } finally {
                        setIsSigningWaiver(false);
                      }
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}
                  >
                    {/* Passenger Registry Section */}
                    {guestCount > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '0.85rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>Guest & Passenger Registry</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>Passenger 1 (Primary Booker):</span>
                            <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>{guestName} (Self)</span>
                          </div>
                          {passengersList.map((passenger, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                              <input 
                                type="text"
                                placeholder={`Passenger ${index + 2} Full Name`}
                                value={passenger.name}
                                onChange={e => {
                                  const newList = [...passengersList];
                                  newList[index].name = e.target.value;
                                  setPassengersList(newList);
                                }}
                                required
                                style={{ padding: '0.4rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                              />
                              <select
                                value={passenger.relationship}
                                onChange={e => {
                                  const newList = [...passengersList];
                                  newList[index].relationship = e.target.value;
                                  setPassengersList(newList);
                                }}
                                style={{ padding: '0.4rem 0.55rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.74rem', outline: 'none' }}
                              >
                                <option value="Spouse">Spouse</option>
                                <option value="Child">Child</option>
                                <option value="Friend">Friend</option>
                                <option value="Family">Family</option>
                                <option value="Colleague">Colleague</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          ))}
                        </div>

                        {/* If non-relatives are present, display copyable waiver share link card */}
                        {passengersList.some(p => !['Spouse', 'Child', 'Family'].includes(p.relationship)) && (
                          <div style={{ background: 'rgba(185, 120, 59, 0.05)', border: '1px solid rgba(185, 120, 59, 0.15)', borderRadius: '6px', padding: '0.65rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#B9783B', fontWeight: 600 }}>Note: Non-relative guests must sign individual waivers</span>
                            <span style={{ fontSize: '0.66rem', color: '#D8C7AF', opacity: 0.9 }}>
                              Please copy and share their unique waiver link, or email it to them:
                            </span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `${window.location.origin}/waiver/sign?bookingId=${generatedBookingId}`;
                                  navigator.clipboard.writeText(text);
                                  setIsCopied(true);
                                  setTimeout(() => setIsCopied(false), 2000);
                                }}
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', fontSize: '0.68rem', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                              >
                                {isCopied ? 'Link Copied!' : 'Copy Guest Waiver Link'}
                              </button>
                              <a
                                href={`mailto:?subject=Digital Waiver Signature Required for M/Y Whiskey Voyage&body=Please sign your bareboat charter liability waiver here: ${window.location.origin}/waiver/sign?bookingId=${generatedBookingId}`}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', fontSize: '0.68rem', padding: '0.4rem', borderRadius: '4px', textDecoration: 'none', cursor: 'pointer', textAlign: 'center' }}
                              >
                                Send via Email
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Scrollable Legal Waiver Text */}
                    <div style={{ 
                      height: '240px', 
                      overflowY: 'auto', 
                      background: '#121416', 
                      border: '1px solid rgba(255,255,255,0.05)', 
                      borderRadius: '6px', 
                      padding: '0.75rem', 
                      fontSize: '0.68rem', 
                      lineHeight: '1.45', 
                      color: '#D8C7AF',
                      opacity: 0.85
                    }}>
                      <h4 style={{ color: 'white', marginTop: 0, fontSize: '0.72rem', fontWeight: 700 }}>BAREBOAT LIABILITY WAIVER AND RELEASE OF LIABILITY</h4>
                      <p>In consideration of being allowed to board the vessel M/Y Whiskey for a private bareboat charter, I, the undersigned Passenger, hereby acknowledge and agree to the following terms:</p>
                      <p>1. I understand that boating activities involve inherent risks, including but not limited to changing weather, waves, collision, slipping, falling, drowning, and other hazards that may result in serious injury or death.</p>
                      <p>2. I certify that I am in good physical condition and am boarding the vessel at my own risk. I release the vessel owners, crew, independent operator captain, and agents from any and all liability for personal injury, property loss, or accidental death arising during this excursion.</p>
                      <p>3. I acknowledge that I am passenger under a Bareboat Charter agreement where the charterer selects their own crew. I agree to follow all safety briefs, wear life vests when instructed by the operator, and act in a responsible manner while on board.</p>
                      <p>4. By signing below, I agree that this electronic document constitutes a legally binding contract, fully recognized under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN).</p>
                      {passengersList.filter(p => p.relationship === 'Spouse' || p.relationship === 'Child').length > 0 && (
                        <p style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.45rem', marginTop: '0.45rem', color: '#B9783B' }}>
                          <strong>Spouses / Children Covered Under This Signature:</strong><br />
                          {passengersList.filter(p => p.relationship === 'Spouse' || p.relationship === 'Child').map(p => `${p.name} (${p.relationship})`).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Address Inputs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Street Address</label>
                        <input 
                          ref={waiverAddressCallbackRef}
                          type="text" 
                          value={waiverAddress} 
                          onChange={e => setWaiverAddress(e.target.value)} 
                          placeholder="e.g. 123 Luxury Yacht Way" 
                          style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                          required 
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>City</label>
                          <input 
                            type="text" 
                            value={waiverCity} 
                            onChange={e => setWaiverCity(e.target.value)} 
                            placeholder="e.g. Destin" 
                            style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                            required 
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>State / Zip Code</label>
                          <input 
                            type="text" 
                            value={waiverStateZip} 
                            onChange={e => setWaiverStateZip(e.target.value)} 
                            placeholder="e.g. FL 32541" 
                            style={{ padding: '0.45rem 0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.78rem', outline: 'none' }}
                            required 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Electronic Consent Checkbox */}
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginTop: '0.1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={waiverConsent}
                        onChange={e => waiverConsent ? setWaiverConsent(false) : setWaiverConsent(true)}
                        style={{ accentColor: '#B9783B', marginTop: '0.15rem' }}
                        required
                      />
                      <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.85, lineHeight: '1.35' }}>
                        I consent to signing electronically. My signature is legally binding, and native device metadata (IP, approximate location, browser, screen resolution) will be securely recorded for liability verification.
                      </span>
                    </label>

                    {/* Signature Typing Box */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                      <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Type Full Name to Sign electronically</label>
                      <input 
                        type="text" 
                        value={waiverSignText} 
                        onChange={e => setWaiverSignText(e.target.value)} 
                        placeholder="Type full name exactly to sign" 
                        style={{ 
                          padding: '0.5rem 0.75rem', 
                          background: '#121416', 
                          border: '1px solid rgba(185, 120, 59, 0.3)', 
                          borderRadius: '6px', 
                          color: '#B9783B', 
                          fontSize: '1.15rem', 
                          fontFamily: "'Cormorant Garamond', Georgia, serif", 
                          fontStyle: 'italic', 
                          letterSpacing: '0.04em',
                          outline: 'none' 
                        }}
                        required 
                      />
                      {waiverSignText && !checkSignatureMatch(waiverSignText, waiverFullName) && (
                        <span style={{ 
                          fontSize: '0.74rem', 
                          color: '#FCA5A5', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          border: '1px solid rgba(239, 68, 68, 0.25)', 
                          borderRadius: '6px', 
                          padding: '0.4rem 0.65rem', 
                          display: 'block', 
                          marginTop: '0.35rem' 
                        }}>
                          * Signature spelling must match printed name: "{waiverFullName}"
                        </span>
                      )}
                      {waiverSignText && checkSignatureMatch(waiverSignText, waiverFullName) && (
                        <span style={{ 
                          fontSize: '0.74rem', 
                          color: '#A7F3D0', 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          border: '1px solid rgba(16, 185, 129, 0.25)', 
                          borderRadius: '6px', 
                          padding: '0.4rem 0.65rem', 
                          display: 'block', 
                          marginTop: '0.35rem' 
                        }}>
                          ✓ Signature matches printed name.
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        type="submit" 
                        disabled={
                          isSigningWaiver || 
                          !waiverConsent || 
                          !waiverSignText.trim() || 
                          !checkSignatureMatch(waiverSignText, waiverFullName)
                        } 
                        style={{
                          flex: 1,
                          background: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'rgba(255,255,255,0.05)' : '#B9783B',
                          color: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? '#666' : 'white',
                          border: 'none',
                          padding: '0.75rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          boxShadow: (isSigningWaiver || !waiverConsent || !waiverSignText.trim() || !checkSignatureMatch(waiverSignText, waiverFullName)) ? 'none' : '0 4px 14px rgba(185, 120, 59, 0.3)'
                        }}
                      >
                        {isSigningWaiver ? 'Submitting Signature...' : 'Submit Signed Waiver'}
                      </button>
                    </div>

                  </form>
                </div>
              )}

              {/* STEP 5: CONFIRMATION, ICS CALENDAR, SHARING & SUCCESS TIMELINE */}
              {bookingStep === 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', textAlign: 'center', animation: 'fadeInUp 0.4s ease-out' }}>
                  
                  {/* Confirmed Icon */}
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0.25rem 0' }}>
                    <div style={{ background: 'rgba(112, 140, 132, 0.15)', color: '#708C84', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(112, 140, 132, 0.25)' }}>
                      <CheckCircle size={36} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <h4 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', fontFamily: "'Cormorant Garamond', serif", margin: '0' }}>
                      {paymentMethod === 'eft' ? 'ACH Charter Request Registered!' : 'Booking Completed!'}
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.45', margin: 0 }}>
                      {paymentMethod === 'eft' ? (
                        <>
                          Thank you, <strong>{guestName}</strong>! Your ACH bank transfer charter request has been received. 
                          Your slot is held under <strong>pending_funds_verification</strong> status. Complete routing details have been sent to <strong>{guestEmail}</strong>.
                        </>
                      ) : (
                        <>
                          Thank you, <strong>{guestName}</strong>! Your payment was processed successfully and your bareboat charter liability waiver is signed. 
                          A receipt and digital waivers have been sent to <strong>{guestEmail}</strong>.
                        </>
                      )}
                    </p>

                    {/* Booking Status Badge */}
                    <div style={{
                      background: 'rgba(112, 140, 132, 0.08)',
                      border: '1px solid rgba(112, 140, 132, 0.2)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0.25rem 0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Reference:</span>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>{generatedBookingId}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#708C84', display: 'inline-block' }}></span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#708C84', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {paymentMethod === 'eft' ? 'Pending Verification' : 'Status: Confirmed'}
                        </span>
                      </div>
                    </div>

                    <a
                      href={`/guest/portal?id=${generatedBookingId}&token=${generatedBookingToken}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        background: '#B9783B',
                        color: 'white',
                        padding: '0.75rem 1.2rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(185, 120, 59, 0.3)',
                        transition: 'all 0.2s',
                        marginTop: '0.25rem'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d08c4f';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#B9783B';
                      }}
                    >
                      <span>Manage in Guest Portal</span>
                      <ArrowRight size={14} />
                    </a>
                  </div>

                  {/* Summary Box */}
                  <div style={{ background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '0.85rem', textAlign: 'left', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.45rem', marginBottom: '0.15rem' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Experience:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>{item.title}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Vessel Selected:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>{selectedVessel ? selectedVessel.title : 'None'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Date & Time:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} @ {selectedStartTime}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Captain Operator:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>{selectedCaptain ? selectedCaptain.title : 'Independent Operator'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.04)', paddingTop: '0.45rem', marginTop: '0.15rem' }}>
                      <span style={{ opacity: 0.6, color: '#D8C7AF' }}>Payment Method:</span>
                      <span style={{ color: 'white', fontWeight: 600 }}>{paymentMethod === 'eft' ? 'ACH Bank Transfer (Fee-free)' : 'Credit Card'}</span>
                    </div>
                    {paymentMethod === 'eft' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(112, 140, 132, 0.05)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(112, 140, 132, 0.15)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#708C84', fontWeight: 600 }}>
                          <span>Amount Paid Today:</span>
                          <span>{formatCost(0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D8C7AF', fontWeight: 600 }}>
                          <span>Total ACH Balance:</span>
                          <span style={{ color: 'white' }}>{formatCost(grandTotal)}</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.8, borderTop: '1px solid rgba(112,140,132,0.1)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                          ℹ️ Please route funds to <strong>Chase Bank, Routing #987654321, Account #123456789</strong>. Lock expires in 72 hours.
                        </div>
                      </div>
                    ) : (
                      paymentPlan === 'deposit' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B9783B', fontWeight: 600 }}>
                            <span>Deposit Paid Today:</span>
                            <span>{formatCost(amountDueToday)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8, color: '#D8C7AF', fontSize: '0.72rem', marginTop: '0.15rem' }}>
                            <span>Balance Due ({getDepositDeadlineDateStr()}):</span>
                            <span style={{ color: 'white' }}>{formatCost(amountDueLater)}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B9783B', fontWeight: 600, borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '0.45rem' }}>
                          <span>Total Paid Today:</span>
                          <span>{formatCost(amountDueToday)}</span>
                        </div>
                      )
                    )}
                  </div>

                  {/* Next Steps Timeline */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.7 }}>Your Charter Timeline:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingLeft: '0.65rem', borderLeft: '2px solid rgba(185, 120, 59, 0.3)', margin: '0.25rem 0 0.25rem 0.3rem' }}>
                      {paymentMethod === 'eft' ? (
                        <>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-15px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#708C84' }} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>1. Initiate ACH Transfer</div>
                            <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginTop: '0.1rem' }}>Initiate transfer of {formatCost(grandTotal)} to Routing #987654321, Account #123456789. Email receipt to info@mywhiskey.com.</div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-15px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#B9783B' }} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>2. Sign Liability Waivers</div>
                            <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginTop: '0.1rem' }}>Once funds clear, we will email you the official demise charter passenger liability waiver for final signatures.</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-15px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#B9783B' }} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>1. Check Your Inbox</div>
                            <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginTop: '0.1rem' }}>We've sent a charter confirmation receipt and itinerary details to {guestEmail}.</div>
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '-15px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#B9783B' }} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>2. Share Guest Waivers</div>
                            <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginTop: '0.1rem' }}>All non-relative guests boarding the vessel must sign their digital liability waivers using the shareable link.</div>
                          </div>
                        </>
                      )}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '-15px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: '#B9783B' }} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>3. Meet at the Dock</div>
                        <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.8, marginTop: '0.1rem' }}>Arrive at our main slip 15 minutes before your scheduled boarding time at {selectedStartTime} on {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.</div>
                      </div>
                    </div>
                  </div>

                  {/* Packing Checklist Accordion */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
                    <button
                      type="button"
                      onClick={() => setShowPackingChecklist(!showPackingChecklist)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Sparkles size={14} color="#B9783B" />
                        What to Pack Checklist
                      </span>
                      {showPackingChecklist ? <ChevronUp size={14} color="#D8C7AF" /> : <ChevronDown size={14} color="#D8C7AF" />}
                    </button>
                    {showPackingChecklist && (
                      <div style={{
                        padding: '0.75rem 0.85rem',
                        background: '#121416',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderTop: 'none',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                        marginTop: '-0.35rem',
                        fontSize: '0.72rem',
                        color: '#D8C7AF',
                        lineHeight: '1.5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        animation: 'fadeIn 0.2s ease-out'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Check size={11} color="#708C84" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                          <span>Towels & Swimsuits (for swimming/beaching stops)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Check size={11} color="#708C84" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                          <span>Sunscreen (non-spray preferred for yacht decks) & Sunglasses</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Check size={11} color="#708C84" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                          <span>Non-marking rubber-soled boat shoes or clean sneakers</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Check size={11} color="#708C84" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                          <span>Light layers or windbreaker (can get breezy on open water)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <Check size={11} color="#708C84" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                          <span>Government-issued ID & verification documents</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destination & Vessel Guides */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                    {stopsInfo.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.7 }}>Explore Your Destination Stops:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {stopsInfo.map(stop => (
                            <a
                              key={stop.slug}
                              href={`/stops/${stop.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.55rem 0.75rem',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                color: 'white',
                                fontSize: '0.74rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#B9783B';
                                e.currentTarget.style.background = 'rgba(185, 120, 59, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <MapPin size={12} color="#B9783B" />
                                {stop.title} stop guide
                              </span>
                              <ArrowRight size={12} color="#B9783B" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedVessel && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.7 }}>Vessel Reference & Rules:</span>
                        <a
                          href={`/fleet/${selectedVessel.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.75rem',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            color: 'white',
                            fontSize: '0.74rem',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#B9783B';
                            e.currentTarget.style.background = 'rgba(185, 120, 59, 0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Ship size={12} color="#B9783B" />
                            {selectedVessel.title} Specifications & Deck Plan
                          </span>
                          <ArrowRight size={12} color="#B9783B" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Add to Calendar buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.7 }}>Add Voyage to Calendar:</span>
                    
                    {/* Booking Voyage */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', marginBottom: paymentPlan === 'deposit' ? '0.2rem' : '0' }}>
                      <button
                        type="button"
                        onClick={handleDownloadBookingIcs}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          background: 'rgba(255,255,255,0.02)',
                          color: '#D8C7AF',
                          padding: '0.5rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <Calendar size={12} color="#B9783B" />
                        Download Voyage ICS
                      </button>
                      <a
                        href={getGoogleCalendarUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          background: 'rgba(255,255,255,0.02)',
                          color: '#D8C7AF',
                          padding: '0.5rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <ExternalLink size={12} />
                        Google Calendar
                      </a>
                    </div>

                    {/* Final Payment Reminder */}
                    {paymentPlan === 'deposit' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleDownloadReminderIcs}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            background: 'rgba(185, 120, 59, 0.05)',
                            color: '#D8C7AF',
                            padding: '0.5rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(185, 120, 59, 0.15)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Clock size={12} color="#B9783B" />
                          Payment Reminder ICS
                        </button>
                        <a
                          href={getGoogleCalendarReminderUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
                            background: 'rgba(185, 120, 59, 0.05)',
                            color: '#D8C7AF',
                            padding: '0.5rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(185, 120, 59, 0.15)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <ExternalLink size={12} />
                          Google Reminder
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Share Experience */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', textAlign: 'left', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D8C7AF', opacity: 0.7 }}>Invite Friends & Crew:</span>
                    <button
                      type="button"
                      onClick={handleShare}
                      style={{
                        width: '100%',
                        background: 'rgba(112, 140, 132, 0.1)',
                        color: '#708C84',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(112, 140, 132, 0.2)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      {isCopied ? 'Link Copied!' : 'Share Voyage Invite'}
                    </button>
                  </div>

                  {/* Reset button to start over */}
                  <button
                    type="button"
                    onClick={() => {
                      setBookingStep(1);
                      setSelectedDate('');
                      setGuestName('');
                      setGuestPhone('');
                      setGuestEmail('');
                      setAcceptTerms(false);
                      setCancellationInsurance(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#D8C7AF',
                      opacity: 0.5,
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      textDecoration: 'underline'
                    }}
                  >
                    Start New Booking Request
                  </button>

                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {activeLightboxUrl && (
        <div 
          onClick={() => {
            setActiveLightboxUrl(null);
            setActiveLightboxType(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(18, 20, 22, 0.95)',
            backdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            animation: 'fadeInUp 0.3s ease-out'
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightboxUrl(null);
              setActiveLightboxType(null);
            }}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.25s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(185, 120, 59, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(185, 120, 59, 0.5)';
              e.currentTarget.style.color = '#B9783B';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'white';
            }}
          >
            <X size={24} />
          </button>

          {/* Media Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {activeLightboxType === 'video' ? (
              <video 
                src={activeLightboxUrl} 
                controls 
                autoPlay 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '75vh', 
                  display: 'block', 
                  backgroundColor: '#000' 
                }} 
              />
            ) : (
              <img 
                src={activeLightboxUrl} 
                alt="Lightbox Gallery View" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '75vh', 
                  objectFit: 'contain', 
                  display: 'block', 
                  backgroundColor: '#1E2124' 
                }} 
              />
            )}
          </div>
          
          {/* Caption */}
          {galleryItems.find((g: any) => g.url === activeLightboxUrl)?.name && (
            <div style={{
              marginTop: '1.5rem',
              color: '#F4F1EA',
              fontSize: '1.1rem',
              fontWeight: 500,
              fontFamily: "'Cormorant Garamond', serif",
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              textAlign: 'center'
            }}>
              {galleryItems.find((g: any) => g.url === activeLightboxUrl)?.name}
            </div>
          )}
        </div>
      )}

      {/* Terms & Conditions Modal Overlay */}
      {showTermsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(185, 120, 59, 0.3)',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>Terms & Conditions</h3>
              <button 
                type="button"
                onClick={() => setShowTermsModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>
            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '0.85rem', color: '#D8C7AF', lineHeight: '1.6' }}>
              <ReactMarkdown>{termsText || `### 1. Bareboat Charter Agreement\nBy booking a charter on M/Y Whiskey, you agree that this agreement constitutes a Bareboat Charter (Demise Charter) in accordance with U.S. Coast Guard regulations. You, the charterer, assume full control, responsibility, and operational command of the vessel during the charter period. You are free to select any qualified captain certified to operate the vessel, or captain the vessel yourself if qualified.\n\n### 2. Payment Terms & Deposit Policy\n* **Pay in Full:** If chosen, 100% of the booking total is charged at checkout.\n* **Deposit Plan:** If selected, a non-refundable deposit is charged at checkout. The remaining balance will be automatically charged to the authorized credit card on file exactly **7 days prior** to departure.\n* If booking within 7 days of departure, full payment is required immediately.\n\n### 3. Credit Card Authorization & Consent\nBy selecting the Deposit payment option and checking the terms agreement box, you expressly authorize M/Y Whiskey to store your credit card information securely and automatically charge the remaining balance to the same card on the due date (7 days prior to departure).\n\n### 4. Cancellation & Refund Policy\n* Cancellations made > 14 days prior to departure are eligible for a full refund (minus credit card processing fees).\n* Cancellations made 7-14 days prior are eligible for a 50% refund.\n* Cancellations made within 7 days of departure are non-refundable.\n\n### 5. Digital Liability Waiver\nAll passengers boarding M/Y Whiskey must sign the digital liability waiver prior to departure. Failure of any guest to sign the waiver may result in boarding denial without refund.`}</ReactMarkdown>
            </div>
            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => {
                  setAcceptTerms(true);
                  setShowTermsModal(false);
                }} 
                style={{
                  background: '#B9783B',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                I Agree & Accept Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Insurance Modal Overlay */}
      {showInsuranceModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(185, 120, 59, 0.3)',
            borderRadius: '12px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>Cancellation Insurance Policy</h3>
              <button 
                type="button"
                onClick={() => setShowInsuranceModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>
            {/* Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, fontSize: '0.85rem', color: '#D8C7AF', lineHeight: '1.6' }}>
              <ReactMarkdown>{insuranceText || `### 1. Overview\nCancellation Insurance protects your booking value under qualified cancellation circumstances. By selecting this option, you pay a premium equal to 5% of your charter subtotal.\n\n### 2. Full Refund Conditions\nYou can cancel your booking up to 24 hours prior to your scheduled departure time for a 100% full refund of the subtotal and taxes. This includes severe weather events, mechanical issues, or unexpected medical/personal emergencies.\n\n### 3. Exclusions & Limitations\n* Cancellations requested within 24 hours of departure are non-refundable even with insurance.\n* The 5% insurance premium is non-refundable once purchased.\n* All cancellation requests must be submitted through the customer portal or in writing to bookings@mywhiskey.com.`}</ReactMarkdown>
            </div>
            {/* Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                onClick={() => setShowInsuranceModal(false)} 
                style={{
                  background: '#B9783B',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Bar */}
      <div className="mobile-bottom-bar">
        <div>
          <div style={{ fontSize: '0.75rem', color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charter Price</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#B9783B', fontFamily: "'Cormorant Garamond', serif" }}>
            {price > 0 ? `From ${formatCost(price)}` : 'Book'}
          </div>
        </div>
        <button 
          onClick={() => {
            document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: '#B9783B',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 4px 15px rgba(185, 120, 59, 0.4)',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Book Experience
        </button>
      </div>
    </div>
  );
}
