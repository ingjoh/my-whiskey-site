'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Save, Sparkles, RefreshCw, Layers, Settings, Eye, CheckCircle2,
  Trash2, Plus, X, UploadCloud, AlertTriangle, ExternalLink, Image as ImageIcon, Search,
  Share2, ArrowRight, Globe, Compass, Calendar, MapPin, Tag, Video,
  FolderOpen, Download, Check, Building, Users, Crown, Play, Pause
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { 
  loadSocialAdsSettings, saveSocialAdsSettings, getContentItems, ContentItem, 
  SocialAdsSettings, DEFAULT_SOCIAL_ADS_SETTINGS,
  loadSocialAdDrafts, saveSocialAdDraft, deleteSocialAdDraft, SocialAdDraft,
  BookingRecord, getCommissionLedger, getAllBookings,
  CalendarEvent, getCalendarEvents
} from '@/lib/db';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';
import AIImageEditor from '@/components/admin/AIImageEditor';
import AIVideoBuilder from '@/components/admin/AIVideoBuilder';
import AdminMediaWrapper from '@/components/admin/AdminMediaWrapper';
import { uploadFile } from '@/lib/storage';

interface AdPersona {
  id: string;
  name: string;
  description: string;
}

const DEFAULT_PERSONAS: AdPersona[] = [
  { id: 'family', name: 'Family Vacationers', description: 'Families looking for safety, bonding, child-friendly dolphin viewings, snorkeling, and comfortable amenities.' },
  { id: 'friends', name: 'Friends & Party Groups', description: 'Friend cohorts seeking sandbar parties (Crab Island), sunset cruises, high-end audio systems, and local socializing.' },
  { id: 'couples', name: 'Couples & Romance', description: 'Couples looking for high-end romantic escapes, private dining, proposals, anniversaries, and intimate sunset tours.' },
  { id: 'anglers', name: 'Anglers & Fishers', description: 'Deep-sea fishing enthusiasts looking for top-tier rigging, local fish guides, high catch rates, and experienced crew.' },
  { id: 'corporate', name: 'Corporate & Executive', description: 'Team building retreats, premium client hosting, luxury executive lunches, and bespoke high-end catering.' }
];

interface AdBundle {
  conceptName: string;
  rationale: string;
  hook?: string;
  bodyCopy?: string;
  headline?: string;
  suggestedTags?: string[];
  // Google specific
  headlines?: string[];
  descriptions?: string[];
  keywords?: string[];
  negativeKeywords?: string[];
  longHeadlines?: string[];
  // User bindings
  boundMedia?: string;
  boundMedias?: string[];
  boundMediasByRatio?: Record<number, { feed_4_5?: string; story_9_16?: string; square_1_1?: string }>;
  // Dynamic tag
  personaName?: string;
  bookingWindowName?: string;
}

interface BookingWindowOption {
  id: string;
  name: string;
  description: string;
}

const BOOKING_WINDOW_OPTIONS: BookingWindowOption[] = [
  { id: 'impulse', name: 'Impulse / In-Region (1-3 days)', description: 'Last-minute/local travelers looking for immediate slots.' },
  { id: 'mid-term', name: 'Mid-term Planner (1-6 weeks)', description: 'Typical vacationers scheduling a few weeks ahead.' },
  { id: 'long-term', name: 'Long-term (6+ weeks)', description: 'Organizers and planners booking destination charter events.' }
];

export interface RecommendedGoal {
  title: string;
  desc: string;
  priority: 'high' | 'medium';
  platform: 'meta' | 'google-search' | 'google-pmax';
  personas: string[];
  urgency: string;
  bookingWindows: string[];
}

export function calculateRecommendedGoal(bookings: BookingRecord[], events: CalendarEvent[]): RecommendedGoal {
  const activeBookings = bookings.filter(b => b.status && b.status !== 'cancelled');
  
  // Get date range for the next 30 days
  const today = new Date();
  const next30DaysDates: string[] = [];
  const next10DaysDates: string[] = [];
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    next30DaysDates.push(dateStr);
    if (i < 10) {
      next10DaysDates.push(dateStr);
    }
  }

  // Find active events in the next 30 days
  const activeEvents = events.filter(e => {
    return e.startDate <= next30DaysDates[29] && e.endDate >= next30DaysDates[0];
  });

  // Check if we have any unbooked slots during high-impact events
  let bestHighImpactEvent: CalendarEvent | null = null;
  let bestHighImpactDate: string = '';
  
  for (const dateStr of next30DaysDates) {
    const isBooked = activeBookings.some(b => b.date === dateStr);
    if (!isBooked) {
      const ev = activeEvents.find(e => e.startDate <= dateStr && e.endDate >= dateStr);
      if (ev && ev.impactScore >= 1.2) {
        if (!bestHighImpactEvent || ev.impactScore > bestHighImpactEvent.impactScore) {
          bestHighImpactEvent = ev;
          bestHighImpactDate = dateStr;
        }
      }
    }
  }

  if (bestHighImpactEvent) {
    const dateFormatted = new Date(bestHighImpactDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    const recommendedPersonas = bestHighImpactEvent.type === 'regional' ? ['friends', 'couples'] : ['family', 'friends'];
    return {
      title: `Event Booking Opportunity: ${bestHighImpactEvent.title}`,
      desc: `M/Y Whiskey is currently unbooked on ${dateFormatted} during the ${bestHighImpactEvent.title} (${bestHighImpactEvent.impactScore}x business impact weight). We recommend launching a targeted campaign to capture this premium event demand.`,
      priority: 'high',
      platform: 'meta',
      personas: recommendedPersonas,
      urgency: `Special Event - ${bestHighImpactEvent.title} Peak`,
      bookingWindows: ['impulse']
    };
  }

  // Count unbooked weekend days (Fri, Sat, Sun) vs. weekdays (Mon, Tue, Wed, Thu)
  const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr + 'T00:00:00').getDay();
    return day === 0 || day === 5 || day === 6; // Sun = 0, Fri = 5, Sat = 6
  };

  const getUnbookedSlots = (dateRange: string[]) => {
    const weekends: string[] = [];
    const weekdays: string[] = [];
    
    dateRange.forEach(dateStr => {
      const isBooked = activeBookings.some(b => b.date === dateStr);
      if (!isBooked) {
        if (isWeekend(dateStr)) {
          weekends.push(dateStr);
        } else {
          weekdays.push(dateStr);
        }
      }
    });
    
    return { weekends, weekdays };
  };

  const next10DaysSlots = getUnbookedSlots(next10DaysDates);
  const next30DaysSlots = getUnbookedSlots(next30DaysDates);

  // 1. Check for immediate weekend vacancy (within the next 10 days)
  if (next10DaysSlots.weekends.length > 0) {
    const nextWeekendDay = next10DaysSlots.weekends[0];
    const dateFormatted = new Date(nextWeekendDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    return {
      title: `Last-Minute Weekend Vacancy: Fill ${dateFormatted}`,
      desc: `Our booking calendar shows a vacant weekend day on ${dateFormatted} within the next 10 days. We recommend launching an impulse Meta campaign (Feeds & Stories) targeting Family Vacationers and Friends groups already in the region to fill this slot immediately.`,
      priority: 'high',
      platform: 'meta',
      personas: ['family', 'friends'],
      urgency: 'Low Booking Rate - Immediate Filler',
      bookingWindows: ['impulse']
    };
  }

  // Check if we have any low-demand periods coming up (next 30 days) to recommend a promo
  let bestLowImpactEvent: CalendarEvent | null = null;
  let bestLowImpactDate: string = '';
  for (const dateStr of next30DaysDates) {
    const isBooked = activeBookings.some(b => b.date === dateStr);
    if (!isBooked) {
      const ev = activeEvents.find(e => e.startDate <= dateStr && e.endDate >= dateStr);
      if (ev && ev.impactScore <= 0.8) {
        if (!bestLowImpactEvent || ev.impactScore < bestLowImpactEvent.impactScore) {
          bestLowImpactEvent = ev;
          bestLowImpactDate = dateStr;
        }
      }
    }
  }

  if (bestLowImpactEvent) {
    const dateFormatted = new Date(bestLowImpactDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    return {
      title: `Value/Promo Strategy: Fill ${bestLowImpactEvent.title} Slump`,
      desc: `We expect lower interest during ${bestLowImpactEvent.title} (${bestLowImpactEvent.impactScore}x weight, e.g. ${dateFormatted}). We suggest running a Google Search campaign promoting a mid-week special, value pricing, or complimentary catering to stimulate reservations.`,
      priority: 'medium',
      platform: 'google-search',
      personas: ['corporate', 'anglers'],
      urgency: `Low-Demand Promo - ${bestLowImpactEvent.title}`,
      bookingWindows: ['mid-term']
    };
  }

  // 2. Check for mid-term weekend vacancies (next 30 days)
  if (next30DaysSlots.weekends.length > 3) {
    return {
      title: 'Boost Upcoming Weekend Bookings',
      desc: `We have multiple vacant weekend slots (${next30DaysSlots.weekends.length} days open) over the next 4 weeks. We suggest launching a Google Performance Max campaign targeting Friends & Party Groups or Couples to secure weekend reservations ahead of time.`,
      priority: 'medium',
      platform: 'google-pmax',
      personas: ['friends', 'couples'],
      urgency: 'High Booking Scarcity',
      bookingWindows: ['mid-term']
    };
  }

  // 3. Check for mid-week slow periods (next 30 days)
  if (next30DaysSlots.weekdays.length > 5) {
    return {
      title: 'Fill Mid-Week Vacancies',
      desc: `Weekend slots are healthy, but mid-week occupancy is low (${next30DaysSlots.weekdays.length} weekdays open). We recommend launching a Google Search campaign targeting Corporate Executives and Deep-Sea Anglers with mid-term planning incentives (e.g. complimentary catering).`,
      priority: 'medium',
      platform: 'google-search',
      personas: ['corporate', 'anglers'],
      urgency: 'Slow Mid-week Period',
      bookingWindows: ['mid-term']
    };
  }

  // 4. Healthy / Fully Booked scenario
  return {
    title: 'Brand Growth & Long-Term Bookings',
    desc: 'Your charter schedule is looking incredibly healthy with high booking densities! We recommend maintaining long-term brand awareness and securing premium future holiday dates by running a Meta campaign targeting high-end Romantic Couples and Corporate Retreats.',
    priority: 'medium',
    platform: 'meta',
    personas: ['couples', 'corporate'],
    urgency: 'Slow Mid-week Period',
    bookingWindows: ['long-term']
  };
}


function getCleanFileName(url: string): string {
  if (!url) return '';
  try {
    const decoded = decodeURIComponent(url);
    const noParams = decoded.split('?')[0];
    const lastSegment = noParams.split('/').pop() || '';
    return lastSegment.split('%2F').pop() || lastSegment;
  } catch (e) {
    return url.split('/').pop() || url;
  }
}

// Generate combined display name for ad set tabs: Persona Name (Booking Window Short Name)
function getBundleAdSetName(b: AdBundle): string {
  if (b.personaName && b.bookingWindowName) {
    const bwShort = b.bookingWindowName.split('(')[0].trim().replace('/ In-Region', '');
    return `${b.personaName} (${bwShort})`;
  }
  return b.personaName || b.bookingWindowName || 'Default';
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status === 503 || response.status >= 500) {
        if (i < retries - 1) {
          console.warn(`Transient status ${response.status} from ${url}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }
      return response;
    } catch (err) {
      if (i < retries - 1) {
        console.warn(`Network error from ${url}. Retrying in ${delay}ms...`, err);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

// Interactive gallery carousel overlay component for mockups
const MockupMediaCarousel = ({ 
  boundMedias = [], 
  activeMediaIndex, 
  setActiveMediaIndex,
  height = '180px',
  contextText,
  campaignName,
  onSave,
  boundMediasByRatio,
  ratioMode
}: { 
  boundMedias?: string[]; 
  activeMediaIndex: number; 
  setActiveMediaIndex: React.Dispatch<React.SetStateAction<number>>;
  height?: string;
  contextText?: string;
  campaignName?: string;
  onSave?: (url: string) => void;
  boundMediasByRatio?: any;
  ratioMode?: 'feed_4_5' | 'story_9_16' | 'square_1_1';
}) => {
  const DEFAULT_YACHT = 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c';
  
  const medias = boundMedias.length > 0 ? boundMedias : [DEFAULT_YACHT];
  const total = medias.length;
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveMediaIndex((prev) => (prev - 1 + total) % total);
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveMediaIndex((prev) => (prev + 1) % total);
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    const cleanUrl = url.toLowerCase().split('?')[0];
    return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || url.includes('/video/') || url.startsWith('data:video');
  };

  const activeUrl = ratioMode && boundMediasByRatio?.[activeMediaIndex]?.[ratioMode]
    ? boundMediasByRatio[activeMediaIndex][ratioMode]
    : (medias[activeMediaIndex] || DEFAULT_YACHT);
  const isVideo = isVideoUrl(activeUrl);

  const mediaElement = isVideo ? (
    <video 
      src={activeUrl} 
      autoPlay 
      loop 
      muted 
      playsInline 
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
    />
  ) : (
    <img 
      src={activeUrl} 
      alt={`Mockup variant ${activeMediaIndex + 1}`} 
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} 
    />
  );

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden' }}>
      {/* Reusable Admin Media Wrapper */}
      <AdminMediaWrapper
        type={isVideo ? 'video' : 'image'}
        src={activeUrl}
        contextText={contextText}
        onSave={(url) => {
          if (onSave) onSave(url);
        }}
        initialCampaignName={campaignName}
        style={{ width: '100%', height: '100%' }}
      >
        {mediaElement}
      </AdminMediaWrapper>
      
      {/* Variant badge overlay (glassmorphism style) */}
      {total > 1 && (
        <div style={{ 
          position: 'absolute', 
          top: '0.5rem', 
          right: '0.5rem', 
          background: 'rgba(18, 20, 22, 0.75)', 
          backdropFilter: 'blur(4px)', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          color: '#D8C7AF', 
          fontSize: '0.62rem', 
          padding: '0.2rem 0.5rem', 
          borderRadius: '20px', 
          fontWeight: 600,
          zIndex: 5,
          letterSpacing: '0.02em',
          pointerEvents: 'none'
        }}>
          Variant {activeMediaIndex + 1}/{total}
        </div>
      )}
      
      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button 
            onClick={handlePrev}
            style={{ 
              position: 'absolute', 
              left: '0.4rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: 'rgba(18,20,22,0.6)', 
              border: '1px solid rgba(255,255,255,0.15)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              zIndex: 30,
              transition: 'background 0.2s',
              padding: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(18,20,22,0.9)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(18,20,22,0.6)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={handleNext}
            style={{ 
              position: 'absolute', 
              right: '0.4rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              width: '24px', 
              height: '24px', 
              borderRadius: '50%', 
              background: 'rgba(18,20,22,0.6)', 
              border: '1px solid rgba(255,255,255,0.15)', 
              color: 'white', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              zIndex: 30,
              transition: 'background 0.2s',
              padding: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(18,20,22,0.9)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(18,20,22,0.6)'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </>
      )}
      
      {/* Navigation Dot Indicators */}
      {total > 1 && (
        <div style={{ 
          position: 'absolute', 
          bottom: '0.5rem', 
          left: '0', 
          right: '0', 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '0.3rem', 
          zIndex: 30 
        }}>
          {medias.map((_, idx) => (
            <button 
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setActiveMediaIndex(idx);
              }}
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: idx === activeMediaIndex ? '#B9783B' : 'rgba(255,255,255,0.4)', 
                border: 'none', 
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};


export default function SocialAdsDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Settings & Prompts State
  const [settings, setSettings] = useState<SocialAdsSettings>(DEFAULT_SOCIAL_ADS_SETTINGS);
  const [personas, setPersonas] = useState<AdPersona[]>(DEFAULT_PERSONAS);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [fbPageTokenInput, setFbPageTokenInput] = useState('');
  const [fbPageIdInput, setFbPageIdInput] = useState('');
  
  // Paid Ads Credentials Input States
  const [metaAdAccountIdInput, setMetaAdAccountIdInput] = useState('');
  const [metaDeveloperTokenInput, setMetaDeveloperTokenInput] = useState('');
  const [googleDeveloperTokenInput, setGoogleDeveloperTokenInput] = useState('');
  const [googleCustomerIdInput, setGoogleCustomerIdInput] = useState('');
  const [googleClientIdInput, setGoogleClientIdInput] = useState('');
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState('');
  const [googleRefreshTokenInput, setGoogleRefreshTokenInput] = useState('');

  // UI Tabs State
  const [activeTab, setActiveTab] = useState<'planner' | 'personas' | 'performance' | 'settings'>('planner');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);

  // Andromeda & Ad Performance Tracker States
  const [campaignMode, setCampaignMode] = useState<'new' | 'consolidated'>('new');
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  const [isCampaignsLoading, setIsCampaignsLoading] = useState<boolean>(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [selectedAdSetId, setSelectedAdSetId] = useState<string>('');
  const [performanceAds, setPerformanceAds] = useState<any[]>([]);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState<boolean>(false);
  const [performanceFilter, setPerformanceFilter] = useState({ active: true, paused: true, stopped: false });
  const [statusMutatingAdId, setStatusMutatingAdId] = useState<string | null>(null);

  // Calendar Events States
  const [eventsList, setEventsList] = useState<CalendarEvent[]>([]);

  // Campaign Inputs State
  const [platform, setPlatform] = useState<'meta' | 'google-search' | 'google-pmax'>('meta');
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['family']);
  const [targetLocation, setTargetLocation] = useState('Destin, FL');
  const [selectedEvent, setSelectedEvent] = useState('None');
  const [selectedUrgency, setSelectedUrgency] = useState('Slow Mid-week Period');
  const [selectedBookingWindows, setSelectedBookingWindows] = useState<string[]>(['mid-term']);
  const [selectedSearchIntent, setSelectedSearchIntent] = useState('High-Intent Transactional');
  const [mediaAssetsInput, setMediaAssetsInput] = useState('Yacht deck views, snorkeling setups, local bays');

  // Paid Publish Parameters
  const [dailyBudget, setDailyBudget] = useState<number>(25);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [targetAudience, setTargetAudience] = useState<string>('tourists');

  // AI Recommendation proposal
  interface RecommendedGoal {
    title: string;
    desc: string;
    priority: 'high' | 'medium';
    platform: 'meta' | 'google-search' | 'google-pmax';
    personas: string[];
    urgency: string;
    bookingWindows: string[];
  }
  const [recommendedGoal, setRecommendedGoal] = useState<RecommendedGoal | null>(null);

  // Generation Output State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [bundles, setBundles] = useState<AdBundle[]>([]);
  const [selectedBundleIndex, setSelectedBundleIndex] = useState<number>(0);
  const [activePersonaFilter, setActivePersonaFilter] = useState<string>('');
  
  // Mockup View Placement State
  const [metaPlacement, setMetaPlacement] = useState<'feed' | 'story'>('feed');
  const [googlePMaxPlacement, setGooglePMaxPlacement] = useState<'search' | 'maps' | 'youtube'>('search');

  // Media Modal Selection State
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  // Draft Persistence States
  const [showDashboardOverride, setShowDashboardOverride] = useState<boolean>(false);
  const [isSaveDraftModalOpen, setIsSaveDraftModalOpen] = useState<boolean>(false);
  const [isLoadDraftModalOpen, setIsLoadDraftModalOpen] = useState<boolean>(false);
  // Publisher Modal States
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishChannel, setPublishChannel] = useState<'facebook' | 'instagram' | 'meta_ads' | 'google_search' | 'google_pmax'>('facebook');
  const [publishCopy, setPublishCopy] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);
  const [publishErrorMessage, setPublishErrorMessage] = useState<string | null>(null);
  const [draftNameInput, setDraftNameInput] = useState<string>('');
  const [draftStatus, setDraftStatus] = useState<'draft' | 'approved'>('draft');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<SocialAdDraft[]>([]);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [imageEditorCurrentUrl, setImageEditorCurrentUrl] = useState<string | undefined>(undefined);
  const [isVideoBuilderOpen, setIsVideoBuilderOpen] = useState(false);
  
  // Batch upload and aspect ratio selection states
  const [activeRatioSlotTarget, setActiveRatioSlotTarget] = useState<{ variationIndex: number; ratioKey: 'feed_4_5' | 'story_9_16' | 'square_1_1' } | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadStatus, setBatchUploadStatus] = useState('');

  // Print QR & Affiliate performance states
  const [performanceBookings, setPerformanceBookings] = useState<BookingRecord[]>([]);
  const [companies, setCompanies] = useState<ContentItem[]>([]);
  const [staffList, setStaffList] = useState<ContentItem[]>([]);
  const [locations, setLocations] = useState<ContentItem[]>([]);
  const [owners, setOwners] = useState<ContentItem[]>([]);

  // Reset preview variation when active bundle changes
  useEffect(() => {
    setActiveMediaIndex(0);
  }, [selectedBundleIndex]);
  
  // Custom Persona Management State
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaDesc, setNewPersonaDesc] = useState('');



  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load configuration and data
  useEffect(() => {
    async function loadData() {
      try {
        const [adsSettings, draftsList, ledgerBookings, allBookings, allCompanies, allStaff, allLocations, allOwners, events] = await Promise.all([
          loadSocialAdsSettings(),
          loadSocialAdDrafts(),
          getCommissionLedger(),
          getAllBookings(),
          getContentItems('company'),
          getContentItems('staff'),
          getContentItems('location'),
          getContentItems('owner'),
          getCalendarEvents()
        ]);

        if (adsSettings) {
          setSettings(adsSettings);
          setApiKeyInput(adsSettings.apiKey || '');
          setFbPageTokenInput(adsSettings.fbPageToken || '');
          setFbPageIdInput(adsSettings.fbPageId || '');
          setMetaAdAccountIdInput(adsSettings.metaAdAccountId || '');
          setMetaDeveloperTokenInput(adsSettings.metaDeveloperToken || '');
          setGoogleDeveloperTokenInput(adsSettings.googleDeveloperToken || '');
          setGoogleCustomerIdInput(adsSettings.googleCustomerId || '');
          setGoogleClientIdInput(adsSettings.googleClientId || '');
          setGoogleClientSecretInput(adsSettings.googleClientSecret || '');
          setGoogleRefreshTokenInput(adsSettings.googleRefreshToken || '');
          
          // Load custom personas if stored in settings
          const customPersonas = (adsSettings as any).personas;
          if (customPersonas && Array.isArray(customPersonas) && customPersonas.length > 0) {
            setPersonas(customPersonas);
          }
        }

        setSavedDrafts(draftsList);
        setPerformanceBookings(ledgerBookings);
        setCompanies(allCompanies.filter(c => c.status === 'published'));
        setStaffList(allStaff.filter(s => s.status === 'published'));
        setLocations(allLocations.filter(l => l.status === 'published'));
        setOwners(allOwners.filter(o => o.status === 'published'));
        setEventsList(events || []);

        // Calculate dynamic weekly AI goal recommendation based on live database bookings and events
        const recommended = calculateRecommendedGoal(allBookings, events || []);
        setRecommendedGoal(recommended);
      } catch (err) {
        console.error('Failed to load social ads settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Load campaigns list when publish mode is consolidated or when performance tab is active
  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceAds();
    }
  }, [activeTab]);

  useEffect(() => {
    if (isPublishModalOpen && publishChannel === 'meta_ads' && campaignMode === 'consolidated' && campaignsList.length === 0) {
      fetchCampaigns();
    }
  }, [isPublishModalOpen, publishChannel, campaignMode]);

  const fetchPerformanceAds = async () => {
    setIsLoadingPerformance(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/admin/social-ads/meta/performance', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPerformanceAds(data);
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to fetch performance ads.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error fetching performance ads.', 'error');
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const fetchCampaigns = async () => {
    setIsCampaignsLoading(true);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/admin/social-ads/meta/campaigns', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCampaignsList(data);
        if (data.length > 0) {
          setSelectedCampaignId(data[0].id);
          if (data[0].adsets && data[0].adsets.length > 0) {
            setSelectedAdSetId(data[0].adsets[0].id);
          }
        }
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to fetch existing campaigns.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error fetching campaigns.', 'error');
    } finally {
      setIsCampaignsLoading(false);
    }
  };

  const handleToggleAdStatus = async (adId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setStatusMutatingAdId(adId);
    try {
      const idToken = await user?.getIdToken();
      const response = await fetch('/api/admin/social-ads/meta/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ adId, status: nextStatus })
      });

      if (response.ok) {
        showToast(`Ad status updated to ${nextStatus} successfully.`, 'success');
        setPerformanceAds(prev => prev.map(ad => ad.id === adId ? { ...ad, status: nextStatus } : ad));
      } else {
        const err = await response.json();
        showToast(err.error || 'Failed to toggle ad status.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error updating ad status.', 'error');
    } finally {
      setStatusMutatingAdId(null);
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      const updatedSettings = {
        ...settings,
        apiKey: apiKeyInput,
        fbPageToken: fbPageTokenInput,
        fbPageId: fbPageIdInput,
        metaAdAccountId: metaAdAccountIdInput,
        metaDeveloperToken: metaDeveloperTokenInput,
        googleDeveloperToken: googleDeveloperTokenInput,
        googleCustomerId: googleCustomerIdInput,
        googleClientId: googleClientIdInput,
        googleClientSecret: googleClientSecretInput,
        googleRefreshToken: googleRefreshTokenInput,
        personas: personas // include personas array inside the social_ads settings document
      };
      await saveSocialAdsSettings(updatedSettings);
      setSettings(updatedSettings);
      setSaveStatus('success');
      showToast('Configuration successfully saved to database.', 'success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      showToast('Error saving settings to database.', 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Persona Management Functions
  const handleAddPersona = () => {
    if (!newPersonaName.trim() || !newPersonaDesc.trim()) {
      showToast('Please provide a name and description for the new persona.', 'error');
      return;
    }
    const newId = 'custom-' + Math.random().toString(36).substring(2, 9);
    const updated = [...personas, { id: newId, name: newPersonaName, description: newPersonaDesc }];
    setPersonas(updated);
    setNewPersonaName('');
    setNewPersonaDesc('');
    showToast('Persona added. Remember to click "Save Settings" to persist.', 'info');
  };

  const handleDeletePersona = (id: string) => {
    const updated = personas.filter(p => p.id !== id);
    setPersonas(updated);
    setSelectedPersonas(prev => {
      const filtered = prev.filter(pId => pId !== id);
      return filtered.length > 0 ? filtered : [personas[0]?.id || 'family'];
    });
    showToast('Persona removed. Remember to click "Save Settings" to persist.', 'info');
  };

  // Note: Calendar Event handlers moved to standalone /admin/calendar route;

  // Campaign Draft Persistence & Export Handlers
  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!draftNameInput.trim()) {
      showToast('Please provide a name for the draft.', 'error');
      return;
    }
    
    try {
      const draftData = {
        name: draftNameInput,
        status: draftStatus,
        bundles,
        platform,
        selectedPersonas,
        selectedBookingWindows,
        selectedUrgency,
        targetLocation
      };
      
      const draftId = await saveSocialAdDraft(
        currentDraftId ? { ...draftData, id: currentDraftId } : draftData
      );
      
      setCurrentDraftId(draftId);
      setIsSaveDraftModalOpen(false);
      
      // Reload saved drafts list
      const updatedDrafts = await loadSocialAdDrafts();
      setSavedDrafts(updatedDrafts);
      
      showToast(`Draft "${draftNameInput}" successfully saved.`, 'success');
    } catch (err) {
      console.error('Failed to save draft:', err);
      showToast('Failed to save campaign draft.', 'error');
    }
  };

  const handleLoadDraft = (draft: SocialAdDraft) => {
    setCurrentDraftId(draft.id);
    setDraftNameInput(draft.name);
    setDraftStatus(draft.status || 'draft');
    setBundles(draft.bundles || []);
    setPlatform(draft.platform as any);
    setSelectedPersonas(draft.selectedPersonas || []);
    setSelectedBookingWindows(draft.selectedBookingWindows || []);
    setSelectedUrgency(draft.selectedUrgency || '');
    setTargetLocation(draft.targetLocation || 'Destin, FL');
    setSelectedBundleIndex(0);
    setShowDashboardOverride(false);
    setIsLoadDraftModalOpen(false);
    showToast(`Draft "${draft.name}" successfully loaded.`, 'success');
  };

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      const success = await deleteSocialAdDraft(draftId);
      if (success) {
        setSavedDrafts(prev => prev.filter(d => d.id !== draftId));
        if (currentDraftId === draftId) {
          setCurrentDraftId(null);
          setDraftNameInput('');
        }
        showToast('Draft deleted successfully.', 'success');
      } else {
        showToast('Failed to delete draft.', 'error');
      }
    } catch (err) {
      console.error('Failed to delete draft:', err);
      showToast('Failed to delete draft.', 'error');
    }
  };

  const handleExportCopySheet = () => {
    if (bundles.length === 0) {
      showToast('No active campaign bundles to export.', 'error');
      return;
    }
    
    let content = `==================================================\n`;
    content += `CAMPAIGN COPY SHEET: ${draftNameInput || 'Ad Concept Synthesis'}\n`;
    content += `Platform: ${platform.toUpperCase()}\n`;
    content += `Status: ${draftStatus.toUpperCase()}\n`;
    content += `Exported: ${new Date().toLocaleString()}\n`;
    content += `==================================================\n\n`;
    
    bundles.forEach((b, idx) => {
      const adSetName = getBundleAdSetName(b);
      content += `--------------------------------------------------\n`;
      content += `Ad Concept ${idx + 1}: ${b.conceptName}\n`;
      content += `Ad Set: ${adSetName}\n`;
      content += `--------------------------------------------------\n`;
      content += `🎯 Strategic Rationale:\n${b.rationale}\n\n`;
      
      if (b.hook) {
        content += `🔥 Creative Hook:\n${b.hook}\n\n`;
      }
      
      if (b.bodyCopy) {
        content += `💬 Body Copy:\n${b.bodyCopy}\n\n`;
      }
      
      if (b.headline) {
        content += `📰 Headline:\n${b.headline}\n\n`;
      }
      
      if (b.headlines && b.headlines.length > 0) {
        content += `📰 Google Search Headlines:\n`;
        b.headlines.forEach((h, hIdx) => {
          content += `  - [Headline ${hIdx + 1}] ${h}\n`;
        });
        content += `\n`;
      }
      
      if (b.descriptions && b.descriptions.length > 0) {
        content += `💬 Google Search Descriptions:\n`;
        b.descriptions.forEach((d, dIdx) => {
          content += `  - [Description ${dIdx + 1}] ${d}\n`;
        });
        content += `\n`;
      }

      if (b.keywords && b.keywords.length > 0) {
        content += `🔑 Target Keywords:\n${b.keywords.join(', ')}\n\n`;
      }
      
      const mediaList = b.boundMedias || (b.boundMedia ? [b.boundMedia] : []);
      content += `🖼️ Media Asset Variations (${mediaList.length}):\n`;
      if (mediaList.length > 0) {
        mediaList.forEach((m, mIdx) => {
          content += `  - [Variation ${mIdx + 1}] ${m}\n`;
        });
      } else {
        content += `  - None bound. Use default placement library assets.\n`;
      }
      
      if (b.suggestedTags && b.suggestedTags.length > 0) {
        content += `🏷️ Suggested Tags / Hashtags:\n${b.suggestedTags.join(', ')}\n\n`;
      }
      
      content += `\n`;
    });
    
    // Download file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const fileName = `${(draftNameInput || 'campaign-export').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-copysheet.txt`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Copy sheet exported successfully.', 'success');
  };

  const handlePublishCampaign = async () => {
    if (!publishCopy.trim() && publishChannel !== 'google_search' && publishChannel !== 'google_pmax') {
      showToast('Please provide message copy to publish.', 'error');
      return;
    }
    
    setIsPublishing(true);
    setPublishSuccessMessage(null);
    setPublishErrorMessage(null);
    
    try {
      const idToken = await user?.getIdToken();
      const boundMedias = activeBundle?.boundMedias || (activeBundle?.boundMedia ? [activeBundle.boundMedia] : []);
      const ratioImages = activeBundle?.boundMediasByRatio?.[activeMediaIndex] || null;
      
      const payload: any = {
        conceptName: activeBundle?.conceptName || 'Campaign Post',
        message: publishCopy,
        mediaUrls: boundMedias,
        ratioImages: ratioImages,
        publishTo: publishChannel,
        dailyBudget,
        durationDays,
        targetAudience,
        headlines: activeBundle?.headlines || [],
        descriptions: activeBundle?.descriptions || [],
        keywords: activeBundle?.keywords || [],
        negativeKeywords: activeBundle?.negativeKeywords || [],
        longHeadlines: activeBundle?.longHeadlines || []
      };

      if (publishChannel === 'meta_ads') {
        payload.campaignMode = campaignMode;
        if (campaignMode === 'consolidated') {
          payload.existingAdSetId = selectedAdSetId;
        }
      }

      const response = await fetch('/api/admin/social-ads/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        let msg = 'Success: Campaign successfully published.';
        if (publishChannel === 'facebook') {
          msg = 'Success: Campaign successfully published to Facebook Page.';
        } else if (publishChannel === 'meta_ads') {
          msg = `Success: Paid Meta Ads campaign created! ($${dailyBudget}/day for ${durationDays} days)`;
        } else if (publishChannel === 'google_search') {
          msg = `Success: Google Search Ads campaign created! ($${dailyBudget}/day for ${durationDays} days)`;
        } else if (publishChannel === 'google_pmax') {
          msg = `Success: Google Performance Max asset group created! ($${dailyBudget}/day for ${durationDays} days)`;
        }

        if (data.simulated) {
          msg = `Simulation Mode: ${msg} (Configuration payload printed to server logs)`;
        }

        setPublishSuccessMessage(msg);
        showToast('Campaign published successfully!', 'success');
      } else {
        setPublishErrorMessage(data.error || 'Failed to publish campaign.');
        showToast('Failed to publish campaign.', 'error');
      }
    } catch (error: any) {
      console.error('Publish Error:', error);
      setPublishErrorMessage('An unexpected connection error occurred.');
      showToast('Publish error occurred.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  // Campaign AI Generator trigger
  const handleGenerateCampaign = async () => {
    if (selectedPersonas.length === 0) {
      showToast('Please select at least one customer persona.', 'error');
      return;
    }
    if (selectedBookingWindows.length === 0) {
      showToast('Please select at least one booking window.', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setBundles([]);

    try {
      const idToken = await user?.getIdToken();

      const combinations: { personaId: string; bookingWindowId: string }[] = [];
      selectedPersonas.forEach((personaId) => {
        selectedBookingWindows.forEach((bwId) => {
          combinations.push({ personaId, bookingWindowId: bwId });
        });
      });

      const results = [];
      for (const { personaId, bookingWindowId } of combinations) {
        const personaObj = personas.find(p => p.id === personaId);
        const personaName = personaObj ? personaObj.name : personaId;
        const personaDetails = personaObj ? `${personaObj.name} - ${personaObj.description}` : personaId;

        const bwObj = BOOKING_WINDOW_OPTIONS.find(b => b.id === bookingWindowId);
        const bookingWindowName = bwObj ? bwObj.name : bookingWindowId;

        try {
          const response = await fetch('/api/admin/social-ads/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
              platform,
              persona: personaDetails,
              event: selectedEvent,
              urgency: selectedUrgency,
              bookingWindow: bookingWindowName,
              searchIntent: platform === 'google-search' ? selectedSearchIntent : undefined,
              mediaAssets: mediaAssetsInput,
              location: targetLocation
            })
          });

          if (!response.ok) {
            const errJson = await response.json();
            throw new Error(errJson.error || 'Server error occurred during generation.');
          }

          const output = await response.json();
          if (output.bundles && Array.isArray(output.bundles)) {
            // Tag each bundle with its persona name and booking window name
            const taggedBundles = output.bundles.map((bundle: AdBundle) => ({
              ...bundle,
              personaName,
              bookingWindowName: bookingWindowName
            }));
            results.push(taggedBundles);
          } else {
            throw new Error('Invalid response structure received from generator.');
          }
        } catch (error: any) {
          console.error(`Error generating for ${personaName} - ${bookingWindowName}:`, error);
          results.push({
            failed: true,
            adSet: `${personaName} (${bookingWindowName.split(' ')[0]})`,
            message: error.message || 'Transient error occurred.'
          });
        }
        
        // Add a 500ms delay between sequential calls to prevent concurrent burst limits
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      
      const successfulResults = results.filter(r => r && !('failed' in r)) as AdBundle[][];
      const failedResults = results.filter(r => r && ('failed' in r)) as { failed: boolean; adSet: string; message: string }[];
      
      const combinedBundles = successfulResults.flat();

      if (combinedBundles.length > 0) {
        setBundles(combinedBundles);
        setSelectedBundleIndex(0);
        const firstAdSet = getBundleAdSetName(combinedBundles[0]);
        setActivePersonaFilter(firstAdSet);
        
        if (failedResults.length > 0) {
          const failedList = failedResults.map(f => f.adSet).join(', ');
          showToast(`Generated ${combinedBundles.length} bundles. Failed: ${failedList}`, 'info');
          setGenerationError(`Partial Success. The following target sets failed to generate (Gemini API unavailable or rate-limited): ${failedResults.map(f => `${f.adSet} (${f.message})`).join(', ')}`);
        } else {
          showToast(`AI successfully generated ${combinedBundles.length} creative bundles!`, 'success');
        }
      } else {
        const errorMsg = failedResults.length > 0 
          ? `All generation attempts failed. Errors: ${failedResults.map(f => `${f.adSet}: ${f.message}`).join('; ')}`
          : 'No creative bundles were generated.';
        throw new Error(errorMsg);
      }

    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'An error occurred. Check server logs.');
      showToast('AI Generation failed.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Mockup Copy Editor handlers
  const handleUpdateField = (field: keyof AdBundle, value: any) => {
    const updated = [...bundles];
    if (updated[selectedBundleIndex]) {
      updated[selectedBundleIndex] = {
        ...updated[selectedBundleIndex],
        [field]: value
      };
      setBundles(updated);
    }
  };

  const handleRefineAdImmediate = async (instructionText: string) => {
    if (!activeBundle) return;
    setIsRefining(true);
    try {
      const idToken = user ? await user.getIdToken() : '';
      
      const response = await fetch('/api/admin/social-ads/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          platform,
          ad: activeBundle,
          instruction: instructionText,
          originalPromptContext: `Persona: ${activeBundle.personaName || ''}, Booking Window: ${activeBundle.bookingWindowName || ''}`
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Server error occurred during refinement.');
      }

      const refinedAd = await response.json();
      const updated = [...bundles];
      updated[selectedBundleIndex] = refinedAd;
      setBundles(updated);
      setRefineInstruction('');
      showToast('AI copy refined successfully.', 'success');
    } catch (error: any) {
      console.error('Error refining ad copy:', error);
      showToast(error.message || 'Failed to refine ad copy.', 'error');
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineAd = async () => {
    await handleRefineAdImmediate(refineInstruction);
  };

  const handleUpdateArrayElement = (field: 'headlines' | 'descriptions' | 'keywords' | 'negativeKeywords' | 'longHeadlines', index: number, value: string) => {
    const updated = [...bundles];
    if (updated[selectedBundleIndex]) {
      const arr = updated[selectedBundleIndex][field] ? [...(updated[selectedBundleIndex][field] as string[])] : [];
      arr[index] = value;
      updated[selectedBundleIndex] = {
        ...updated[selectedBundleIndex],
        [field]: arr
      };
      setBundles(updated);
    }
  };

  const handleAddArrayElement = (field: 'headlines' | 'descriptions' | 'keywords' | 'negativeKeywords' | 'longHeadlines') => {
    const updated = [...bundles];
    if (updated[selectedBundleIndex]) {
      const arr = updated[selectedBundleIndex][field] ? [...(updated[selectedBundleIndex][field] as string[])] : [];
      arr.push('New ad copy text...');
      updated[selectedBundleIndex] = {
        ...updated[selectedBundleIndex],
        [field]: arr
      };
      setBundles(updated);
    }
  };

  const handleRemoveArrayElement = (field: 'headlines' | 'descriptions' | 'keywords' | 'negativeKeywords' | 'longHeadlines', index: number) => {
    const updated = [...bundles];
    if (updated[selectedBundleIndex]) {
      const arr = updated[selectedBundleIndex][field] ? [...(updated[selectedBundleIndex][field] as string[])] : [];
      arr.splice(index, 1);
      updated[selectedBundleIndex] = {
        ...updated[selectedBundleIndex],
        [field]: arr
      };
      setBundles(updated);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#121416', color: '#F4F1EA', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
        <RefreshCw className="animate-spin" size={36} color="#B9783B" />
        <span style={{ marginTop: '1rem', color: '#D8C7AF', fontSize: '0.9rem' }}>Booting social ad engine configurations...</span>
      </div>
    );
  }

  const activeBundle = bundles[selectedBundleIndex] || null;

  const adContextText = activeBundle
    ? [
        activeBundle.headline,
        activeBundle.bodyCopy,
        activeBundle.hook,
        ...(activeBundle.headlines || []),
        ...(activeBundle.descriptions || [])
      ].filter(Boolean).join('\n')
    : '';

  const handleRefineMedia = (url: string) => {
    const currentMedias = activeBundle?.boundMedias || (activeBundle?.boundMedia ? [activeBundle.boundMedia] : []);
    const updated = [...bundles];
    if (updated[selectedBundleIndex]) {
      let updatedMedias = [...currentMedias];
      if (updatedMedias.length > 0) {
        updatedMedias[activeMediaIndex] = url;
      } else {
        updatedMedias = [url];
      }
      updated[selectedBundleIndex] = {
        ...updated[selectedBundleIndex],
        boundMedias: updatedMedias,
        boundMedia: updatedMedias[0]
      };
      setBundles(updated);
      showToast('Mockup media updated with AI refined creative.', 'success');
    }
  };

  const handleBatchUploadRatioImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsBatchUploading(true);
    setBatchUploadStatus('Reading file dimensions...');
    
    try {
      const updated = [...bundles];
      const bundle = updated[selectedBundleIndex];
      if (!bundle) throw new Error('No campaign selected.');
      
      const currentRatios = bundle.boundMediasByRatio || {};
      const variationRatios = { ...(currentRatios[activeMediaIndex] || {}) };
      
      const uploadPromises = Array.from(files).map((file) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
              const width = img.naturalWidth;
              const height = img.naturalHeight;
              const ratio = height / width;
              
              let detectedRatioKey: 'feed_4_5' | 'story_9_16' | 'square_1_1' = 'square_1_1';
              if (ratio >= 1.4) {
                detectedRatioKey = 'story_9_16';
              } else if (ratio >= 1.15) {
                detectedRatioKey = 'feed_4_5';
              } else {
                detectedRatioKey = 'square_1_1';
              }
              
              try {
                setBatchUploadStatus(`Uploading ${file.name} as ${detectedRatioKey.replace('_', ' ')}...`);
                const url = await uploadFile(file, 'library');
                variationRatios[detectedRatioKey] = url;
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            img.onerror = () => reject(new Error('Failed to load image file dimensions.'));
            img.src = event.target?.result as string;
          };
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsDataURL(file);
        });
      });
      
      await Promise.all(uploadPromises);
      
      bundle.boundMediasByRatio = {
        ...currentRatios,
        [activeMediaIndex]: variationRatios
      };
      
      const primaryUrl = variationRatios.square_1_1 || variationRatios.feed_4_5 || variationRatios.story_9_16;
      if (primaryUrl && (!bundle.boundMedias || bundle.boundMedias.length === 0)) {
        bundle.boundMedias = [primaryUrl];
        bundle.boundMedia = primaryUrl;
      }
      
      setBundles(updated);
      showToast('Batch aspect ratio images uploaded and assigned successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Batch upload failed.', 'error');
    } finally {
      setIsBatchUploading(false);
      setBatchUploadStatus('');
      if (e.target) e.target.value = '';
    }
  };

  const displayLocation = targetLocation || 'Destin, FL';
  const displayCity = displayLocation.split(',')[0].trim();

  // Dynamic grouping logic
  const uniqueAdSets = Array.from(new Set(bundles.map(b => getBundleAdSetName(b)).filter(Boolean))) as string[];
  const filteredBundles = activePersonaFilter 
    ? bundles.filter(b => getBundleAdSetName(b) === activePersonaFilter)
    : bundles;

  const getDashboardReferrerName = (b: BookingRecord) => {
    if (!b.referredById) return 'Direct';
    let entity: ContentItem | undefined;
    if (b.referredByType === 'company') {
      entity = companies.find(c => c.slug === b.referredById);
    } else if (b.referredByType === 'staff') {
      entity = staffList.find(s => s.slug === b.referredById);
    } else if (b.referredByType === 'location') {
      entity = locations.find(l => l.slug === b.referredById);
    } else if (b.referredByType === 'owner') {
      entity = owners.find(o => o.slug === b.referredById);
    }
    return entity ? entity.title : b.referredById;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', padding: '2rem 3rem', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
          background: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#1e3a8a',
          color: 'white', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '0.75rem',
          animation: 'fadeIn 0.2s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <AlertTriangle size={18} /> : <Eye size={18} />}
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={() => router.push('/admin')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', width: '38px', height: '38px', color: '#D8C7AF', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>Social & Paid Ads Campaign Manager</h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Use AI Contextual Synthesis to draft, preview, and refine creatives for Meta and Google networks.</p>
          </div>
        </div>
        
        {/* Header Panel Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setIsLoadDraftModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '0.5rem 1rem', color: '#D8C7AF',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'rgba(185, 120, 59, 0.4)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.background = '#1E2124';
            }}
          >
            <FolderOpen size={15} color="#B9783B" /> Load Campaign Draft
          </button>
          
          {/* Tab Controls */}
          <div style={{ display: 'flex', background: '#1E2124', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <button 
              onClick={() => setActiveTab('planner')}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: activeTab === 'planner' ? '#B9783B' : 'transparent', color: activeTab === 'planner' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'planner' ? 600 : 500, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Campaign Planner
            </button>

            <button 
              onClick={() => setActiveTab('personas')}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: activeTab === 'personas' ? '#B9783B' : 'transparent', color: activeTab === 'personas' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'personas' ? 600 : 500, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Target Personas
            </button>

            <button 
              onClick={() => setActiveTab('performance')}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: activeTab === 'performance' ? '#B9783B' : 'transparent', color: activeTab === 'performance' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'performance' ? 600 : 500, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Ad Performance Tracker
            </button>

            <button 
              onClick={() => setActiveTab('settings')}
              style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: activeTab === 'settings' ? '#B9783B' : 'transparent', color: activeTab === 'settings' ? 'white' : '#D8C7AF', fontWeight: activeTab === 'settings' ? 600 : 500, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Prompt Settings
            </button>
          </div>
        </div>
      </div>

      {/* Tab CONTENT: Planner */}
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Core Configuration Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '2rem', alignItems: 'stretch' }}>
            
            {/* Left side: Vector Selection Drawer */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', margin: '0 0 0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem' }}>Configure Ad Vectors</h3>
              
              {/* Placement Platform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Target Network</label>
                <select 
                  value={platform} 
                  onChange={(e) => setPlatform(e.target.value as any)}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="meta">Meta Ads (FB/Instagram)</option>
                  <option value="google-search">Google Search (RSA)</option>
                  <option value="google-pmax">Google Performance Max</option>
                </select>
              </div>

              {/* Target Location */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Target Location</label>
                <input 
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  placeholder="e.g. Destin, FL"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              {/* Customer Persona Checklist */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Customer Persona (Multi-Select)</label>
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#121416', 
                  padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', 
                  maxHeight: '140px', overflowY: 'auto' 
                }}>
                  {personas.map(p => {
                    const isSelected = selectedPersonas.includes(p.id);
                    return (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: isSelected ? 'white' : '#D8C7AF', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPersonas([...selectedPersonas, p.id]);
                            } else {
                              if (selectedPersonas.length > 1) {
                                setSelectedPersonas(selectedPersonas.filter(id => id !== p.id));
                              } else {
                                showToast('At least one persona must remain selected.', 'error');
                              }
                            }
                          }}
                          style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                        />
                        {p.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Event / Calendar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Calendar Event / Season</label>
                  <Link href="/admin/calendar" style={{ fontSize: '0.7rem', color: '#B9783B', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                    Manage Events ↗
                  </Link>
                </div>
                <select 
                  value={selectedEvent} 
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="None">None (Standard Season)</option>
                  {eventsList.map(e => (
                    <option key={e.id} value={e.title}>{e.title}</option>
                  ))}
                  {/* Default presets fallback */}
                  {!eventsList.some(e => e.title === '4th of July Weekend') && <option value="4th of July Weekend">4th of July Weekend</option>}
                  {!eventsList.some(e => e.title === 'Blue Angels Air Show') && <option value="Blue Angels Air Show">Blue Angels Air Show</option>}
                  {!eventsList.some(e => e.title === 'Spring Break Season') && <option value="Spring Break Season">Spring Break Season</option>}
                  {!eventsList.some(e => e.title === 'Destin Fishing Rodeo') && <option value="Destin Fishing Rodeo">Destin Fishing Rodeo</option>}
                </select>
              </div>

              {/* Inventory Scarcity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Inventory Urgency</label>
                <select 
                  value={selectedUrgency} 
                  onChange={(e) => setSelectedUrgency(e.target.value)}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="Slow Mid-week Period">Slow Mid-week Period (Promo)</option>
                  <option value="High Booking Scarcity">High Booking Scarcity (Urgency Copy)</option>
                  <option value="Low Booking Rate - Immediate Filler">Immediate vacancy filler</option>
                </select>
              </div>

              {/* Booking Window */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Booking Window (Multi-Select)</label>
                <div style={{ 
                  display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#121416', 
                  padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                  maxHeight: '110px', overflowY: 'auto'
                }}>
                  {BOOKING_WINDOW_OPTIONS.map(bw => {
                    const isSelected = selectedBookingWindows.includes(bw.id);
                    return (
                      <label key={bw.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: isSelected ? 'white' : '#D8C7AF', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookingWindows([...selectedBookingWindows, bw.id]);
                            } else {
                              if (selectedBookingWindows.length > 1) {
                                setSelectedBookingWindows(selectedBookingWindows.filter(id => id !== bw.id));
                              } else {
                                showToast('At least one booking window must remain selected.', 'error');
                              }
                            }
                          }}
                          style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                        />
                        {bw.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Google Search Intent (Search placement only) */}
              {platform === 'google-search' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', animation: 'fadeIn 0.2s ease' }}>
                  <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Google Search Intent</label>
                  <select 
                    value={selectedSearchIntent} 
                    onChange={(e) => setSelectedSearchIntent(e.target.value)}
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                  >
                    <option value="High-Intent Transactional">Transactional ("yacht charter destin")</option>
                    <option value="Local / Maps Intent">Local Search ("boat rental Destin harbor")</option>
                    <option value="Lifestyle / Informational">Informational ("sunset cruise Destin FL")</option>
                  </select>
                </div>
              )}

              {/* Media tags suggestion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Preferred Media Assets</label>
                <textarea 
                  value={mediaAssetsInput}
                  onChange={(e) => setMediaAssetsInput(e.target.value)}
                  rows={2}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', width: '100%', fontSize: '0.8rem', lineHeight: '1.4' }}
                />
              </div>

              {/* Action Button */}
              <button 
                onClick={handleGenerateCampaign}
                disabled={isGenerating}
                style={{ 
                  background: '#B9783B', border: 'none', color: 'white', padding: '0.75rem', 
                  borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                  marginTop: '0.5rem', opacity: isGenerating ? 0.7 : 1, transition: 'all 0.2s'
                }}
                onMouseOver={e => { if(!isGenerating) e.currentTarget.style.background = '#a1652e'; }}
                onMouseOut={e => { if(!isGenerating) e.currentTarget.style.background = '#B9783B'; }}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Generating Bundles...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Synthesize Ad Bundles
                  </>
                )}
              </button>
            </div>

            {/* Right side: Editor and Preview Workspace */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {generationError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>AI Campaign Synthesis Error:</strong>
                    <p style={{ margin: '0.2rem 0 0 0', opacity: 0.9 }}>{generationError}</p>
                  </div>
                </div>
              )}

              {/* Strategy Mini-Dashboard (Visible on empty state or showDashboardOverride) */}
              {(bundles.length === 0 || showDashboardOverride) && !isGenerating && !generationError && (() => {
                const getPersonaBookingsCount = () => {
                  const family = 24 + performanceBookings.filter(b => b.experienceTitle?.toLowerCase().includes('family') || b.guestCount > 4).length;
                  const friends = 18 + performanceBookings.filter(b => b.experienceTitle?.toLowerCase().includes('sandbar') || b.experienceTitle?.toLowerCase().includes('sunset') || b.guestCount > 6).length;
                  const couples = 15 + performanceBookings.filter(b => b.experienceTitle?.toLowerCase().includes('romantic') || b.guestCount === 2).length;
                  const anglers = 12 + performanceBookings.filter(b => b.experienceTitle?.toLowerCase().includes('fish') || b.experienceTitle?.toLowerCase().includes('angling')).length;
                  const corporate = 8 + performanceBookings.filter(b => b.experienceTitle?.toLowerCase().includes('executive') || b.experienceTitle?.toLowerCase().includes('corporate')).length;
                  return { family, friends, couples, anglers, corporate };
                };
                const personaBookings = getPersonaBookingsCount();

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                    
                    {/* Active Campaign Session Banner */}
                    {bundles.length > 0 && showDashboardOverride && (
                      <div style={{ 
                        background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.2)',
                        borderRadius: '6px', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#D8C7AF' }}>
                          Active Campaign Editor session open: <strong>{draftNameInput || 'Unsaved Campaign'}</strong>
                        </span>
                        <button 
                          onClick={() => setShowDashboardOverride(false)}
                          style={{ 
                            background: '#B9783B', border: 'none', color: 'white', 
                            padding: '0.4rem 0.85rem', borderRadius: '4px', fontSize: '0.75rem', 
                            fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' 
                          }}
                        >
                          Resume Campaign Editor <ArrowRight size={12} />
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: 0 }}>Campaign Performance &amp; AI Strategy</h2>
                      <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>Live Analytics Integration</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.5rem', alignItems: 'stretch' }}>
                      
                      {/* Left Column: AI Strategy Recommender */}
                      <div style={{ background: 'rgba(185, 120, 59, 0.03)', border: '1px solid rgba(185, 120, 59, 0.15)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Sparkles size={18} color="#B9783B" />
                          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B9783B', fontWeight: 700 }}>
                            AI Strategy Recommender
                          </span>
                        </div>
                        
                        {recommendedGoal ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', justifyContent: 'space-between' }}>
                            <div>
                              <strong style={{ fontSize: '1.15rem', color: 'white', display: 'block', fontFamily: "'Cormorant Garamond', serif" }}>
                                {recommendedGoal.title}
                              </strong>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.9, lineHeight: '1.5' }}>
                                {recommendedGoal.desc}
                              </p>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#D8C7AF', opacity: 0.6 }}>Priority:</span>
                                  <span style={{ 
                                    color: recommendedGoal.priority === 'high' ? '#f87171' : '#fbbf24', 
                                    fontWeight: 600,
                                    background: recommendedGoal.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(251,191,36,0.1)',
                                    padding: '0.1rem 0.4rem', borderRadius: '4px'
                                  }}>
                                    {recommendedGoal.priority === 'high' ? 'High Urgency' : 'Medium Priority'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#D8C7AF', opacity: 0.6 }}>Platform Target:</span>
                                  <span style={{ color: 'white', fontWeight: 600 }}>
                                    {recommendedGoal.platform === 'meta' ? 'Meta Ads (FB/IG)' : recommendedGoal.platform === 'google-search' ? 'Google Search RSA' : 'Google PMax'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#D8C7AF', opacity: 0.6 }}>Target Segments:</span>
                                  <span style={{ color: 'white', fontWeight: 600, textAlign: 'right' }}>
                                    {recommendedGoal.personas.map(p => DEFAULT_PERSONAS.find(dp => dp.id === p)?.name || p).join(', ')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#D8C7AF', opacity: 0.6 }}>Urgency Level:</span>
                                  <span style={{ color: 'white', fontWeight: 600 }}>{recommendedGoal.urgency}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                  <span style={{ color: '#D8C7AF', opacity: 0.6 }}>Booking Windows:</span>
                                  <span style={{ color: 'white', fontWeight: 600 }}>
                                    {recommendedGoal.bookingWindows.map(bw => BOOKING_WINDOW_OPTIONS.find(bo => bo.id === bw)?.name.split(' ')[0] || bw).join(', ')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                setPlatform(recommendedGoal.platform);
                                setSelectedPersonas(recommendedGoal.personas);
                                setSelectedUrgency(recommendedGoal.urgency);
                                setSelectedBookingWindows(recommendedGoal.bookingWindows);
                                showToast('AI Recommended vectors applied!', 'success');
                              }}
                              style={{ 
                                background: '#B9783B', border: 'none', color: 'white', 
                                padding: '0.7rem', borderRadius: '6px', fontSize: '0.8rem', 
                                fontWeight: 600, display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', gap: '0.5rem', cursor: 'pointer',
                                transition: 'all 0.2s', marginTop: '1rem'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = '#a1652e'}
                              onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
                            >
                              Apply Vector Strategy <ArrowRight size={14} />
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.6 }}>Analyzing seasonality...</p>
                        )}
                      </div>

                      {/* Right Column: SVG charts and ledger */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          
                          {/* Bookings/Leads by Customer Persona */}
                          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Bookings by Persona
                            </span>
                            
                            <svg width="100%" height="130" viewBox="0 0 240 130" style={{ background: 'transparent' }}>
                              <text x="5" y="16" fill="#D8C7AF" fontSize="8" fontWeight="600">Family Vacationers</text>
                              <rect x="95" y="8" width={Math.min(110, personaBookings.family * 3)} height="10" rx="2" fill="#B9783B" />
                              <text x={100 + Math.min(110, personaBookings.family * 3)} y="16" fill="white" fontSize="8" fontWeight="bold">{personaBookings.family}</text>

                              <text x="5" y="41" fill="#D8C7AF" fontSize="8" fontWeight="600">Friends &amp; Party</text>
                              <rect x="95" y="33" width={Math.min(110, personaBookings.friends * 3)} height="10" rx="2" fill="#708C84" />
                              <text x={100 + Math.min(110, personaBookings.friends * 3)} y="41" fill="white" fontSize="8" fontWeight="bold">{personaBookings.friends}</text>

                              <text x="5" y="66" fill="#D8C7AF" fontSize="8" fontWeight="600">Couples &amp; Romance</text>
                              <rect x="95" y="58" width={Math.min(110, personaBookings.couples * 3)} height="10" rx="2" fill="#5F9EA0" />
                              <text x={100 + Math.min(110, personaBookings.couples * 3)} y="66" fill="white" fontSize="8" fontWeight="bold">{personaBookings.couples}</text>

                              <text x="5" y="91" fill="#D8C7AF" fontSize="8" fontWeight="600">Anglers &amp; Fishers</text>
                              <rect x="95" y="83" width={Math.min(110, personaBookings.anglers * 3)} height="10" rx="2" fill="#D4AF37" />
                              <text x={100 + Math.min(110, personaBookings.anglers * 3)} y="91" fill="white" fontSize="8" fontWeight="bold">{personaBookings.anglers}</text>

                              <text x="5" y="116" fill="#D8C7AF" fontSize="8" fontWeight="600">Corporate &amp; Exec</text>
                              <rect x="95" y="108" width={Math.min(110, personaBookings.corporate * 3)} height="10" rx="2" fill="#C5A059" />
                              <text x={100 + Math.min(110, personaBookings.corporate * 3)} y="116" fill="white" fontSize="8" fontWeight="bold">{personaBookings.corporate}</text>
                            </svg>
                          </div>

                          {/* CTR Performance Trend */}
                          <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Average Ad CTR (4-Wk)
                            </span>
                            
                            <svg width="100%" height="130" viewBox="0 0 240 130" style={{ background: 'transparent' }}>
                              <defs>
                                <linearGradient id="ctrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#B9783B" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#B9783B" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              <line x1="25" y1="20" x2="225" y2="20" stroke="rgba(255,255,255,0.04)" />
                              <line x1="25" y1="50" x2="225" y2="50" stroke="rgba(255,255,255,0.04)" />
                              <line x1="25" y1="80" x2="225" y2="80" stroke="rgba(255,255,255,0.04)" />
                              <line x1="25" y1="110" x2="225" y2="110" stroke="rgba(255,255,255,0.08)" />

                              <text x="5" y="23" fill="#D8C7AF" opacity="0.5" fontSize="7">3.0%</text>
                              <text x="5" y="53" fill="#D8C7AF" opacity="0.5" fontSize="7">2.0%</text>
                              <text x="5" y="83" fill="#D8C7AF" opacity="0.5" fontSize="7">1.0%</text>

                              <path d="M25 85 L91 76 L158 67 L225 52 L225 110 L25 110 Z" fill="url(#ctrAreaGrad)" />
                              <path d="M25 85 L91 76 L158 67 L225 52" fill="none" stroke="#B9783B" strokeWidth="2" strokeLinecap="round" />

                              <circle cx="25" cy="85" r="3" fill="#1E2124" stroke="#B9783B" strokeWidth="1.5" />
                              <circle cx="91" cy="76" r="3" fill="#1E2124" stroke="#B9783B" strokeWidth="1.5" />
                              <circle cx="158" cy="67" r="3" fill="#1E2124" stroke="#B9783B" strokeWidth="1.5" />
                              <circle cx="225" cy="52" r="3" fill="#1E2124" stroke="#B9783B" strokeWidth="1.5" />

                              <text x="25" y="77" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">1.8%</text>
                              <text x="91" y="68" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">2.1%</text>
                              <text x="158" y="59" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">2.4%</text>
                              <text x="225" y="44" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">2.9%</text>

                              <text x="25" y="121" fill="#D8C7AF" opacity="0.7" fontSize="7" textAnchor="middle">Wk 23</text>
                              <text x="91" y="121" fill="#D8C7AF" opacity="0.7" fontSize="7" textAnchor="middle">Wk 24</text>
                              <text x="158" y="121" fill="#D8C7AF" opacity="0.7" fontSize="7" textAnchor="middle">Wk 25</text>
                              <text x="225" y="121" fill="#D8C7AF" opacity="0.7" fontSize="7" textAnchor="middle">Wk 26</text>
                            </svg>
                          </div>
                        </div>

                        {/* Print & Affiliate Referral ledger table */}
                        <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Live Print &amp; Affiliate Referrals
                            </span>
                            <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6 }}>Last 5 Trips</span>
                          </div>
                          
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#D8C7AF', opacity: 0.7 }}>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Date</th>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Referrer</th>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Type</th>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Experience</th>
                                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {performanceBookings.filter(b => b.referredById).length === 0 ? (
                                  <tr>
                                    <td colSpan={5} style={{ padding: '1.5rem 0.5rem', fontStyle: 'italic', color: '#D8C7AF', opacity: 0.5, textAlign: 'center' }}>
                                      No affiliate referrals recorded. Create print collateral with QR Code attributions to start tracking.
                                    </td>
                                  </tr>
                                ) : (
                                  performanceBookings
                                    .filter(b => b.referredById)
                                    .slice(0, 5)
                                    .map((booking) => (
                                      <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#F4F1EA' }}>
                                        <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>
                                          {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>
                                          {getDashboardReferrerName(booking)}
                                        </td>
                                        <td style={{ padding: '0.4rem 0.5rem', textTransform: 'capitalize' }}>
                                          <span style={{ 
                                            display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                                            padding: '0.1rem 0.3rem', borderRadius: '3px',
                                            background: booking.referredByType === 'company' ? 'rgba(185,120,59,0.1)' : booking.referredByType === 'staff' ? 'rgba(112,140,132,0.1)' : booking.referredByType === 'location' ? 'rgba(95,158,160,0.1)' : 'rgba(212,175,55,0.1)',
                                            color: booking.referredByType === 'company' ? '#B9783B' : booking.referredByType === 'staff' ? '#708C84' : booking.referredByType === 'location' ? '#5F9EA0' : '#D4AF37',
                                            fontSize: '0.6rem'
                                          }}>
                                            {booking.referredByType === 'company' && <Building size={9} />}
                                            {booking.referredByType === 'staff' && <Users size={9} />}
                                            {booking.referredByType === 'location' && <MapPin size={9} />}
                                            {booking.referredByType === 'owner' && <Crown size={9} />}
                                            {booking.referredByType === 'company' ? 'Broker' : booking.referredByType || 'direct'}
                                          </span>
                                        </td>
                                        <td style={{ padding: '0.4rem 0.5rem', color: '#D8C7AF', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {booking.experienceTitle}
                                        </td>
                                        <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                                          ${booking.grandTotal?.toLocaleString() || '0'}
                                        </td>
                                      </tr>
                                    ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {isGenerating && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '350px', gap: '1rem' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw className="animate-spin" size={48} color="#B9783B" />
                    <Sparkles size={18} color="#D8C7AF" style={{ position: 'absolute', animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <strong style={{ fontSize: '1.15rem', color: 'white', display: 'block' }}>Synthesizing Creative Concepts...</strong>
                    <span style={{ fontSize: '0.72rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginTop: '0.35rem' }}>
                      Generating {selectedPersonas.length * selectedBookingWindows.length} Ad Set{(selectedPersonas.length * selectedBookingWindows.length) > 1 ? 's' : ''} in parallel
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, textAlign: 'center', maxWidth: '340px', lineHeight: '1.4' }}>
                    Fusing targeting vectors, local attractions, and audience insights. This process communicates with the AI models and may take up to 10–15 seconds to complete. Please keep this tab open.
                  </p>
                </div>
              )}

              {/* Active Bundles Workspace (Visible after generation) */}
              {bundles.length > 0 && !showDashboardOverride && activeBundle && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                  
                  {/* Dashboard toggle header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <button
                      onClick={() => setShowDashboardOverride(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#D8C7AF', padding: '0.45rem 0.85rem', borderRadius: '6px',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <ChevronLeft size={14} /> Back to Dashboard
                    </button>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          setDraftNameInput(draftNameInput || 'Summer Promo Campaign');
                          setIsSaveDraftModalOpen(true);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'transparent', border: '1px solid #708C84',
                          color: '#708C84', padding: '0.45rem 0.85rem', borderRadius: '6px',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(112,140,132,0.06)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Save size={14} /> Save Draft
                      </button>

                      <button
                        onClick={handleExportCopySheet}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#D8C7AF', padding: '0.45rem 0.85rem', borderRadius: '6px',
                          fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Download size={14} /> Export Copy Sheet
                      </button>
                    </div>
                  </div>
                  
                  {/* Target Ad Set Selector (Visible if multiple ad sets are generated) */}
                  {uniqueAdSets.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Target Ad Set:</span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {uniqueAdSets.map((adSetName) => (
                          <button
                            key={adSetName}
                            onClick={() => {
                              setActivePersonaFilter(adSetName);
                              // Select first bundle of this ad set
                              const firstIdx = bundles.findIndex(b => getBundleAdSetName(b) === adSetName);
                              if (firstIdx !== -1) setSelectedBundleIndex(firstIdx);
                            }}
                            style={{
                              padding: '0.35rem 0.75rem', border: '1px solid',
                              borderColor: activePersonaFilter === adSetName ? '#B9783B' : 'rgba(255,255,255,0.06)',
                              borderRadius: '4px', background: activePersonaFilter === adSetName ? 'rgba(185,120,59,0.15)' : 'rgba(0,0,0,0.2)',
                              color: activePersonaFilter === adSetName ? 'white' : '#D8C7AF',
                              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            🎯 {adSetName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Concept Selector Tabs (Filtered list) */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                    {filteredBundles.map((bundle, filteredIdx) => {
                      const mainIdx = bundles.findIndex(b => b === bundle);
                      const isSelected = selectedBundleIndex === mainIdx;
                      return (
                        <button
                          key={filteredIdx}
                          onClick={() => setSelectedBundleIndex(mainIdx)}
                          style={{
                            padding: '0.5rem 0.85rem', border: '1px solid',
                            borderColor: isSelected ? '#B9783B' : 'rgba(255,255,255,0.06)',
                            borderRadius: '6px', background: isSelected ? 'rgba(185,120,59,0.12)' : 'rgba(0,0,0,0.15)',
                            color: isSelected ? 'white' : '#D8C7AF',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Concept {filteredIdx + 1}: {bundle.conceptName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Splitscreen Workspace */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem', alignItems: 'stretch' }}>
                    
                    {/* Left Panel: Structured Copy Editor */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Rationale &amp; Status</span>
                        
                        {/* Status Select dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.8, fontWeight: 600 }}>Status:</span>
                          <select
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value as 'draft' | 'approved')}
                            style={{
                              background: '#121416',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              padding: '0.2rem 0.5rem',
                              color: draftStatus === 'approved' ? '#4ade80' : '#fbbf24',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="draft" style={{ color: '#fbbf24' }}>Draft</option>
                            <option value="approved" style={{ color: '#4ade80' }}>Approved</option>
                          </select>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#D8C7AF', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', lineHeight: '1.4' }}>
                        💡 {activeBundle.rationale}
                      </p>

                      {/* AI Copy Refinement Panel */}
                      <div style={{
                        background: 'rgba(217, 119, 6, 0.03)',
                        border: '1px dashed rgba(217, 119, 6, 0.25)',
                        borderRadius: '8px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Sparkles size={16} color="#d97706" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F1EA', letterSpacing: '0.02em' }}>
                            Refine or Refresh this Ad with AI
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.85, lineHeight: 1.4 }}>
                          Provide feedback to rewrite/tweak this specific ad (e.g. "make it more energetic", "focus on private dining options"), or click Refresh to regenerate a new copy angle.
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text"
                            placeholder="Add comments or instructions for AI..."
                            value={refineInstruction}
                            onChange={(e) => setRefineInstruction(e.target.value)}
                            disabled={isRefining}
                            style={{
                              flex: 1,
                              background: '#121416',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              padding: '0.5rem',
                              color: '#F4F1EA',
                              fontSize: '0.8rem',
                              outline: 'none'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRefineAd}
                            disabled={isRefining || !refineInstruction.trim()}
                            style={{
                              background: refineInstruction.trim() ? '#d97706' : 'rgba(255,255,255,0.05)',
                              color: refineInstruction.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: refineInstruction.trim() ? 'pointer' : 'not-allowed',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isRefining ? <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
                            Refine
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleRefineAdImmediate('Regenerate a completely new variation of this ad with a fresh creative hook.');
                            }}
                            disabled={isRefining}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              color: '#D8C7AF',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <RefreshCw size={12} />
                            Refresh
                          </button>
                        </div>
                      </div>

                      {/* META Platform Input Editor */}
                      {platform === 'meta' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.2s ease' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Ad Headline</label>
                            <input 
                              type="text"
                              value={activeBundle.headline || ''}
                              onChange={(e) => handleUpdateField('headline', e.target.value)}
                              style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                            />
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Hook Copy</label>
                            <input 
                              type="text"
                              value={activeBundle.hook || ''}
                              onChange={(e) => handleUpdateField('hook', e.target.value)}
                              style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Primary Body Text</label>
                            <textarea 
                              value={activeBundle.bodyCopy || ''}
                              onChange={(e) => handleUpdateField('bodyCopy', e.target.value)}
                              rows={5}
                              style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.8rem', lineHeight: '1.4' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* GOOGLE SEARCH Platform Input Editor */}
                      {platform === 'google-search' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                          
                          {/* Headlines Editor */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>RSA Headlines (Max 30 Chars)</label>
                              <button 
                                onClick={() => handleAddArrayElement('headlines')}
                                style={{ background: 'transparent', border: 'none', color: '#B9783B', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}
                              >
                                <Plus size={12} /> Add Headline
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                              {activeBundle.headlines?.map((headline, hIdx) => (
                                <div key={hIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  <input 
                                    type="text"
                                    maxLength={30}
                                    value={headline}
                                    onChange={(e) => handleUpdateArrayElement('headlines', hIdx, e.target.value)}
                                    style={{ flex: 1, background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                                  />
                                  <span style={{ fontSize: '0.65rem', color: headline.length > 30 ? '#ef4444' : '#D8C7AF', opacity: 0.6, width: '40px', textAlign: 'right' }}>
                                    {headline.length}/30
                                  </span>
                                  <button 
                                    onClick={() => handleRemoveArrayElement('headlines', hIdx)}
                                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Descriptions Editor */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Descriptions (Max 90 Chars)</label>
                              <button 
                                onClick={() => handleAddArrayElement('descriptions')}
                                style={{ background: 'transparent', border: 'none', color: '#B9783B', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}
                              >
                                <Plus size={12} /> Add Desc
                              </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                              {activeBundle.descriptions?.map((desc, dIdx) => (
                                <div key={dIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  <input 
                                    type="text"
                                    maxLength={90}
                                    value={desc}
                                    onChange={(e) => handleUpdateArrayElement('descriptions', dIdx, e.target.value)}
                                    style={{ flex: 1, background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                                  />
                                  <span style={{ fontSize: '0.65rem', color: desc.length > 90 ? '#ef4444' : '#D8C7AF', opacity: 0.6, width: '40px', textAlign: 'right' }}>
                                    {desc.length}/90
                                  </span>
                                  <button 
                                    onClick={() => handleRemoveArrayElement('descriptions', dIdx)}
                                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Keywords Manager */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Target Keywords</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: '#121416', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '110px', overflowY: 'auto' }}>
                                {activeBundle.keywords?.map((kw, kwIdx) => (
                                  <div key={kwIdx} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#F4F1EA' }}>• {kw}</span>
                                    <button onClick={() => handleRemoveArrayElement('keywords', kwIdx)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={10} /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Negative Keywords</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: '#121416', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', maxHeight: '110px', overflowY: 'auto' }}>
                                {activeBundle.negativeKeywords?.map((nkw, nkwIdx) => (
                                  <div key={nkwIdx} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#f87171' }}>• {nkw}</span>
                                    <button onClick={() => handleRemoveArrayElement('negativeKeywords', nkwIdx)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={10} /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GOOGLE PMAX Platform Input Editor */}
                      {platform === 'google-pmax' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                          {/* Headlines Editor */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>PMax Headlines (Max 30 Chars)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {activeBundle.headlines?.slice(0, 3).map((hl, hlIdx) => (
                                <input 
                                  key={hlIdx}
                                  type="text"
                                  maxLength={30}
                                  value={hl}
                                  onChange={(e) => handleUpdateArrayElement('headlines', hlIdx, e.target.value)}
                                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Long Headlines Editor */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Long Headlines (Max 90 Chars)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {activeBundle.longHeadlines?.slice(0, 2).map((lhl, lhlIdx) => (
                                <input 
                                  key={lhlIdx}
                                  type="text"
                                  maxLength={90}
                                  value={lhl}
                                  onChange={(e) => handleUpdateArrayElement('longHeadlines', lhlIdx, e.target.value)}
                                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Descriptions Editor */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Descriptions (Max 90 Chars)</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              {activeBundle.descriptions?.slice(0, 2).map((dsc, dscIdx) => (
                                <input 
                                  key={dscIdx}
                                  type="text"
                                  maxLength={90}
                                  value={dsc}
                                  onChange={(e) => handleUpdateArrayElement('descriptions', dscIdx, e.target.value)}
                                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Media Bindings Selection Card */}
                      {platform !== 'google-search' && (
                        <div style={{ 
                          border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', 
                          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem',
                          background: 'rgba(0,0,0,0.1)'
                        }}>
                          {(() => {
                            const boundMedias = activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : []);
                            return (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>
                                    Bind Campaign Media Assets ({boundMedias.length}/3)
                                  </span>
                                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {boundMedias.length < 3 && (
                                      <button 
                                        onClick={() => setIsMediaModalOpen(true)}
                                        style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', color: '#B9783B', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                      >
                                        <Plus size={12} /> Add Asset
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                        setImageEditorCurrentUrl(boundMedias[activeMediaIndex] || undefined);
                                        setIsImageEditorOpen(true);
                                      }}
                                      style={{ background: '#d97706', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                    >
                                      <Sparkles size={12} /> AI Image Studio
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setIsVideoBuilderOpen(true);
                                      }}
                                      style={{ background: '#7e22ce', border: 'none', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}
                                    >
                                      <Video size={12} /> AI Video Studio
                                    </button>
                                  </div>
                                </div>
                                
                                {boundMedias.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {boundMedias.map((mediaUrl, idx) => {
                                      const isActive = activeMediaIndex === idx;
                                      return (
                                        <div 
                                          key={idx} 
                                          onClick={() => setActiveMediaIndex(idx)}
                                          style={{ 
                                            display: 'flex', gap: '0.75rem', alignItems: 'center', 
                                            background: isActive ? 'rgba(185, 120, 59, 0.08)' : '#121416', 
                                            padding: '0.5rem', borderRadius: '6px', 
                                            border: isActive ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.04)', 
                                            minWidth: 0, cursor: 'pointer', transition: 'all 0.2s'
                                          }}
                                        >
                                          <img src={mediaUrl} alt={`Selected Asset ${idx + 1}`} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.72rem', color: isActive ? '#B9783B' : 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getCleanFileName(mediaUrl)}</div>
                                            <span style={{ fontSize: '0.65rem', color: '#708C84' }}>Variation {idx + 1} {isActive ? '(Active)' : ''}</span>
                                          </div>
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const updatedMedias = boundMedias.filter((_, i) => i !== idx);
                                              const updated = [...bundles];
                                              if (updated[selectedBundleIndex]) {
                                                // Clear this variation's aspect ratio overrides as well
                                                const currentRatios = updated[selectedBundleIndex].boundMediasByRatio || {};
                                                const newRatios = { ...currentRatios };
                                                delete newRatios[idx];
                                                
                                                updated[selectedBundleIndex] = {
                                                  ...updated[selectedBundleIndex],
                                                  boundMedias: updatedMedias,
                                                  boundMedia: updatedMedias[0] || undefined,
                                                  boundMediasByRatio: newRatios
                                                };
                                                setBundles(updated);
                                                if (activeMediaIndex >= updatedMedias.length) {
                                                  setActiveMediaIndex(Math.max(0, updatedMedias.length - 1));
                                                }
                                                showToast(`Media variation ${idx + 1} removed.`, 'info');
                                              }
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6 }}>No media bound. Default yacht placeholders will be shown in mockups.</span>
                                )}

                                {/* Aspect Ratio Specific Overrides & Batch Uploader */}
                                {boundMedias.length > 0 && (
                                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
                                      Variation {activeMediaIndex + 1} Aspect Ratios
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                      {(['feed_4_5', 'story_9_16', 'square_1_1'] as const).map((ratioKey) => {
                                        const label = ratioKey === 'feed_4_5' ? 'Feed (4:5)' : ratioKey === 'story_9_16' ? 'Story (9:16)' : 'Square (1:1)';
                                        const dimensions = ratioKey === 'feed_4_5' ? '1080×1350' : ratioKey === 'story_9_16' ? '1080×1920' : '1080×1080';
                                        const url = activeBundle.boundMediasByRatio?.[activeMediaIndex]?.[ratioKey];
                                        
                                        return (
                                          <div key={ratioKey} style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 0 }}>
                                            <span style={{ fontSize: '0.62rem', color: '#D8C7AF', fontWeight: 'bold' }}>{label}</span>
                                            <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.3rem' }}>{dimensions}</span>
                                            
                                            {url ? (
                                              <div style={{ position: 'relative', width: '100%', height: '42px', borderRadius: '4px', overflow: 'hidden', background: '#08080a', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                <button 
                                                  onClick={() => {
                                                    const updated = [...bundles];
                                                    if (updated[selectedBundleIndex]) {
                                                      const currentRatios = updated[selectedBundleIndex].boundMediasByRatio || {};
                                                      const variationRatios = { ...(currentRatios[activeMediaIndex] || {}) };
                                                      delete variationRatios[ratioKey];
                                                      
                                                      updated[selectedBundleIndex] = {
                                                        ...updated[selectedBundleIndex],
                                                        boundMediasByRatio: {
                                                          ...currentRatios,
                                                          [activeMediaIndex]: variationRatios
                                                        }
                                                      };
                                                      setBundles(updated);
                                                      showToast(`${label} ratio cleared.`, 'info');
                                                    }
                                                  }}
                                                  style={{ position: 'absolute', top: '0.1rem', right: '0.1rem', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: '#ef4444', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                                >
                                                  <X size={10} />
                                                </button>
                                              </div>
                                            ) : (
                                              <button 
                                                onClick={() => {
                                                  setActiveRatioSlotTarget({ variationIndex: activeMediaIndex, ratioKey });
                                                  setIsMediaModalOpen(true);
                                                }}
                                                style={{ width: '100%', background: '#1E2124', border: '1px dashed rgba(255,255,255,0.1)', color: '#B9783B', borderRadius: '4px', padding: '0.35rem 0', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}
                                                onMouseOver={e => e.currentTarget.style.borderColor = '#B9783B'}
                                                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                              >
                                                Select Image
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Batch Uploader drag/drop helper */}
                                    <div style={{ position: 'relative' }}>
                                      <label style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        background: '#121416', border: '1px dashed rgba(185, 120, 59, 0.3)', borderRadius: '6px',
                                        padding: '0.6rem 1rem', cursor: isBatchUploading ? 'default' : 'pointer', transition: 'all 0.2s',
                                        opacity: isBatchUploading ? 0.7 : 1
                                      }}>
                                        {isBatchUploading ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B9783B' }}>
                                            <RefreshCw size={12} className="animate-spin" />
                                            <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>{batchUploadStatus}</span>
                                          </div>
                                        ) : (
                                          <>
                                            <UploadCloud size={14} color="#B9783B" style={{ marginBottom: '0.2rem' }} />
                                            <span style={{ fontSize: '0.68rem', color: '#D8C7AF', fontWeight: 600 }}>Batch Upload Aspect Ratios</span>
                                            <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.1rem' }}>Auto-detects Feed, Story, or Square sizes</span>
                                          </>
                                        )}
                                        <input 
                                          type="file" 
                                          multiple 
                                          accept="image/*"
                                          disabled={isBatchUploading}
                                          onChange={handleBatchUploadRatioImages} 
                                          style={{ display: 'none' }} 
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Right Panel: Interactive Live Mockups */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.78rem', color: '#708C84', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Ad Mockup Preview</span>
                        
                        {/* Placement select sub-tabs */}
                        {platform === 'meta' && (
                          <div style={{ display: 'flex', background: '#121416', padding: '0.15rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <button onClick={() => setMetaPlacement('feed')} style={{ border: 'none', background: metaPlacement === 'feed' ? '#B9783B' : 'transparent', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}>FB Feed</button>
                            <button onClick={() => setMetaPlacement('story')} style={{ border: 'none', background: metaPlacement === 'story' ? '#B9783B' : 'transparent', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}>IG Story</button>
                          </div>
                        )}

                        {platform === 'google-pmax' && (
                          <div style={{ display: 'flex', background: '#121416', padding: '0.15rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <button onClick={() => setGooglePMaxPlacement('search')} style={{ border: 'none', background: googlePMaxPlacement === 'search' ? '#B9783B' : 'transparent', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}><Globe size={10} style={{marginRight: 2}}/> Search</button>
                            <button onClick={() => setGooglePMaxPlacement('maps')} style={{ border: 'none', background: googlePMaxPlacement === 'maps' ? '#B9783B' : 'transparent', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}><MapPin size={10} style={{marginRight: 2}}/> Maps</button>
                            <button onClick={() => setGooglePMaxPlacement('youtube')} style={{ border: 'none', background: googlePMaxPlacement === 'youtube' ? '#B9783B' : 'transparent', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer' }}><Video size={10} style={{marginRight: 2}}/> YouTube</button>
                          </div>
                        )}
                      </div>

                      {/* META MOCKUP RENDERING */}
                      {platform === 'meta' && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px' }}>
                          {metaPlacement === 'feed' ? (
                            /* Facebook Feed Mockup */
                            <div style={{ width: '100%', maxWidth: '340px', background: 'white', color: '#1c1e21', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontFamily: '-apple-system, BlinkMacSystemFont, Arial, sans-serif' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.8rem' }}>MYW</div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>Motor Yacht Whiskey</span>
                                  <span style={{ fontSize: '0.72rem', color: '#65676b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>Sponsored • 🌐</span>
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#050505', lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                {activeBundle.bodyCopy || 'Add primary body copy...'}
                              </p>
                              <div style={{ border: '1px solid #e5e5e5', borderRadius: '4px', overflow: 'hidden' }}>
                                <MockupMediaCarousel 
                                  boundMedias={activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : [])} 
                                  activeMediaIndex={activeMediaIndex}
                                  setActiveMediaIndex={setActiveMediaIndex}
                                  height="180px"
                                  contextText={adContextText}
                                  campaignName={activeBundle.conceptName}
                                  onSave={handleRefineMedia}
                                  boundMediasByRatio={activeBundle.boundMediasByRatio}
                                  ratioMode="feed_4_5"
                                />
                                <div style={{ background: '#f0f2f5', padding: '0.6rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#65676b', textTransform: 'uppercase' }}>mywhiskey.com</span>
                                    <strong style={{ fontSize: '0.85rem', color: '#1c1e21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBundle.headline || 'Add headline copy...'}</strong>
                                    <span style={{ fontSize: '0.72rem', color: '#65676b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>{activeBundle.hook || 'Add hook text...'}</span>
                                  </div>
                                  <button style={{ background: '#e4e6eb', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', color: '#4b4f56', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>Learn More</button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Instagram Story Mockup */
                            <div style={{ width: '220px', height: '390px', borderRadius: '12px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', fontFamily: '-apple-system, BlinkMacSystemFont, Arial, sans-serif' }}>
                              <MockupMediaCarousel 
                                boundMedias={activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : [])} 
                                activeMediaIndex={activeMediaIndex}
                                setActiveMediaIndex={setActiveMediaIndex}
                                height="100%"
                                contextText={adContextText}
                                campaignName={activeBundle.conceptName}
                                onSave={handleRefineMedia}
                                boundMediasByRatio={activeBundle.boundMediasByRatio}
                                ratioMode="story_9_16"
                              />
                              <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.4rem', alignItems: 'center', zIndex: 10 }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#B9783B', border: '1px solid white' }} />
                                <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>motoryachtwhiskey</span>
                              </div>
                              <div style={{ 
                                position: 'absolute', bottom: '0', left: '0', right: '0', 
                                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                                padding: '1rem 0.75rem 2rem 0.75rem', display: 'flex', flexDirection: 'column',
                                gap: '0.5rem', color: 'white', zIndex: 10
                              }}>
                                <strong style={{ fontSize: '0.85rem', textShadow: '0 1px 2px rgba(0,0,0,0.8)', lineHeight: '1.2' }}>{activeBundle.headline || 'Add headline...'}</strong>
                                <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.9, lineHeight: '1.3', textShadow: '0 1px 2px rgba(0,0,0,0.8)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                                  {activeBundle.hook || 'Add hook text...'}
                                </p>
                              </div>
                              <div style={{ position: 'absolute', bottom: '0.5rem', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', zIndex: 12 }}>
                                <span style={{ color: 'white', fontSize: '0.6rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Swipe Up to Book</span>
                                <span style={{ color: 'white', fontSize: '0.7rem' }}>▲</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* GOOGLE SEARCH MOCKUP RENDERING */}
                      {platform === 'google-search' && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', animation: 'fadeIn 0.2s ease' }}>
                          {/* Google SERP Search Ad Card */}
                          <div style={{ width: '100%', maxWidth: '420px', background: 'white', color: '#1a0dab', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'Arial, sans-serif' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#202124' }}>
                              <span>Ad</span>
                              <span>•</span>
                              <span style={{ color: '#202124' }}>https://mywhiskey.com/charters/{displayCity.toLowerCase()}</span>
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', lineHeight: '1.3', fontWeight: 'normal', color: '#1a0dab', textDecoration: 'hover underline', cursor: 'pointer' }}>
                              {activeBundle.headlines?.[0] || `Luxury Yacht Charters ${displayCity}`} | {activeBundle.headlines?.[1] || 'M/Y Whiskey Private Boat'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#4d5156', lineHeight: '1.4' }}>
                              {activeBundle.descriptions?.[0] || `Experience private luxury cruising on Motor Yacht Whiskey in ${displayCity} Harbor. Book online.`}{' '}
                              {activeBundle.descriptions?.[1] || 'Top rated captains, dynamic custom itineraries. Perfect for friends & family.'}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#1a0dab', marginTop: '0.4rem', borderTop: '1px solid #f1f3f4', paddingTop: '0.4rem' }}>
                              <span style={{ cursor: 'pointer' }}>Book Charter Slots</span>
                              <span style={{ cursor: 'pointer' }}>View Private Fleet</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GOOGLE PMAX MOCKUP RENDERING */}
                      {platform === 'google-pmax' && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', animation: 'fadeIn 0.2s ease' }}>
                          {googlePMaxPlacement === 'search' && (
                            /* PMax Search View */
                            <div style={{ width: '100%', maxWidth: '420px', background: 'white', color: '#202124', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'Arial, sans-serif' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#5f6368' }}>
                                <span>Sponsored</span>
                                <span>•</span>
                                <span>mywhiskey.com</span>
                              </div>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1a0dab', fontWeight: 'normal' }}>
                                {activeBundle.headlines?.[0] || 'Luxury Private Yacht Charters'} - {activeBundle.headlines?.[1] || 'Book Slots Instantly'}
                              </h3>
                              <p style={{ margin: 0, fontSize: '0.8rem', color: '#4d5156', lineHeight: '1.4' }}>
                                {activeBundle.descriptions?.[0] || 'Indulge in a premium yachting experience aboard M/Y Whiskey. Custom catering, snorkeling.'}
                              </p>
                            </div>
                          )}

                          {googlePMaxPlacement === 'maps' && (
                            /* PMax Maps Card view */
                            <div style={{ width: '260px', background: 'white', color: '#202124', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
                              <MockupMediaCarousel 
                                boundMedias={activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : [])} 
                                activeMediaIndex={activeMediaIndex}
                                setActiveMediaIndex={setActiveMediaIndex}
                                height="110px"
                                contextText={adContextText}
                                campaignName={activeBundle.conceptName}
                                onSave={handleRefineMedia}
                                boundMediasByRatio={activeBundle.boundMediasByRatio}
                                ratioMode="square_1_1"
                              />
                              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <strong style={{ fontSize: '0.85rem' }}>Motor Yacht Whiskey Charters</strong>
                                  <span style={{ background: '#e8f0fe', color: '#1a73e8', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.6rem', fontWeight: 'bold' }}>Ad</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#e57b00' }}>
                                  <span>5.0</span>
                                  <span>★★★★★</span>
                                  <span style={{ color: '#5f6368' }}>(48 reviews)</span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: '#5f6368' }}>Yacht Charter Service • {displayCity} Harbor</span>
                                <strong style={{ fontSize: '0.72rem', color: '#1e8e3e', marginTop: '0.1rem' }}>
                                  {activeBundle.headlines?.[0] || 'Private sunset & sandbar cruises'}
                                </strong>
                              </div>
                            </div>
                          )}

                          {googlePMaxPlacement === 'youtube' && (
                            /* PMax YouTube View */
                            <div style={{ width: '320px', height: '180px', borderRadius: '6px', overflow: 'hidden', position: 'relative', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', fontFamily: 'Arial, sans-serif' }}>
                              <MockupMediaCarousel 
                                boundMedias={activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : [])} 
                                activeMediaIndex={activeMediaIndex}
                                setActiveMediaIndex={setActiveMediaIndex}
                                height="100%"
                                contextText={adContextText}
                                campaignName={activeBundle.conceptName}
                                onSave={handleRefineMedia}
                                boundMediasByRatio={activeBundle.boundMediasByRatio}
                                ratioMode="feed_4_5"
                              />
                              
                              {/* Bottom overlay ad details */}
                              <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.85)', padding: '0.5rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', minWidth: 0 }}>
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#B9783B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '0.65rem', flexShrink: 0 }}>MYW</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <strong style={{ fontSize: '0.72rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBundle.headlines?.[0] || 'Luxury Private Yacht Charter'}</strong>
                                    <span style={{ fontSize: '0.6rem', color: '#cccccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeBundle.longHeadlines?.[0] || `Cruising ${displayCity} waters onboard Motor Yacht Whiskey.`}</span>
                                  </div>
                                </div>
                                <button style={{ background: '#f1c40f', border: 'none', color: '#111', padding: '0.35rem 0.6rem', borderRadius: '3px', fontSize: '0.65rem', fontWeight: 'bold', flexShrink: 0, cursor: 'pointer' }}>Book Now</button>
                              </div>

                              {/* YouTube Skip Ad Overlay */}
                              <div style={{ position: 'absolute', right: 0, top: '40%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRight: 'none', padding: '0.3rem 0.5rem', color: 'white', fontSize: '0.65rem', borderRadius: '3px 0 0 3px' }}>
                                Skip Ad in 5s
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* API Actions */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button 
                      onClick={() => showToast('Campaign saved to drafts locally.', 'info')}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Save Draft
                    </button>
                    
                    <button 
                      onClick={() => {
                        setPublishCopy(activeBundle.bodyCopy || activeBundle.headline || (activeBundle.headlines ? activeBundle.headlines[0] : '') || '');
                        setPublishChannel('facebook');
                        setPublishSuccessMessage(null);
                        setPublishErrorMessage(null);
                        setIsPublishModalOpen(true);
                      }}
                      style={{ background: '#708C84', border: 'none', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#587069'}
                      onMouseOut={e => e.currentTarget.style.background = '#708C84'}
                    >
                      <Share2 size={16} /> Publish Campaign
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* Tab CONTENT: Customer Personas */}
      {activeTab === 'personas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'stretch' }}>
            
            {/* Personas Directory Card Grid */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0 }}>Baseline Marketing Personas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {personas.map((persona) => (
                  <div key={persona.id} style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', position: 'relative' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem', color: '#B9783B' }}>{persona.name}</strong>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8, lineHeight: '1.4' }}>{persona.description}</p>
                    </div>
                    {persona.id.startsWith('custom-') && (
                      <button 
                        onClick={() => handleDeletePersona(persona.id)}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Persona Brainstormer Drawer */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0 }}>Add Custom Persona</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Persona Name</label>
                <input 
                  type="text" 
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="e.g. Luxury Honeymooners"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Targeting Description</label>
                <textarea 
                  value={newPersonaDesc}
                  onChange={(e) => setNewPersonaDesc(e.target.value)}
                  rows={4}
                  placeholder="Detail demographic traits, yacht amenities preferred, interest hooks, etc..."
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', resize: 'none', fontSize: '0.8rem', lineHeight: '1.4' }}
                />
              </div>

              <button 
                onClick={handleAddPersona}
                style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.6rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = '#a1652e'}
                onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
              >
                <Plus size={14} /> Add Persona Definition
              </button>

              <button 
                onClick={handleSaveSettings}
                disabled={saveStatus === 'saving'}
                style={{ 
                  background: 'transparent', border: '1px solid #708C84', color: '#708C84', 
                  padding: '0.6rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', 
                  cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(112,140,132,0.1)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Save size={14} /> Save Personas to DB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT: Prompt Settings */}
      {activeTab === 'settings' && (
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', margin: 0 }}>Prompt & API Configurations</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.8 }}>Manage system prompts used for AI generation models and configure Gemini API settings.</p>
            </div>
            <button 
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', opacity: saveStatus === 'saving' ? 0.7 : 1, transition: 'all 0.2s' }}
              onMouseOver={e => { if(saveStatus !== 'saving') e.currentTarget.style.background = '#a1652e'; }}
              onMouseOut={e => { if(saveStatus !== 'saving') e.currentTarget.style.background = '#B9783B'; }}
            >
              <Save size={16} /> {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* API Key */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'white', fontWeight: 600 }}>Gemini API Secret Key</label>
            <input 
              type="password" 
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', width: '100%', maxWidth: '400px', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6 }}>Leave blank to fall back to the environment variable <code>GEMINI_API_KEY</code> configured on the server hosting the site.</span>
          </div>
 
          {/* Facebook Page Credentials */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#B9783B', margin: 0 }}>Facebook Page Organic Publishing</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Facebook Page ID</label>
                <input 
                  type="text" 
                  value={fbPageIdInput}
                  onChange={(e) => setFbPageIdInput(e.target.value)}
                  placeholder="e.g. 10485763920194"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Facebook Page Access Token</label>
                <input 
                  type="password" 
                  value={fbPageTokenInput}
                  onChange={(e) => setFbPageTokenInput(e.target.value)}
                  placeholder="EAAB..."
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6 }}>These credentials are used by the organic publisher API to schedule and publish feeds to Facebook and Instagram. Get these tokens in the Facebook Developer Portal.</span>
          </div>

          {/* Meta Paid Ads Connections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#B9783B', margin: 0 }}>Meta Marketing API Connections (Paid Campaigns)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Ad Account ID</label>
                <input 
                  type="text" 
                  value={metaAdAccountIdInput}
                  onChange={(e) => setMetaAdAccountIdInput(e.target.value)}
                  placeholder="e.g. act_1234567890"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Marketing API Access Token</label>
                <input 
                  type="password" 
                  value={metaDeveloperTokenInput}
                  onChange={(e) => setMetaDeveloperTokenInput(e.target.value)}
                  placeholder="EAA..."
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6 }}>These credentials allow creating Meta campaigns, ad sets, creatives, and ads automatically. Bypasses Graph API simulation if provided.</span>
          </div>

          {/* Google Ads Connections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#B9783B', margin: 0 }}>Google Ads API Connections (Paid Campaigns)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Google Customer ID</label>
                <input 
                  type="text" 
                  value={googleCustomerIdInput}
                  onChange={(e) => setGoogleCustomerIdInput(e.target.value)}
                  placeholder="e.g. 123-456-7890"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Developer Token</label>
                <input 
                  type="password" 
                  value={googleDeveloperTokenInput}
                  onChange={(e) => setGoogleDeveloperTokenInput(e.target.value)}
                  placeholder="Developer Token"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>OAuth Client ID</label>
                <input 
                  type="text" 
                  value={googleClientIdInput}
                  onChange={(e) => setGoogleClientIdInput(e.target.value)}
                  placeholder="Client ID"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>OAuth Client Secret</label>
                <input 
                  type="password" 
                  value={googleClientSecretInput}
                  onChange={(e) => setGoogleClientSecretInput(e.target.value)}
                  placeholder="Client Secret"
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>OAuth Refresh Token</label>
                <input 
                  type="password" 
                  value={googleRefreshTokenInput}
                  onChange={(e) => setGoogleRefreshTokenInput(e.target.value)}
                  placeholder="1//0..."
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6 }}>These OAuth credentials allow generating transient access tokens to publish Google Search RSA & PMax campaigns. Bypasses simulation if completed.</span>
          </div>

          {/* Prompts Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#B9783B', margin: 0 }}>System Prompts Customization</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Meta Ads Prompt Template</label>
              <textarea 
                value={settings.metaPrompt}
                onChange={(e) => setSettings({ ...settings, metaPrompt: e.target.value })}
                rows={7}
                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: '1.4' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Google Responsive Search Ads (RSA) Prompt Template</label>
              <textarea 
                value={settings.googleSearchPrompt}
                onChange={(e) => setSettings({ ...settings, googleSearchPrompt: e.target.value })}
                rows={7}
                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: '1.4' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>Google Performance Max (PMax) Prompt Template</label>
              <textarea 
                value={settings.googlePMaxPrompt}
                onChange={(e) => setSettings({ ...settings, googlePMaxPrompt: e.target.value })}
                rows={7}
                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: '1.4' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab CONTENT: Ad Performance Tracker */}
      {activeTab === 'performance' && (
        <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>Meta Ads Performance Tracker</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.8 }}>Monitor real-time performance of running creatives on Meta Ads Manager and manage lifecycle status.</p>
            </div>
            <button 
              onClick={fetchPerformanceAds}
              disabled={isLoadingPerformance}
              style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => { if(!isLoadingPerformance) e.currentTarget.style.background = '#a1652e'; }}
              onMouseOut={e => { if(!isLoadingPerformance) e.currentTarget.style.background = '#B9783B'; }}
            >
              <RefreshCw className={isLoadingPerformance ? "animate-spin" : ""} size={14} /> 
              {isLoadingPerformance ? 'Refreshing...' : 'Refresh Metrics'}
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={performanceFilter.active}
                  onChange={(e) => setPerformanceFilter({ ...performanceFilter, active: e.target.checked })}
                  style={{ accentColor: '#B9783B' }}
                />
                Active Ads
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={performanceFilter.paused}
                  onChange={(e) => setPerformanceFilter({ ...performanceFilter, paused: e.target.checked })}
                  style={{ accentColor: '#B9783B' }}
                />
                Paused Ads
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={performanceFilter.stopped}
                  onChange={(e) => setPerformanceFilter({ ...performanceFilter, stopped: e.target.checked })}
                  style={{ accentColor: '#B9783B' }}
                />
                Stopped / Archived
              </label>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6 }}>
              {(() => {
                const filteredList = performanceAds.filter(ad => {
                  const isActive = ad.status === 'ACTIVE';
                  const isPaused = ad.status === 'PAUSED';
                  const isStopped = !isActive && !isPaused;
                  if (isActive && performanceFilter.active) return true;
                  if (isPaused && performanceFilter.paused) return true;
                  if (isStopped && performanceFilter.stopped) return true;
                  return false;
                });
                return `Showing ${filteredList.length} of ${performanceAds.length} ads`;
              })()}
            </div>
          </div>

          {/* Performance Table */}
          {isLoadingPerformance && performanceAds.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
              <RefreshCw className="animate-spin" size={28} color="#B9783B" />
              <span style={{ fontSize: '0.85rem', color: '#D8C7AF' }}>Querying Meta Ads Graph API...</span>
            </div>
          ) : (() => {
            const filteredList = performanceAds.filter(ad => {
              const isActive = ad.status === 'ACTIVE';
              const isPaused = ad.status === 'PAUSED';
              const isStopped = !isActive && !isPaused;
              if (isActive && performanceFilter.active) return true;
              if (isPaused && performanceFilter.paused) return true;
              if (isStopped && performanceFilter.stopped) return true;
              return false;
            });

            if (filteredList.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '3rem 0', background: 'rgba(0,0,0,0.1)', border: '1px dashed rgba(255,255,255,0.04)', borderRadius: '6px', color: '#D8C7AF', fontSize: '0.85rem' }}>
                  No running ads found matching the selected filters.
                </div>
              );
            }

            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#D8C7AF', opacity: 0.8 }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ad Creative Name</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Impressions</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Clicks</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>CTR</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Spend</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>CPC</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Lifecycle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.map((ad) => {
                      const isMutating = statusMutatingAdId === ad.id;
                      const isAdActive = ad.status === 'ACTIVE';
                      const isAdPaused = ad.status === 'PAUSED';

                      return (
                        <tr key={ad.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{ad.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.2rem' }}>
                              Campaign: {ad.campaignName} &bull; Ad Set: {ad.adsetName}
                            </div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ 
                              display: 'inline-flex', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                              background: isAdActive ? 'rgba(74, 222, 128, 0.08)' : isAdPaused ? 'rgba(251, 146, 60, 0.08)' : 'rgba(255,255,255,0.05)',
                              color: isAdActive ? '#4ade80' : isAdPaused ? '#fb923c' : '#9ca3af',
                              border: `1px solid ${isAdActive ? 'rgba(74, 222, 128, 0.2)' : isAdPaused ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255,255,255,0.1)'}`
                            }}>
                              {ad.status}
                            </span>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: '#F4F1EA' }}>{ad.impressions.toLocaleString()}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: '#F4F1EA' }}>{ad.clicks.toLocaleString()}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: '#B9783B', fontWeight: 600 }}>{ad.ctr.toFixed(2)}%</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: '#F4F1EA' }}>${ad.spend.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: '#F4F1EA' }}>${ad.cpc.toFixed(2)}</td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                              {(isAdActive || isAdPaused) ? (
                                <button
                                  onClick={() => handleToggleAdStatus(ad.id, ad.status)}
                                  disabled={isMutating}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: isAdActive ? '#fb923c' : '#4ade80',
                                    cursor: isMutating ? 'not-allowed' : 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '4px',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    opacity: isMutating ? 0.5 : 1
                                  }}
                                  title={isAdActive ? "Pause Ad" : "Resume Ad"}
                                  onMouseOver={e => { if(!isMutating) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                  onMouseOut={e => { if(!isMutating) e.currentTarget.style.background = 'transparent'; }}
                                >
                                  {isMutating ? (
                                    <RefreshCw className="animate-spin" size={14} />
                                  ) : isAdActive ? (
                                    <Pause size={14} />
                                  ) : (
                                    <Play size={14} />
                                  )}
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.4 }}>N/A</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* Asset Library Dialog Modal */}
      <AssetLibraryModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => {
          if (activeRatioSlotTarget) {
            const { variationIndex, ratioKey } = activeRatioSlotTarget;
            const updated = [...bundles];
            if (updated[selectedBundleIndex]) {
              const currentRatios = updated[selectedBundleIndex].boundMediasByRatio || {};
              const variationRatios = currentRatios[variationIndex] || {};
              
              updated[selectedBundleIndex] = {
                ...updated[selectedBundleIndex],
                boundMediasByRatio: {
                  ...currentRatios,
                  [variationIndex]: {
                    ...variationRatios,
                    [ratioKey]: url
                  }
                }
              };
              setBundles(updated);
              showToast(`Asset bound to Variation ${variationIndex + 1} ${ratioKey.replace('_', ' ')} slot.`, 'success');
            }
            setActiveRatioSlotTarget(null);
            setIsMediaModalOpen(false);
            return;
          }
          const currentMedias = activeBundle?.boundMedias || (activeBundle?.boundMedia ? [activeBundle.boundMedia] : []);
          if (currentMedias.length >= 3) {
            showToast('You can bind a maximum of 3 media assets per bundle.', 'error');
            return;
          }
          const updatedMedias = [...currentMedias, url];
          const updated = [...bundles];
          if (updated[selectedBundleIndex]) {
            updated[selectedBundleIndex] = {
              ...updated[selectedBundleIndex],
              boundMedias: updatedMedias,
              boundMedia: updatedMedias[0]
            };
            setBundles(updated);
            setActiveMediaIndex(updatedMedias.length - 1); // Focus preview on the new variation
          }
          setIsMediaModalOpen(false);
          showToast(`Media variation ${updatedMedias.length} bound to ad concept mockup.`, 'success');
        }}
      />

      {/* Vertex AI Imagen 3 Sandbox Modal */}
      {isImageEditorOpen && activeBundle && (
        <AIImageEditor
          currentImageUrl={imageEditorCurrentUrl}
          contextText={adContextText}
          onClose={() => {
            setIsImageEditorOpen(false);
            setImageEditorCurrentUrl(undefined);
          }}
          onSelectImage={(url) => {
            // Auto-detect ratio of the AI generated image and assign to the correct slot
            const img = new Image();
            img.onload = () => {
              const width = img.naturalWidth;
              const height = img.naturalHeight;
              const ratio = height / width;
              
              let ratioKey: 'feed_4_5' | 'story_9_16' | 'square_1_1' = 'square_1_1';
              if (ratio >= 1.4) {
                ratioKey = 'story_9_16';
              } else if (ratio >= 1.15) {
                ratioKey = 'feed_4_5';
              }
              
              const updated = [...bundles];
              if (updated[selectedBundleIndex]) {
                const currentRatios = updated[selectedBundleIndex].boundMediasByRatio || {};
                const variationRatios = { ...(currentRatios[activeMediaIndex] || {}) };
                variationRatios[ratioKey] = url;
                
                updated[selectedBundleIndex] = {
                  ...updated[selectedBundleIndex],
                  boundMediasByRatio: {
                    ...currentRatios,
                    [activeMediaIndex]: variationRatios
                  }
                };
                setBundles(updated);
              }
            };
            img.src = url;

            const currentMedias = activeBundle?.boundMedias || (activeBundle?.boundMedia ? [activeBundle.boundMedia] : []);
            const updated = [...bundles];
            if (updated[selectedBundleIndex]) {
              let updatedMedias = [...currentMedias];
              if (currentMedias.length >= 3) {
                // Replace current variation
                updatedMedias[activeMediaIndex] = url;
                showToast('Current media variation replaced with AI creative.', 'success');
              } else {
                // Append as new variation
                updatedMedias = [...currentMedias, url];
                setActiveMediaIndex(updatedMedias.length - 1);
                showToast('New AI creative bound to campaign.', 'success');
              }
              updated[selectedBundleIndex] = {
                ...updated[selectedBundleIndex],
                boundMedias: updatedMedias,
                boundMedia: updatedMedias[0]
              };
              setBundles(updated);
            }
            setIsImageEditorOpen(false);
            setImageEditorCurrentUrl(undefined);
          }}
        />
      )}

      {/* Vertex AI Video Studio Modal */}
      {isVideoBuilderOpen && activeBundle && (
        <AIVideoBuilder
          initialCampaignName={activeBundle.conceptName}
          contextText={adContextText}
          onClose={() => {
            setIsVideoBuilderOpen(false);
          }}
          onSelectVideo={(url) => {
            const currentMedias = activeBundle?.boundMedias || (activeBundle?.boundMedia ? [activeBundle.boundMedia] : []);
            const updated = [...bundles];
            if (updated[selectedBundleIndex]) {
              let updatedMedias = [...currentMedias];
              if (currentMedias.length >= 3) {
                // Replace current variation
                updatedMedias[activeMediaIndex] = url;
                showToast('Current media variation replaced with AI ad video.', 'success');
              } else {
                // Append as new variation
                updatedMedias = [...currentMedias, url];
                setActiveMediaIndex(updatedMedias.length - 1);
                showToast('New AI ad video bound to campaign.', 'success');
              }
              updated[selectedBundleIndex] = {
                ...updated[selectedBundleIndex],
                boundMedias: updatedMedias,
                boundMedia: updatedMedias[0]
              };
              setBundles(updated);
            }
          }}
        />
      )}



      {/* Save Draft Dialog Modal */}
      {isSaveDraftModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>Save Campaign Draft</h3>
            
            <form onSubmit={handleSaveDraft} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Campaign Name</label>
                <input 
                  type="text" 
                  value={draftNameInput}
                  onChange={(e) => setDraftNameInput(e.target.value)}
                  placeholder="e.g. Summer Weekend Vacancy"
                  required
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Draft Status</label>
                <select 
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value as any)}
                  style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="draft">Draft (Editing in progress)</option>
                  <option value="approved">Approved (Ready for publishing)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button"
                  onClick={() => setIsSaveDraftModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Load Drafts Dialog Modal */}
      {isLoadDraftModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif" }}>Load Campaign Drafts</h3>
              <button 
                onClick={() => setIsLoadDraftModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', color: '#D8C7AF', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.75rem' }}>Campaign Name</th>
                    <th style={{ padding: '0.75rem' }}>Platform</th>
                    <th style={{ padding: '0.75rem' }}>Saved Date</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedDrafts.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#D8C7AF', opacity: 0.6, fontStyle: 'italic' }}>
                        No saved campaign drafts found.
                      </td>
                    </tr>
                  ) : (
                    savedDrafts.map((draft) => (
                      <tr key={draft.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#F4F1EA' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{draft.name}</td>
                        <td style={{ padding: '0.75rem', textTransform: 'capitalize' }}>
                          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: '#D8C7AF' }}>
                            {draft.platform === 'meta' ? 'Meta' : draft.platform === 'google-search' ? 'Google Search' : 'Google PMax'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>
                          {draft.createdAt ? new Date(draft.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Unknown'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ 
                            fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '4px',
                            background: draft.status === 'approved' ? 'rgba(74,222,128,0.1)' : 'rgba(251,191,36,0.1)',
                            color: draft.status === 'approved' ? '#4ade80' : '#fbbf24'
                          }}>
                            {draft.status === 'approved' ? 'Approved' : 'Draft'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                              onClick={() => handleLoadDraft(draft)}
                              style={{ background: '#708C84', border: 'none', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDeleteDraft(draft.id)}
                              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '0.25rem' }}
                              title="Delete Draft"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setIsLoadDraftModalOpen(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publisher Dialog Modal */}
      {isPublishModalOpen && activeBundle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '1.75rem', width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'white', margin: 0, fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.02em' }}>Publish Campaign Concept</h3>
              <button 
                onClick={() => setIsPublishModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#D8C7AF', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
              >
                &times;
              </button>
            </div>

            {/* Error Message */}
            {publishErrorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{publishErrorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {publishSuccessMessage && (
              <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{publishSuccessMessage}</span>
              </div>
            )}

            {!publishSuccessMessage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Channel Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Target Channel</label>
                  <select 
                    value={publishChannel}
                    onChange={(e) => setPublishChannel(e.target.value as any)}
                    style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.6rem', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                  >
                    <option value="facebook">Facebook Page Feed (Organic Post)</option>
                    <option value="meta_ads">Meta Ads Manager (Paid Campaign)</option>
                    <option value="google_search">Google Search Ads RSA (Paid Campaign)</option>
                    <option value="google_pmax">Google Performance Max (Paid Campaign)</option>
                  </select>
                </div>

                {/* Paid Ad Parameters */}
                {publishChannel !== 'facebook' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paid Campaign Budget & Targeting</span>
                    
                    {publishChannel === 'meta_ads' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', marginBottom: '0.25rem' }}>
                        <label style={{ fontSize: '0.72rem', color: '#D8C7AF', fontWeight: 600 }}>Campaign Structure Mode</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="campaignMode" 
                              value="new" 
                              checked={campaignMode === 'new'} 
                              onChange={() => setCampaignMode('new')} 
                            />
                            Create New Campaign & Ad Set
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'white', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="campaignMode" 
                              value="consolidated" 
                              checked={campaignMode === 'consolidated'} 
                              onChange={() => setCampaignMode('consolidated')} 
                            />
                            Add to Existing (Recommended for Andromeda)
                          </label>
                        </div>
                      </div>
                    )}

                    {publishChannel === 'meta_ads' && campaignMode === 'consolidated' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#B9783B', fontWeight: 600 }}>Select Target Evergreen Structure</span>
                        {isCampaignsLoading ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#D8C7AF' }}>
                            <RefreshCw className="animate-spin" size={12} style={{ marginRight: '0.25rem' }} /> Loading campaigns and adsets from Meta...
                          </div>
                        ) : campaignsList.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: '#f87171' }}>
                            No active campaigns found. Please create a campaign first or use "Create New Campaign".
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <label style={{ fontSize: '0.68rem', color: '#D8C7AF' }}>Campaign</label>
                              <select
                                value={selectedCampaignId}
                                onChange={(e) => {
                                  setSelectedCampaignId(e.target.value);
                                  const camp = campaignsList.find(c => c.id === e.target.value);
                                  if (camp && camp.adsets && camp.adsets.length > 0) {
                                    setSelectedAdSetId(camp.adsets[0].id);
                                  } else {
                                    setSelectedAdSetId('');
                                  }
                                }}
                                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem', color: '#F4F1EA', fontSize: '0.75rem', outline: 'none' }}
                              >
                                {campaignsList.map((camp: any) => (
                                  <option key={camp.id} value={camp.id}>{camp.name}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <label style={{ fontSize: '0.68rem', color: '#D8C7AF' }}>Ad Set</label>
                              <select
                                value={selectedAdSetId}
                                onChange={(e) => setSelectedAdSetId(e.target.value)}
                                style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem', color: '#F4F1EA', fontSize: '0.75rem', outline: 'none' }}
                              >
                                {(() => {
                                  const camp = campaignsList.find(c => c.id === selectedCampaignId);
                                  const adsets = camp?.adsets || [];
                                  if (adsets.length === 0) {
                                    return <option value="">No active ad sets</option>;
                                  }
                                  return adsets.map((adset: any) => (
                                    <option key={adset.id} value={adset.id}>{adset.name}</option>
                                  ));
                                })()}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!(publishChannel === 'meta_ads' && campaignMode === 'consolidated') && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Daily Budget ($USD)</label>
                          <input 
                            type="number" 
                            min={5}
                            max={500}
                            value={dailyBudget}
                            onChange={(e) => setDailyBudget(Number(e.target.value) || 25)}
                            style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                          />
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Duration (Days)</label>
                          <input 
                            type="number" 
                            min={1}
                            max={90}
                            value={durationDays}
                            onChange={(e) => setDurationDays(Number(e.target.value) || 7)}
                            style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>
                    )}

                    {!(publishChannel === 'meta_ads' && campaignMode === 'consolidated') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.7rem', color: '#D8C7AF', fontWeight: 600 }}>Audience Targeting Preset</label>
                        <select 
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.5rem', color: '#F4F1EA', outline: 'none', fontSize: '0.8rem' }}
                        >
                          <option value="tourists">In-Region Destin/Sandestin Tourists (15mi radius)</option>
                          <option value="couples">Romance & Couples - National Travelers</option>
                          <option value="corporate">Corporate Event Planners & Executives</option>
                        </select>
                      </div>
                    )}

                    {/* UTM URL Generator Preview */}
                    {(() => {
                      const utmSource = publishChannel === 'meta_ads' ? 'meta' : 'google';
                      const campaignSlug = (activeBundle.conceptName || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '_');
                      const generatedUrl = `https://motoryachtwhiskey.com/bookings?utm_source=${utmSource}&utm_medium=cpc&utm_campaign=${campaignSlug}`;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                          <span style={{ fontSize: '0.65rem', color: '#D8C7AF', opacity: 0.6 }}>Auto-Generated Campaign URL (UTM tracking):</span>
                          <span style={{ fontSize: '0.68rem', color: '#B9783B', wordBreak: 'break-all', fontFamily: 'monospace' }}>{generatedUrl}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Media Preview Box */}
                {(publishChannel === 'facebook' || publishChannel === 'meta_ads' || publishChannel === 'google_pmax') && (() => {
                  const boundMedias = activeBundle.boundMedias || (activeBundle.boundMedia ? [activeBundle.boundMedia] : []);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.75rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase' }}>Attached Media Assets ({boundMedias.length})</label>
                      {boundMedias.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                          {boundMedias.map((url, idx) => (
                            <img key={idx} src={url} alt={`Preview ${idx + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                          ))}
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(239, 68, 68, 0.04)', border: '1px dashed rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertTriangle size={14} />
                          <span>No media attached. Post will be published as text-only.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Copy / Message Section */}
                {publishChannel === 'facebook' || publishChannel === 'meta_ads' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#D8C7AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Message / Body Copy</label>
                    <textarea 
                      value={publishCopy}
                      onChange={(e) => setPublishCopy(e.target.value)}
                      rows={6}
                      style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem', color: '#F4F1EA', outline: 'none', resize: 'vertical', fontSize: '0.82rem', lineHeight: '1.45' }}
                      placeholder="Provide feed copy..."
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '0.78rem', color: '#D8C7AF', lineHeight: '1.4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'white', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <Globe size={14} color="#B9783B" /> Google Asset Group Serialization
                    </div>
                    <span>The following dynamic creative resources will be serialized and pushed to Google Ads:</span>
                    <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {activeBundle.headlines && <li><strong>Headlines ({activeBundle.headlines.length}):</strong> {activeBundle.headlines.slice(0, 3).join(', ')}...</li>}
                      {activeBundle.longHeadlines && activeBundle.longHeadlines.length > 0 && <li><strong>Long Headlines ({activeBundle.longHeadlines.length}):</strong> {activeBundle.longHeadlines.join(', ')}</li>}
                      {activeBundle.descriptions && <li><strong>Descriptions ({activeBundle.descriptions.length}):</strong> {activeBundle.descriptions.slice(0, 2).join(', ')}...</li>}
                      {activeBundle.keywords && activeBundle.keywords.length > 0 && <li><strong>Target Keywords ({activeBundle.keywords.length}):</strong> {activeBundle.keywords.join(', ')}</li>}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => setIsPublishModalOpen(false)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#D8C7AF', padding: '0.5rem 1.25rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePublishCampaign}
                    disabled={isPublishing}
                    style={{ 
                      background: '#708C84', border: 'none', color: 'white', padding: '0.5rem 1.5rem', 
                      borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isPublishing ? 0.7 : 1
                    }}
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="animate-spin" size={14} /> Publishing...
                      </>
                    ) : (
                      <>
                        <Share2 size={14} /> Confirm &amp; Publish Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => setIsPublishModalOpen(false)}
                  style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.55rem 1.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Dismiss Dialog
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
