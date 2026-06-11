'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  getContentItem, saveContentItem, getContentTypeConfigs, getContentItems,
  ContentItem, ContentTypeConfig, loadIncludedItems, saveIncludedItems, IncludedItemConfig,
  loadAddonProducts, AddonProduct, saveAssetBlackout, getAssetBlackouts, deleteAssetBlackout, AssetBlackout
} from '@/lib/db';
import { 
  Anchor, Compass, Ship, Users, Sliders, ChevronLeft, ChevronRight, Clock, 
  Save, Loader2, Image as ImageIcon, MapPin, Plus, Trash2, X, ArrowUp, ArrowDown,
  AlertCircle, Eye, FileText, Film, EyeOff, UploadCloud, ExternalLink,
  Utensils, GlassWater, Wifi, Music, Shield, DollarSign, Waves, Fuel, Check, Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';
import { uploadFile } from '@/lib/storage';
import ReactMarkdown from 'react-markdown';
import { firebaseConfig } from '@/lib/firebase';

const DatePicker = ({ 
  value, 
  onChange, 
  placeholder = 'Select Date' 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, 1);
    }
    return new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();

  const days: Array<number | null> = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= numDays; d++) {
    days.push(d);
  }

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}/${d}/${y}`;
  };

  const selectDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = () => setIsOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  return (
    <div 
      style={{ position: 'relative', width: '100%' }}
      onClick={e => e.stopPropagation()}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          padding: '0.75rem', 
          background: '#121416', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '6px', 
          color: value ? 'white' : '#D8C7AF', 
          opacity: value ? 1 : 0.5,
          fontSize: '0.875rem', 
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '45px',
          boxSizing: 'border-box'
        }}
      >
        <span>{value ? formatDateDisplay(value) : placeholder}</span>
        <Calendar size={16} color="#B9783B" />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          background: '#1E2124',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '0.75rem',
          zIndex: 1000,
          width: '260px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          color: 'white',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
              style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
              style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem', textAlign: 'center', marginBottom: '0.25rem' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, fontWeight: 600 }}>{d}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.2rem' }}>
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dStr;
              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    border: 'none',
                    background: isSelected ? '#B9783B' : 'transparent',
                    color: isSelected ? 'white' : '#D8C7AF',
                    padding: '0.35rem 0',
                    borderRadius: '4px',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: isSelected ? 700 : 500
                  }}
                  onMouseOver={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function ContentItemEditor({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = use(params);
  const isNew = id === 'new';
  const { user } = useAuth();
  const router = useRouter();

  // Type Configuration
  const [typeConfig, setTypeConfig] = useState<ContentTypeConfig | null>(null);

  // Common Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isMapsApiLoaded, setIsMapsApiLoaded] = useState(false);
  const [mapsApiError, setMapsApiError] = useState<string | null>(null);
  const [locationInputElement, setLocationInputElement] = useState<HTMLInputElement | null>(null);
  const [nominatimSuggestions, setNominatimSuggestions] = useState<any[]>([]);
  const [isSearchingNominatim, setIsSearchingNominatim] = useState(false);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [createdAt, setCreatedAt] = useState('');
  const [description, setDescription] = useState('');
  const [gallery, setGallery] = useState<Array<{ url: string; type: 'image' | 'video' | 'document'; name?: string }>>([]);
  const [linkedAssets, setLinkedAssets] = useState<string[]>([]);
  const [addonAssetSlugs, setAddonAssetSlugs] = useState<string[]>([]);
  const [linkedLocations, setLinkedLocations] = useState<string[]>([]);
  const [linkedStaff, setLinkedStaff] = useState<string[]>([]);
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [addons, setAddons] = useState<Array<{ name: string; price: number; description: string }>>([]);
  const [globalAddons, setGlobalAddons] = useState<AddonProduct[]>([]);
  const [newAddonName, setNewAddonName] = useState('');
  const [newAddonPrice, setNewAddonPrice] = useState<number | ''>('');
  const [newAddonDescription, setNewAddonDescription] = useState('');

  // Selection Arrays for Relations
  const [allAssets, setAllAssets] = useState<ContentItem[]>([]);
  const [allLocations, setAllLocations] = useState<ContentItem[]>([]);
  const [allStaff, setAllStaff] = useState<ContentItem[]>([]);

  // Gallery Uploader States
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newGalleryType, setNewGalleryType] = useState<'image' | 'video' | 'document'>('image');
  const [newGalleryName, setNewGalleryName] = useState('');
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'hero' | 'gallery'>('hero');
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);

  // Adventure Fields
  const [basePrice, setBasePrice] = useState<number>(0);
  const [currency, setCurrency] = useState('USD');
  const [duration, setDuration] = useState('');
  const [maxGuests, setMaxGuests] = useState<number>(1);
  const [itinerary, setItinerary] = useState<Array<{ title: string; description: string; offsetMinutes: number; isCrewOnly?: boolean; locationSlug?: string }>>([]);
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [newIncludedItem, setNewIncludedItem] = useState('');
  const [includedLibrary, setIncludedLibrary] = useState<IncludedItemConfig[]>([]);
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [showCreateItemSection, setShowCreateItemSection] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemIcon, setNewItemIcon] = useState('Check');
  const [isSavingLibraryItem, setIsSavingLibraryItem] = useState(false);
  const [startTimes, setStartTimes] = useState<string[]>([]);
  const [newStartTime, setNewStartTime] = useState('');

  const suggestions = includedLibrary.filter(libItem =>
    libItem.name.toLowerCase().includes(newIncludedItem.toLowerCase().trim()) &&
    !includedItems.some(existing => existing.toLowerCase() === libItem.name.toLowerCase())
  );

  // Asset Fields
  const [assetCategory, setAssetCategory] = useState('');
  const [assetMake, setAssetMake] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetSpecs, setAssetSpecs] = useState<Array<{ key: string; value: string }>>([]);

  // Staff Fields
  const [staffRole, setStaffRole] = useState('');
  const [staffCertifications, setStaffCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState('');
  const [staffLanguages, setStaffLanguages] = useState<string[]>([]);
  const [newLang, setNewLang] = useState('');
  const [staffBio, setStaffBio] = useState('');
  const [staffDailyRate, setStaffDailyRate] = useState<number>(0);
  const [staffIsCaptain, setStaffIsCaptain] = useState<boolean>(false);
  const [staffRating, setStaffRating] = useState<number>(5);

  // Location Fields
  const [locationAnchorStatus, setLocationAnchorStatus] = useState('');
  const [locationBestTime, setLocationBestTime] = useState('');
  const [locationSuitability, setLocationSuitability] = useState('');

  // Owner Fields
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerRevenueShare, setOwnerRevenueShare] = useState<number>(0);
  const [ownerPaymentDetails, setOwnerPaymentDetails] = useState('');

  // Asset Extensions
  const [assetHourlyRate, setAssetHourlyRate] = useState<number>(0);
  const [assetOwnerId, setAssetOwnerId] = useState('');
  const [assetIsVessel, setAssetIsVessel] = useState<boolean>(false);
  const [assetHomeLocation, setAssetHomeLocation] = useState('');
  const [assetQuantity, setAssetQuantity] = useState<number>(1);
  const [assetRelocationSpeed, setAssetRelocationSpeed] = useState<number>(0);

  // Blackout Scheduler States
  const [assetBlackouts, setAssetBlackouts] = useState<AssetBlackout[]>([]);
  const [newBlackoutTitle, setNewBlackoutTitle] = useState('');
  const [newBlackoutStartDate, setNewBlackoutStartDate] = useState('');
  const [newBlackoutEndDate, setNewBlackoutEndDate] = useState('');
  const [newBlackoutStartTime, setNewBlackoutStartTime] = useState('');
  const [newBlackoutEndTime, setNewBlackoutEndTime] = useState('');
  const [newBlackoutNotes, setNewBlackoutNotes] = useState('');
  const [isAddingBlackout, setIsAddingBlackout] = useState(false);

  // Staff Extensions
  const [staffCertifiedVessels, setStaffCertifiedVessels] = useState<string[]>([]);

  // Adventure Budget Extensions
  const [previewVesselSlug, setPreviewVesselSlug] = useState<string>('');

  // Adventure Budget Extensions
  const [experienceBaseCost, setExperienceBaseCost] = useState<number>(0);
  const [budgetLineItems, setBudgetLineItems] = useState<Array<{ category: string; cost: number }>>([]);
  const [newBudgetCategory, setNewBudgetCategory] = useState('');
  const [newBudgetCost, setNewBudgetCost] = useState<number>(0);

  // Selection list for Owners
  const [allOwners, setAllOwners] = useState<ContentItem[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHero(true);
    try {
      const url = await uploadFile(file, type === 'staff' ? 'crew' : 'hero');
      setHeroImage(url);
      showToast('success', `${type === 'staff' ? 'Profile picture' : 'Hero image'} uploaded successfully!`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to upload image.');
    } finally {
      setIsUploadingHero(false);
      e.target.value = '';
    }
  };

  // Load Google Maps script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Diagnose key presence
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || firebaseConfig.apiKey;
    console.log('Google Maps Script Loader - Key Detected:', apiKey ? (apiKey.substring(0, 8) + '...') : 'undefined');

    // Register global init callback
    (window as any).initGoogleMapsCallback = () => {
      console.log('Google Maps script callback called. places exists:', typeof (window as any).google?.maps?.places !== 'undefined');
      setIsMapsApiLoaded(true);
      setMapsApiError(null);
    };

    // Register global auth failure callback
    (window as any).gm_authFailure = () => {
      console.error('Google Maps API auth failure event triggered!');
      setMapsApiError('Google Maps Authentication Failure. Check if the Places API is activated and that your API key does not restrict its usage.');
    };

    if ((window as any).google && (window as any).google.maps && (window as any).google.maps.places) {
      console.log('Google Maps and Places library already loaded.');
      setIsMapsApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-api-script');
    if (existingScript) {
      console.log('Google Maps script tag already exists in DOM, waiting for it to finish loading.');
      return;
    }

    if (!apiKey) {
      setMapsApiError('Google Maps API Key is missing. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY to your env configuration.');
      return;
    }

    console.log('Appending Google Maps API script tag to document head...');
    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('Network error loading Google Maps script tag.');
      setMapsApiError('Failed to load Google Maps script. Check your network or browser blocks.');
    };
    document.head.appendChild(script);
  }, []);

  const initAutocomplete = (inputElement: HTMLInputElement) => {
    console.log('initAutocomplete checking dependencies:', {
      google: typeof (window as any).google !== 'undefined',
      maps: typeof (window as any).google?.maps !== 'undefined',
      places: typeof (window as any).google?.maps?.places !== 'undefined',
    });

    if (!(window as any).google || !(window as any).google.maps) {
      return;
    }
    if (!(window as any).google.maps.places || !(window as any).google.maps.places.Autocomplete) {
      setMapsApiError('Places library or Autocomplete constructor is missing from the Google Maps SDK. Check query parameters.');
      return;
    }

    if ((inputElement as any)._autocompleteInitialized) {
      console.log('Autocomplete already initialized on this element.');
      return;
    }
    (inputElement as any)._autocompleteInitialized = true;

    try {
      console.log('Creating new google.maps.places.Autocomplete instance...');
      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputElement, {
        types: ['geocode', 'establishment']
      });

      inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log('Autocomplete place_changed event details:', place);
        if (!place.geometry || !place.geometry.location) {
          setLocation(inputElement.value);
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const formattedAddr = place.formatted_address || '';
        const placeName = place.name || '';

        setLocation(placeName || formattedAddr);
        setAddress(formattedAddr);
        setLatitude(lat);
        setLongitude(lng);
      });
      console.log('Autocomplete instance successfully attached to element.');
    } catch (err) {
      console.error('Error instantiating Google Places Autocomplete:', err);
      setMapsApiError('Error instantiating Places Autocomplete: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    if (isMapsApiLoaded && locationInputElement) {
      initAutocomplete(locationInputElement);
    }
  }, [isMapsApiLoaded, locationInputElement]);

  const inputCallbackRef = (node: HTMLInputElement | null) => {
    if (node) {
      setLocationInputElement(node);
      initAutocomplete(node);
    }
  };
  const handleLocationChange = async (val: string) => {
    setLocation(val);
    
    if (mapsApiError || !isMapsApiLoaded) {
      if (val.trim().length < 3) {
        setNominatimSuggestions([]);
        return;
      }
      
      setIsSearchingNominatim(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`;
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MY-Whiskey-Site-Admin'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setNominatimSuggestions(data || []);
        }
      } catch (err) {
        console.error('Nominatim query error:', err);
      } finally {
        setIsSearchingNominatim(false);
      }
    } else {
      setNominatimSuggestions([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load type configurations
        const configs = await getContentTypeConfigs();
        const config = configs.find(c => c.id === type);
        if (config) {
          setTypeConfig(config);
        }

        let dbAssets: ContentItem[] = [];
        // Fetch selection lists for relations if we are managing an adventure
        if (type === 'adventure') {
          const assets = await getContentItems('asset');
          const locations = await getContentItems('location');
          const staff = await getContentItems('staff');
          const includedLib = await loadIncludedItems();
          const addonLib = await loadAddonProducts();
          setAllAssets(assets);
          dbAssets = assets;
          setAllLocations(locations);
          setAllStaff(staff);
          setIncludedLibrary(includedLib);
          setGlobalAddons(addonLib);
        } else if (type === 'staff') {
          const assets = await getContentItems('asset');
          setAllAssets(assets);
          dbAssets = assets;
        } else if (type === 'asset') {
          const locations = await getContentItems('location');
          setAllLocations(locations);
          
          if (!isNew) {
            const blackouts = await getAssetBlackouts(id);
            setAssetBlackouts(blackouts);
          }
        }

        if (type === 'asset' || type === 'adventure') {
          const owners = await getContentItems('owner');
          setAllOwners(owners);
        }

        if (!isNew) {
          // Edit Mode: load item
          const item = await getContentItem(id);
          if (item) {
            setTitle(item.title);
            setSlug(item.slug);
            setShortDescription(item.shortDescription || '');
            setHeroImage(item.heroImage || '');
            setLocation(item.location || '');
            setAddress(item.address || '');
            setLatitude(item.latitude !== undefined ? item.latitude : null);
            setLongitude(item.longitude !== undefined ? item.longitude : null);
            setStatus(item.status || 'draft');
            setCreatedAt(item.createdAt);
            setDescription(item.description || '');
            setGallery(item.gallery || []);
            const linked = item.linkedAssets || [];
            setLinkedAssets(linked);
            setLinkedLocations(item.linkedLocations || []);
            setLinkedStaff(item.linkedStaff || []);

            // Extension loading
            if (type === 'adventure') {
              setBasePrice(item.basePrice || 0);
              setStartLocation(item.startLocation || '');
              setEndLocation(item.endLocation || '');
              setExperienceBaseCost(item.experienceBaseCost !== undefined ? Number(item.experienceBaseCost) : 0);
              setAddonAssetSlugs(item.addonAssetSlugs || []);
              setBudgetLineItems(item.budgetLineItems || []);
              setCurrency(item.currency || 'USD');
              setDuration(item.duration || '');
              setMaxGuests(item.maxGuests || 1);
              setStartTimes(item.startTimes || []);
              setItinerary((item.itinerary || []).map((step: any) => ({
                title: step.title || '',
                description: step.description || '',
                offsetMinutes: step.offsetMinutes !== undefined ? Number(step.offsetMinutes) : 0,
                isCrewOnly: Boolean(step.isCrewOnly || false),
                locationSlug: step.locationSlug || ''
              })));
              setIncludedItems(item.includedItems || []);
              setAddons(item.addons || []);
              
              // Set default preview vessel
              const firstVessel = dbAssets.find(a => linked.includes(a.slug) && a.isVessel);
              if (firstVessel) {
                setPreviewVesselSlug(firstVessel.slug);
              } else {
                // fallback to first linked asset if no vessel is flagged
                const anyVessel = dbAssets.find(a => linked.includes(a.slug));
                if (anyVessel) setPreviewVesselSlug(anyVessel.slug);
              }
            } else if (type === 'asset') {
              setAssetCategory(item.category || '');
              setAssetMake(item.make || '');
              setAssetModel(item.model || '');
              setAssetSpecs(item.specifications ? Object.entries(item.specifications).map(([key, value]) => ({ key, value: String(value) })) : []);
              setAssetHourlyRate(item.hourlyRate !== undefined ? Number(item.hourlyRate) : 0);
              setAssetOwnerId(item.ownerId || '');
              setAssetIsVessel(Boolean(item.isVessel || false));
              setAssetHomeLocation(item.homeLocation || 'destin-harbor');
              setAssetQuantity(item.quantity !== undefined ? Number(item.quantity) : 1);
              setAssetRelocationSpeed(item.relocationSpeed !== undefined ? Number(item.relocationSpeed) : 0);
            } else if (type === 'staff') {
              setStaffRole(item.role || '');
              setStaffCertifications(item.certifications || []);
              setStaffLanguages(item.languagesSpoken || []);
              setStaffBio(item.bio || '');
              setStaffDailyRate(item.hourlyRate || item.dailyRate || 0);
              setStaffIsCaptain(item.isCaptain || false);
              setStaffRating(item.rating !== undefined ? Number(item.rating) : 5);
              setStaffCertifiedVessels(item.certifiedVessels || []);
            } else if (type === 'location') {
              setLocationAnchorStatus(item.anchorStatus || '');
              setLocationBestTime(item.bestTime || '');
              setLocationSuitability(item.suitability || '');
            } else if (type === 'owner') {
              setOwnerEmail(item.email || '');
              setOwnerPhone(item.phone || '');
              setOwnerRevenueShare(item.revenueShare !== undefined ? Number(item.revenueShare) : 0);
              setOwnerPaymentDetails(item.paymentDetails || '');
            }
          } else {
            showToast('error', 'Content item not found');
            router.push(`/admin/content/${type}`);
          }
        } else {
          // Create Mode
          setCreatedAt(new Date().toISOString());
        }
      } catch (error) {
        console.error('Error loading editor data:', error);
        showToast('error', 'Failed to load content details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [type, id, isNew, router]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (isNew) {
      const sanitized = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(sanitized);
    }
  };

  const handleSlugChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(sanitized);
  };

  // Included Items Handlers (Adventure)
  const renderIconByName = (name: string) => {
    switch (name) {
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
      default: return <Check size={14} />;
    }
  };

  const recommendIconName = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('fuel') || lower.includes('diesel') || lower.includes('gas')) return 'Fuel';
    if (lower.includes('lunch') || lower.includes('food') || lower.includes('catering') || lower.includes('snack') || lower.includes('charcuterie') || lower.includes('dining') || lower.includes('meal')) return 'Utensils';
    if (lower.includes('drink') || lower.includes('water') || lower.includes('beverage') || lower.includes('soda') || lower.includes('coke') || lower.includes('wine') || lower.includes('whiskey') || lower.includes('champagne')) return 'GlassWater';
    if (lower.includes('captain') || lower.includes('crew') || lower.includes('host') || lower.includes('guide')) return 'Users';
    if (lower.includes('snorkel') || lower.includes('fins') || lower.includes('mask') || lower.includes('paddleboard') || lower.includes('board') || lower.includes('gear')) return 'Compass';
    if (lower.includes('towel') || lower.includes('sunscreen') || lower.includes('amenities') || lower.includes('clean') || lower.includes('fresh')) return 'Sparkles';
    if (lower.includes('wifi') || lower.includes('internet')) return 'Wifi';
    if (lower.includes('audio') || lower.includes('sound') || lower.includes('bluetooth') || lower.includes('music')) return 'Music';
    if (lower.includes('safety') || lower.includes('cpr') || lower.includes('vest') || lower.includes('life')) return 'Shield';
    if (lower.includes('tax') || lower.includes('fee') || lower.includes('cost') || lower.includes('gratuity') || lower.includes('tip')) return 'DollarSign';
    if (lower.includes('sea') || lower.includes('ocean') || lower.includes('beach') || lower.includes('wave')) return 'Waves';
    return 'Check';
  };

  const handleAddOrRecommend = () => {
    const trimmed = newIncludedItem.trim();
    if (!trimmed) return;
    
    // Check if it already exists in the adventure list
    if (includedItems.includes(trimmed)) {
      setNewIncludedItem('');
      return;
    }

    // Check if it exists in the library
    const existsInLib = includedLibrary.some(
      libItem => libItem.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existsInLib) {
      const matchedItem = includedLibrary.find(
        libItem => libItem.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (matchedItem) {
        setIncludedItems([...includedItems, matchedItem.name]);
      }
      setNewIncludedItem('');
      setShowLibraryDropdown(false);
    } else {
      setNewItemName(trimmed);
      setNewItemIcon(recommendIconName(trimmed));
      setShowCreateItemSection(true);
    }
  };

  const saveNewIncludedItemToLib = async () => {
    if (!newItemName.trim()) return;
    setIsSavingLibraryItem(true);
    try {
      const newItem: IncludedItemConfig = {
        id: newItemName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
        name: newItemName.trim(),
        iconName: newItemIcon
      };

      const updatedLibrary = [...includedLibrary, newItem];
      await saveIncludedItems(updatedLibrary);
      setIncludedLibrary(updatedLibrary);
      
      setIncludedItems([...includedItems, newItem.name]);
      setNewIncludedItem('');
      setShowCreateItemSection(false);
    } catch (err) {
      console.error('Error saving new library item:', err);
    } finally {
      setIsSavingLibraryItem(false);
    }
  };

  const removeIncludedItem = (index: number) => {
    setIncludedItems(includedItems.filter((_, i) => i !== index));
  };

  // Itinerary Handlers (Adventure)
  const addItineraryStep = () => {
    setItinerary([...itinerary, { title: '', description: '', offsetMinutes: 0 }]);
  };

  const updateItineraryStep = (index: number, field: 'title' | 'description' | 'offsetMinutes' | 'isCrewOnly' | 'locationSlug', value: string | number | boolean) => {
    const updated = [...itinerary];
    updated[index] = {
      ...updated[index],
      [field]: value
    } as any;
    setItinerary(updated);
  };

  const removeItineraryStep = (index: number) => {
    setItinerary(itinerary.filter((_, i) => i !== index));
  };

  const moveItineraryStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === itinerary.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...itinerary];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setItinerary(updated);
  };

  // Start Times Handlers (Adventure)
  const addStartTime = () => {
    const trimmed = newStartTime.trim();
    if (trimmed && !startTimes.includes(trimmed)) {
      if (/^\d{2}:\d{2}$/.test(trimmed)) {
        setStartTimes([...startTimes, trimmed].sort());
        setNewStartTime('');
      } else {
        showToast('error', 'Please enter time in HH:MM format (e.g. 09:30 or 14:00)');
      }
    }
  };

  const removeStartTime = (timeToRemove: string) => {
    setStartTimes(startTimes.filter(t => t !== timeToRemove));
  };

  // Specifications Handlers (Asset)
  const addSpec = () => {
    setAssetSpecs([...assetSpecs, { key: '', value: '' }]);
  };

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...assetSpecs];
    updated[index][field] = value;
    setAssetSpecs(updated);
  };

  const removeSpec = (index: number) => {
    setAssetSpecs(assetSpecs.filter((_, i) => i !== index));
  };

  // Certifications Handlers (Staff)
  const addCert = () => {
    if (newCert.trim() && !staffCertifications.includes(newCert.trim())) {
      setStaffCertifications([...staffCertifications, newCert.trim()]);
      setNewCert('');
    }
  };

  const removeCert = (index: number) => {
    setStaffCertifications(staffCertifications.filter((_, i) => i !== index));
  };

  // Languages Handlers (Staff)
  const addLang = () => {
    if (newLang.trim() && !staffLanguages.includes(newLang.trim())) {
      setStaffLanguages([...staffLanguages, newLang.trim()]);
      setNewLang('');
    }
  };

  const removeLang = (index: number) => {
    setStaffLanguages(staffLanguages.filter((_, i) => i !== index));
  };

  // Blackout Handlers (Asset)
  const handleAddBlackout = async () => {
    if (!newBlackoutTitle.trim() || !newBlackoutStartDate || !newBlackoutEndDate) {
      showToast('error', 'Please fill in Title, Start Date, and End Date.');
      return;
    }
    
    setIsAddingBlackout(true);
    try {
      await saveAssetBlackout({
        vesselSlug: id,
        title: newBlackoutTitle.trim(),
        startDate: newBlackoutStartDate,
        endDate: newBlackoutEndDate,
        startTime: newBlackoutStartTime || undefined,
        endTime: newBlackoutEndTime || undefined,
        notes: newBlackoutNotes.trim()
      });
      showToast('success', 'Blackout period added successfully.');
      setNewBlackoutTitle('');
      setNewBlackoutStartDate('');
      setNewBlackoutEndDate('');
      setNewBlackoutStartTime('');
      setNewBlackoutEndTime('');
      setNewBlackoutNotes('');
      // Refresh list
      const blackouts = await getAssetBlackouts(id);
      setAssetBlackouts(blackouts);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to add blackout period.');
    } finally {
      setIsAddingBlackout(false);
    }
  };

  const handleDeleteBlackout = async (blackoutId: string) => {
    if (!confirm('Are you sure you want to delete this blackout period?')) return;
    try {
      await deleteAssetBlackout(blackoutId);
      showToast('success', 'Blackout period deleted.');
      // Refresh list
      const blackouts = await getAssetBlackouts(id);
      setAssetBlackouts(blackouts);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to delete blackout period.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Title is required');
      return;
    }
    if (!slug.trim()) {
      setValidationError('Slug is required');
      return;
    }

    setSaveStatus('saving');
    setValidationError(null);

    try {
      // Build document
      const itemData: ContentItem = {
        id: isNew ? slug : id,
        slug,
        title,
        contentType: type,
        shortDescription,
        heroImage,
        location,
        address: address || '',
        latitude: latitude !== null ? Number(latitude) : undefined,
        longitude: longitude !== null ? Number(longitude) : undefined,
        status,
        createdAt,
        description,
        gallery,
        updatedAt: new Date().toISOString()
      };

      // Merge extensions
      if (type === 'adventure') {
        itemData.currency = currency;
        itemData.maxGuests = Number(maxGuests);
        itemData.startTimes = startTimes;
        const cleanItinerary = itinerary
          .filter(i => i.title.trim())
          .map(i => ({
            title: i.title.trim(),
            description: i.description.trim(),
            offsetMinutes: Number(i.offsetMinutes || 0),
            isCrewOnly: Boolean(i.isCrewOnly || false),
            locationSlug: i.locationSlug || ''
          }));
        itemData.itinerary = cleanItinerary;

        // Calculate durations
        let cumulative = 0;
        const absoluteOffsets = cleanItinerary.map((step, idx) => {
          if (idx > 0) {
            cumulative += Number(cleanItinerary[idx - 1].offsetMinutes || 0);
          }
          return cumulative;
        });

        const publicIndices = cleanItinerary
          .map((step, idx) => (!step.isCrewOnly ? idx : -1))
          .filter(idx => idx !== -1);
        
        let guestMins = 0;
        if (publicIndices.length > 0) {
          const firstPublicIdx = publicIndices[0];
          const lastPublicIdx = publicIndices[publicIndices.length - 1];
          guestMins = absoluteOffsets[lastPublicIdx] - absoluteOffsets[firstPublicIdx];
        }

        const crewMins = guestMins + cleanItinerary
          .filter(step => step.isCrewOnly)
          .reduce((sum, step) => sum + Number(step.offsetMinutes || 0), 0);
        
        itemData.guestDurationMinutes = guestMins;
        itemData.crewDurationMinutes = crewMins;

        // Auto-generate duration string for backwards compatibility
        const formatDurationHelper = (minutes: number): string => {
          const hrs = Math.floor(minutes / 60);
          const mins = minutes % 60;
          if (hrs === 0) return `${mins} mins`;
          if (mins === 0) return `${hrs} Hours`;
          return `${hrs}h ${mins}m`;
        };
        itemData.duration = formatDurationHelper(guestMins);

        itemData.includedItems = includedItems;
        itemData.addons = addons;
        itemData.linkedAssets = linkedAssets;
        itemData.addonAssetSlugs = addonAssetSlugs;
        itemData.linkedLocations = linkedLocations;
        itemData.startLocation = startLocation;
        itemData.endLocation = endLocation;
        itemData.linkedStaff = linkedStaff;

        // Calculate dynamic budget basePrice
        const selectedAssets = allAssets.filter(asset => linkedAssets.includes(asset.slug));
        const linkedVessels = selectedAssets.filter(a => a.isVessel);
        const linkedGear = selectedAssets.filter(a => !a.isVessel);
        const cheapestVesselRate = linkedVessels.length > 0 ? Math.min(...linkedVessels.map(v => Number(v.hourlyRate) || 0)) : 0;
        const includedGear = linkedGear.filter(a => !addonAssetSlugs.includes(a.slug));
        const gearHourlyTotal = includedGear.reduce((sum, a) => sum + (Number(a.hourlyRate) || 0), 0);
        const guestHours = guestMins / 60;
        const calculatedAssetCost = (cheapestVesselRate + gearHourlyTotal) * guestHours;
        const customLineItemsCost = budgetLineItems.reduce((sum, li) => sum + (Number(li.cost) || 0), 0);
        const finalBasePrice = Number(experienceBaseCost) + calculatedAssetCost + customLineItemsCost;

        itemData.basePrice = finalBasePrice;
        itemData.experienceBaseCost = Number(experienceBaseCost);
        itemData.budgetLineItems = budgetLineItems;
      } else if (type === 'asset') {
        itemData.category = assetCategory;
        itemData.make = assetMake;
        itemData.model = assetModel;
        itemData.hourlyRate = Number(assetHourlyRate);
        itemData.ownerId = assetOwnerId;
        itemData.isVessel = assetIsVessel;
        itemData.homeLocation = assetHomeLocation || 'destin-harbor';
        itemData.quantity = Number(assetQuantity) || 1;
        itemData.relocationSpeed = Number(assetRelocationSpeed) || 0;
        const specsObj: Record<string, string> = {};
        assetSpecs.forEach(spec => {
          if (spec.key.trim()) {
            specsObj[spec.key.trim()] = spec.value;
          }
        });
        itemData.specifications = specsObj;
      } else if (type === 'staff') {
        itemData.role = staffRole;
        itemData.certifications = staffCertifications;
        itemData.languagesSpoken = staffLanguages;
        itemData.bio = staffBio;
        itemData.dailyRate = Number(staffDailyRate);
        itemData.hourlyRate = Number(staffDailyRate);
        itemData.isCaptain = Boolean(staffIsCaptain);
        itemData.rating = Number(staffRating);
        itemData.certifiedVessels = staffIsCaptain ? staffCertifiedVessels : [];
      } else if (type === 'location') {
        itemData.anchorStatus = locationAnchorStatus;
        itemData.bestTime = locationBestTime;
        itemData.suitability = locationSuitability;
      } else if (type === 'owner') {
        itemData.email = ownerEmail;
        itemData.phone = ownerPhone;
        itemData.revenueShare = Number(ownerRevenueShare);
        itemData.paymentDetails = ownerPaymentDetails;
      }

      await saveContentItem(itemData);

      // Bidirectional Recalculation for Asset hourly rate changes
      if (type === 'asset') {
        const adventures = await getContentItems('adventure');
        const assetSlug = isNew ? slug : id;
        const matchingAdventures = adventures.filter(adv => (adv.linkedAssets || []).includes(assetSlug));
        
        if (matchingAdventures.length > 0) {
          const allDbAssets = await getContentItems('asset');
          for (const adv of matchingAdventures) {
            const advLinkedAssets = allDbAssets.filter(a => (adv.linkedAssets || []).includes(a.slug));
            const updatedLinkedAssets = advLinkedAssets.map(a => a.slug === assetSlug ? { ...a, hourlyRate: Number(assetHourlyRate) } : a);
            
            const advGuestMins = adv.guestDurationMinutes || 0;
            const guestHours = advGuestMins / 60;
            const advVessels = updatedLinkedAssets.filter(a => a.isVessel);
            const advGear = updatedLinkedAssets.filter(a => !a.isVessel);
            const cheapestVesselRate = advVessels.length > 0 ? Math.min(...advVessels.map(v => Number(v.hourlyRate) || 0)) : 0;
            const advAddonSlugs = adv.addonAssetSlugs || [];
            const includedGear = advGear.filter(a => !advAddonSlugs.includes(a.slug));
            const gearHourlyTotal = includedGear.reduce((sum, a) => sum + (Number(a.hourlyRate) || 0), 0);
            const calculatedAssetCost = (cheapestVesselRate + gearHourlyTotal) * guestHours;
            const customLineItemsCost = (adv.budgetLineItems || []).reduce((sum, li) => sum + (Number(li.cost) || 0), 0);
            const advBaseCost = adv.experienceBaseCost !== undefined ? Number(adv.experienceBaseCost) : 0;
            
            const newBasePrice = advBaseCost + calculatedAssetCost + customLineItemsCost;
            
            await saveContentItem({
              ...adv,
              basePrice: newBasePrice,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      setSaveStatus('success');
      showToast('success', `${typeConfig?.name || 'Content item'} saved successfully!`);
      setTimeout(() => {
        router.push(`/admin/content/${type}`);
      }, 1000);
    } catch (error) {
      console.error('Error saving content item:', error);
      const errMsg = error instanceof Error ? error.message : 'An error occurred while saving. Please check database permissions.';
      setValidationError(errMsg);
      showToast('error', errMsg);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'adventure':
        return <Compass size={20} color="#B9783B" />;
      case 'asset':
        return <Ship size={20} color="#B9783B" />;
      case 'staff':
        return <Users size={20} color="#B9783B" />;
      default:
        return <Sliders size={20} color="#B9783B" />;
    }
  };

  // Helper to calculate guest and crew duration from current itinerary steps in state
  const calculateDurationsFromItinerary = (itinerarySteps: typeof itinerary) => {
    if (!itinerarySteps || itinerarySteps.length === 0) {
      return { guestMins: 0, crewMins: 0 };
    }
    
    let cumulative = 0;
    const absoluteOffsets = itinerarySteps.map((step, idx) => {
      if (idx > 0) {
        cumulative += Number(itinerarySteps[idx - 1].offsetMinutes || 0);
      }
      return cumulative;
    });

    const publicIndices = itinerarySteps
      .map((step, idx) => (!step.isCrewOnly ? idx : -1))
      .filter(idx => idx !== -1);
    
    let guestMins = 0;
    if (publicIndices.length > 0) {
      const firstPublicIdx = publicIndices[0];
      const lastPublicIdx = publicIndices[publicIndices.length - 1];
      guestMins = absoluteOffsets[lastPublicIdx] - absoluteOffsets[firstPublicIdx];
    }

    const crewMins = guestMins + itinerarySteps
      .filter(step => step.isCrewOnly)
      .reduce((sum, step) => sum + Number(step.offsetMinutes || 0), 0);
    return { guestMins, crewMins };
  };

  const formatDurationHelper = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} mins`;
    if (mins === 0) return `${hrs} Hours`;
    return `${hrs}h ${mins}m`;
  };

  const { guestMins, crewMins } = calculateDurationsFromItinerary(itinerary);

  const guestHours = guestMins / 60;
  const selectedAssetsList = allAssets.filter(asset => linkedAssets.includes(asset.slug));
  const selectedVessels = selectedAssetsList.filter(a => a.isVessel);
  const selectedGear = selectedAssetsList.filter(a => !a.isVessel);

  // Determine active preview vessel slug (fallback to first selected vessel if not set)
  const activePreviewVesselSlug = previewVesselSlug || (selectedVessels[0]?.slug || '');
  const activePreviewVessel = selectedVessels.find(v => v.slug === activePreviewVesselSlug) || selectedVessels[0];

  const assetCosts: Array<{ slug: string; title: string; rate: number; cost: number; isVessel: boolean }> = [];
  
  if (activePreviewVessel) {
    const rate = Number(activePreviewVessel.hourlyRate) || 0;
    assetCosts.push({
      slug: activePreviewVessel.slug,
      title: `${activePreviewVessel.title} (Vessel)`,
      rate,
      cost: rate * guestHours,
      isVessel: true
    });
  }

  selectedGear.forEach(asset => {
    const rate = Number(asset.hourlyRate) || 0;
    const isAddon = addonAssetSlugs.includes(asset.slug);
    assetCosts.push({
      slug: asset.slug,
      title: `${asset.title} ${isAddon ? '(Add-on)' : '(Included)'}`,
      rate,
      cost: isAddon ? 0 : rate * guestHours,
      isVessel: false
    });
  });

  const totalAssetCosts = assetCosts.reduce((sum, item) => sum + item.cost, 0);
  const totalCustomCosts = budgetLineItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
  const calculatedGrandTotal = Number(experienceBaseCost) + totalAssetCosts + totalCustomCosts;

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: '#B9783B' }} />
        <span>Loading Editor...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Inject custom CSS to theme Google Maps Places Autocomplete dropdown */}
      <style dangerouslySetInnerHTML={{ __html: `
        .pac-container {
          background-color: #1E2124 !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          border-radius: 6px !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
          font-family: 'Inter', sans-serif !important;
          margin-top: 4px !important;
          z-index: 99999 !important;
        }
        .pac-item {
          border-top: 1px solid rgba(255, 255, 255, 0.03) !important;
          padding: 8px 12px !important;
          color: #D8C7AF !important;
          cursor: pointer !important;
          font-size: 0.85rem !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.35rem !important;
        }
        .pac-item:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
        }
        .pac-item-query {
          color: #F4F1EA !important;
          font-size: 0.875rem !important;
          padding-right: 0.25rem !important;
        }
        .pac-matched {
          color: #B9783B !important;
          font-weight: 600 !important;
        }
        .hdpi .pac-icon {
          filter: invert(1) brightness(0.8) sepia(1) saturate(5) hue-rotate(330deg);
        }
      ` }} />
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href={`/admin/content/${type}`} style={{ color: '#D8C7AF', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#F4F1EA'} onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}>
            <ChevronLeft size={24} />
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', opacity: 0.6 }}>
              <Link href="/admin" style={{ textDecoration: 'none', color: '#D8C7AF' }}>Admin</Link>
              <span>/</span>
              <Link href="/admin/content" style={{ textDecoration: 'none', color: '#D8C7AF' }}>Content</Link>
              <span>/</span>
              <Link href={`/admin/content/${type}`} style={{ textDecoration: 'none', color: '#D8C7AF' }}>{typeConfig?.pluralName || 'Items'}</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.15rem', color: '#F4F1EA', marginTop: '0.1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>{getIcon()}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                {isNew ? `Create ${typeConfig?.name || 'Item'}` : title || 'Edit Item'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link 
            href={`/admin/content/${type}`}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#D8C7AF',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#F4F1EA'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#D8C7AF'; }}
          >
            Cancel
          </Link>

          {!isNew && (
            <a
              href={`/${typeConfig?.slugPrefix || (type === 'adventure' ? 'experiences' : type === 'asset' ? 'fleet' : 'crew')}/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.5rem 1rem',
                background: 'transparent',
                border: '1px solid rgba(185,120,59,0.4)',
                color: '#B9783B',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                opacity: status === 'published' ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
              title={status === 'published' ? "View Live Page" : "Item is a draft. Publish to view live page."}
              onMouseOver={e => { if (status === 'published') { e.currentTarget.style.background = 'rgba(185,120,59,0.1)'; } }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Eye size={16} /> View Live Page
            </a>
          )}

          <button 
            type="submit"
            form="editor-form"
            disabled={saveStatus === 'saving' || saveStatus === 'success'}
            style={{
              padding: '0.5rem 1.25rem',
              background: saveStatus === 'success' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : saveStatus === 'saving' ? 'rgba(185,120,59,0.5)' : '#B9783B',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: (saveStatus === 'saving' || saveStatus === 'success') ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              minWidth: '150px'
            }}
            onMouseOver={e => { if (saveStatus === 'idle') e.currentTarget.style.background = '#a2642e'; }}
            onMouseOut={e => { if (saveStatus === 'idle') e.currentTarget.style.background = '#B9783B'; }}
          >
            {saveStatus === 'saving' && (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            )}
            {saveStatus === 'success' && (
              <>
                Saved!
              </>
            )}
            {saveStatus === 'error' && (
              <>
                Error!
              </>
            )}
            {saveStatus === 'idle' && (
              <>
                <Save size={16} /> Save {typeConfig?.name || 'Item'}
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: type === 'adventure' ? '1200px' : '800px', margin: '0 auto', padding: '3rem 2rem' }}>
        {mapsApiError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>Google Maps Integration Alert</span>
            </div>
            <div style={{ color: '#F4F1EA', opacity: 0.85, fontSize: '0.825rem', lineHeight: '1.4' }}>
              {mapsApiError}
            </div>
          </div>
        )}
        <form 
          id="editor-form" 
          onSubmit={handleSave} 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: type === 'adventure' ? '1fr 380px' : '1fr', 
            gap: '2rem',
            alignItems: 'start'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Base Fields Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              Base Information
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Title / Name
                  <input 
                    type="text"
                    value={title}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder={type === 'staff' ? 'e.g. Capt. James Hook' : 'e.g. Sunset Snorkeling'}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                    required
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Slug URL Path
                  <input 
                    type="text"
                    value={slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    placeholder="sunset-snorkeling"
                    disabled={!isNew}
                    style={{ padding: '0.75rem', background: isNew ? '#121416' : '#1A1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: isNew ? 'white' : '#888', fontSize: '0.875rem', outline: 'none', cursor: isNew ? 'text' : 'not-allowed' }}
                    required
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Publishing Status
                  <select 
                    value={status}
                    onChange={e => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <div></div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                {type === 'staff' ? 'Profile Picture / Avatar' : 'Hero Image'}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {heroImage ? (
                    <div style={{ width: '80px', height: '60px', background: '#121416', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={heroImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '80px', height: '60px', background: '#121416', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={20} color="#D8C7AF" opacity={0.4} />
                    </div>
                  )}
                  <input 
                    type="text"
                    value={heroImage}
                    onChange={e => setHeroImage(e.target.value)}
                    placeholder={type === 'staff' ? 'Profile picture URL or select upload' : 'https://...'}
                    style={{ flex: 1, padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button 
                    type="button"
                    onClick={() => { setMediaPickerTarget('hero'); setIsMediaModalOpen(true); }}
                    style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
                    onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
                  >
                    Browse Library
                  </button>
                  <label style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    borderRadius: '6px',
                    cursor: isUploadingHero ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    opacity: isUploadingHero ? 0.7 : 1
                  }}
                    onMouseOver={e => { if (!isUploadingHero) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                    onMouseOut={e => { if (!isUploadingHero) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  >
                    {isUploadingHero ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                    {isUploadingHero ? 'Uploading...' : 'Upload Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleHeroUpload}
                      disabled={isUploadingHero}
                    />
                  </label>
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Short Summary Description
                <textarea 
                  value={shortDescription}
                  onChange={e => setShortDescription(e.target.value)}
                  placeholder="Provide a brief summary card text..."
                  rows={3}
                  style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          </div>

          {/* Detailed Description Card (Markdown) */}
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: 0 }}>
                Detailed Description (Markdown)
              </h2>
              <button
                type="button"
                onClick={() => setIsMarkdownPreview(!isMarkdownPreview)}
                style={{
                  background: 'rgba(185,120,59,0.15)',
                  border: '1px solid rgba(185,120,59,0.3)',
                  color: '#B9783B',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {isMarkdownPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                {isMarkdownPreview ? 'Edit Editor' : 'Live Preview'}
              </button>
            </div>

            {isMarkdownPreview ? (
              <div style={{ padding: '1.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', minHeight: '180px', color: '#D8C7AF', lineHeight: '1.6' }} className="prose prose-invert">
                {description.trim() ? (
                  <ReactMarkdown>{description}</ReactMarkdown>
                ) : (
                  <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No content written yet. Toggle "Edit Editor" to write some details.</span>
                )}
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Detailed Content (Supports Markdown formatting)
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="### Itinerary Highlights&#10;&#10;- Use headers like # or ##&#10;- Add bullet points or bold text&#10;- Embed lists and markdown elements..."
                  rows={8}
                  style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'monospace', lineHeight: '1.5' }}
                />
              </label>
            )}
          </div>

          {/* Media Gallery & Files Card */}
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
              Media Gallery & Files
            </h2>

            {/* Add Gallery Item Form */}
            <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Add New Media / File
              </span>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Media Type
                  <select
                    value={newGalleryType}
                    onChange={e => setNewGalleryType(e.target.value as any)}
                    style={{ padding: '0.65rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="image">Image (Photo)</option>
                    <option value="video">Video (MP4 / YouTube / Vimeo)</option>
                    <option value="document">Document (PDF / Guide / Menu)</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Display Label / Caption (Optional)
                  <input
                    type="text"
                    value={newGalleryName}
                    onChange={e => setNewGalleryName(e.target.value)}
                    placeholder="e.g. Scenic Sandbar view, Safety Waiver PDF"
                    style={{ padding: '0.65rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 600 }}>
                File / URL Source
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newGalleryUrl}
                    onChange={e => setNewGalleryUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ flex: 1, padding: '0.65rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => { setMediaPickerTarget('gallery'); setIsMediaModalOpen(true); }}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.65rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newGalleryUrl.trim()) {
                        setGallery([...gallery, { url: newGalleryUrl.trim(), type: newGalleryType, name: newGalleryName.trim() || undefined }]);
                        setNewGalleryUrl('');
                        setNewGalleryName('');
                      } else {
                        showToast('error', 'Please enter or select a valid media URL');
                      }
                    }}
                    style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Add File
                  </button>
                </div>
              </label>
            </div>

            {/* Gallery list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Configured Files ({gallery.length})</span>
              {gallery.map((media, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#121416', border: '1px solid rgba(255,255,255,0.04)', padding: '0.75rem 1.25rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ background: 'rgba(185,120,59,0.1)', padding: '0.5rem', borderRadius: '6px', color: '#B9783B', display: 'flex', alignItems: 'center' }}>
                      {media.type === 'image' && <ImageIcon size={18} />}
                      {media.type === 'video' && <Film size={18} />}
                      {media.type === 'document' && <FileText size={18} />}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                        {media.name || `Unnamed ${media.type}`}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                        {media.url}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGallery(gallery.filter((_, i) => i !== idx))}
                    style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.5rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {gallery.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: '#121416', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', color: '#D8C7AF', opacity: 0.5, fontSize: '0.85rem' }}>
                  No media files added. Add images, videos, and PDFs to showcase in the public view.
                </div>
              )}
            </div>
          </div>

          {/* Relations Card */}
          {type === 'adventure' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Experience Features & Relations
              </h2>

              {/* Assets selection */}
              <div>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'white', marginBottom: '0.75rem' }}>
                  Vessels & Gear (Assets)
                </span>
                
                {/* Vessels Section */}
                <div style={{ marginBottom: '1.25rem', background: '#121416', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Vessel Options (Main Assets - Choose One at Booking)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {allAssets.filter(a => a.isVessel).map(asset => {
                      const isChecked = linkedAssets.includes(asset.slug);
                      return (
                        <label 
                          key={asset.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            background: isChecked ? 'rgba(185,120,59,0.1)' : '#1E2124', 
                            border: isChecked ? '1px solid rgba(185,120,59,0.3)' : '1px solid rgba(255,255,255,0.06)', 
                            borderRadius: '6px', 
                            padding: '0.65rem 1rem', 
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: '#F4F1EA',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setLinkedAssets([...linkedAssets, asset.slug]);
                              } else {
                                setLinkedAssets(linkedAssets.filter(s => s !== asset.slug));
                              }
                            }}
                            style={{ accentColor: '#B9783B', width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span>{asset.title} <span style={{ opacity: 0.5 }}>(${asset.hourlyRate}/hr)</span></span>
                        </label>
                      );
                    })}
                    {allAssets.filter(a => a.isVessel).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No vessels available.</span>
                    )}
                  </div>
                </div>

                {/* Gear Section */}
                <div style={{ background: '#121416', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                    Gear & Add-ons (Multiple Options at Booking)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {allAssets.filter(a => !a.isVessel).map(asset => {
                      const isChecked = linkedAssets.includes(asset.slug);
                      const isAddon = addonAssetSlugs.includes(asset.slug);
                      return (
                        <div 
                          key={asset.id} 
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            background: isChecked ? 'rgba(185,120,59,0.04)' : '#1E2124',
                            border: isChecked ? '1px solid rgba(185,120,59,0.2)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '6px',
                            padding: '0.75rem 1rem',
                            transition: 'all 0.2s',
                            gap: '0.4rem'
                          }}
                        >
                          <label 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              color: '#F4F1EA',
                              userSelect: 'none',
                              margin: 0
                            }}
                          >
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setLinkedAssets([...linkedAssets, asset.slug]);
                                } else {
                                  setLinkedAssets(linkedAssets.filter(s => s !== asset.slug));
                                  setAddonAssetSlugs(addonAssetSlugs.filter(s => s !== asset.slug));
                                }
                              }}
                              style={{ accentColor: '#B9783B', width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: isChecked ? 600 : 400 }}>{asset.title} <span style={{ opacity: 0.5 }}>(${asset.hourlyRate}/hr)</span></span>
                          </label>

                          {isChecked && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#D8C7AF', cursor: 'pointer', marginLeft: '1.25rem', userSelect: 'none', margin: 0 }}>
                              <input 
                                type="checkbox"
                                checked={isAddon}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setAddonAssetSlugs([...addonAssetSlugs, asset.slug]);
                                  } else {
                                    setAddonAssetSlugs(addonAssetSlugs.filter(s => s !== asset.slug));
                                  }
                                }}
                                style={{ accentColor: '#B9783B', width: '13px', height: '13px', cursor: 'pointer' }}
                              />
                              <span>Charge as Optional Add-on (paid by customer)</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                    {allAssets.filter(a => !a.isVessel).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No gear/add-ons available.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Locations selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'white' }}>
                  Explore Stops (Locations)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {allLocations.map(loc => {
                    const isChecked = linkedLocations.includes(loc.slug);
                    return (
                      <label 
                        key={loc.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          background: isChecked ? 'rgba(185,120,59,0.1)' : '#121416', 
                          border: isChecked ? '1px solid rgba(185,120,59,0.3)' : '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '6px', 
                          padding: '0.65rem 1rem', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#F4F1EA',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setLinkedLocations([...linkedLocations, loc.slug]);
                            } else {
                              setLinkedLocations(linkedLocations.filter(s => s !== loc.slug));
                            }
                          }}
                          style={{ accentColor: '#B9783B', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{loc.title}</span>
                      </label>
                    );
                  })}
                  {allLocations.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No locations available to link.</span>
                  )}
                </div>

                {/* Geographic relocation constraints start/end locations selection */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                  <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'white', marginBottom: '0.75rem' }}>
                    Geographic Constraints (Ports / Locations)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>
                        Default Starting Port
                      </label>
                      <select
                        value={startLocation}
                        onChange={e => setStartLocation(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                      >
                        <option value="">-- Select Starting Location --</option>
                        {allLocations.map(loc => (
                          <option key={loc.id} value={loc.slug}>{loc.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.05em' }}>
                        Default Ending Port
                      </label>
                      <select
                        value={endLocation}
                        onChange={e => setEndLocation(e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                      >
                        <option value="">-- Select Ending Location --</option>
                        {allLocations.map(loc => (
                          <option key={loc.id} value={loc.slug}>{loc.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crew selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'white' }}>
                  Assigned Crew & Guides (Staff)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {allStaff.map(member => {
                    const isChecked = linkedStaff.includes(member.slug);
                    return (
                      <label 
                        key={member.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          background: isChecked ? 'rgba(185,120,59,0.1)' : '#121416', 
                          border: isChecked ? '1px solid rgba(185,120,59,0.3)' : '1px solid rgba(255,255,255,0.06)', 
                          borderRadius: '6px', 
                          padding: '0.65rem 1rem', 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          color: '#F4F1EA',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setLinkedStaff([...linkedStaff, member.slug]);
                            } else {
                              setLinkedStaff(linkedStaff.filter(s => s !== member.slug));
                            }
                          }}
                          style={{ accentColor: '#B9783B', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{member.title} ({member.role || 'Crew'})</span>
                      </label>
                    );
                  })}
                  {allStaff.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No crew members available to link.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC EXTENSION: ADVENTURE */}
          {type === 'adventure' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Adventure Specifications
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Departure Location
                    <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', position: 'relative' }}>
                      <MapPin size={16} color="#B9783B" style={{ marginRight: '0.25rem' }} />
                      <input 
                        ref={inputCallbackRef}
                        type="text"
                        value={location}
                        onChange={e => handleLocationChange(e.target.value)}
                        placeholder="Search or type departure location..."
                        style={{ padding: '0.75rem 2.2rem 0.75rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', flex: 1 }}
                      />
                      {isSearchingNominatim && (
                        <div style={{ position: 'absolute', right: location ? '2.5rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: '#B9783B' }} />
                        </div>
                      )}
                      {location && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('');
                            setAddress('');
                            setLatitude(null);
                            setLongitude(null);
                            setNominatimSuggestions([]);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }}
                        >
                          <X size={16} />
                        </button>
                      )}

                      {/* Nominatim Fallback Dropdown */}
                      {(mapsApiError || !isMapsApiLoaded) && nominatimSuggestions.length > 0 && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            background: '#1E2124', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '6px', 
                            marginTop: '4px', 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            zIndex: 100,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            textAlign: 'left'
                          }}
                        >
                          {nominatimSuggestions.map((suggestion) => {
                            const parts = suggestion.display_name.split(',');
                            const title = parts[0];
                            const subtitle = parts.slice(1).join(',').trim();
                            
                            return (
                              <div
                                key={suggestion.place_id}
                                onClick={() => {
                                  setLocation(title);
                                  setAddress(suggestion.display_name);
                                  setLatitude(parseFloat(suggestion.lat));
                                  setLongitude(parseFloat(suggestion.lon));
                                  setNominatimSuggestions([]);
                                }}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  fontSize: '0.85rem'
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ color: '#F4F1EA', fontWeight: 600 }}>{title}</div>
                                <div style={{ color: '#D8C7AF', fontSize: '0.75rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>
                  
                  {address && (
                    <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.85, padding: '0.25rem 0' }}>
                      <strong>Resolved Address:</strong> {address}
                    </div>
                  )}

                  {latitude !== null && longitude !== null && (
                    <div style={{ marginTop: '0.25rem', height: '220px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                      <iframe
                        title="Departure Location Map Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`}
                      />
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          position: 'absolute', 
                          bottom: '10px', 
                          right: '10px', 
                          background: 'rgba(30, 33, 36, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: '#D8C7AF', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          textDecoration: 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem' 
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'white'}
                        onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}
                      >
                        <ExternalLink size={12} />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Base Price & Currency
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="number"
                      value={basePrice}
                      onChange={e => setBasePrice(Number(e.target.value))}
                      min={0}
                      style={{ flex: 1, padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%' }}
                    />
                    <select
                      value={currency}
                      onChange={e => setCurrency(e.target.value)}
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', minWidth: '85px' }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                    </select>
                  </div>
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  <span>Itinerary Duration (Calculated)</span>
                  <div style={{ 
                    padding: '0.65rem 0.75rem', 
                    background: '#1A1C1E', 
                    border: '1px solid rgba(255,255,255,0.06)', 
                    borderRadius: '6px', 
                    color: '#D8C7AF', 
                    fontSize: '0.825rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '43px',
                    boxSizing: 'border-box'
                  }}>
                    <div>Guest Time: <strong style={{ color: 'white' }}>{formatDurationHelper(guestMins)}</strong></div>
                    <div>Crew Time: <strong style={{ color: 'white' }}>{formatDurationHelper(crewMins)}</strong></div>
                  </div>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Max Guest Capacity
                  <input 
                    type="number"
                    value={maxGuests}
                    onChange={e => setMaxGuests(Number(e.target.value))}
                    min={1}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>
              </div>

              {/* Included Items Builder */}
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  What's Included
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', position: 'relative' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input 
                      type="text"
                      value={newIncludedItem}
                      onChange={e => {
                        setNewIncludedItem(e.target.value);
                        setShowLibraryDropdown(true);
                      }}
                      onFocus={() => setShowLibraryDropdown(true)}
                      placeholder="Search or type what's included..."
                      onKeyDown={e => { 
                        if (e.key === 'Enter') { 
                          e.preventDefault(); 
                          handleAddOrRecommend(); 
                        } 
                      }}
                      style={{ width: '100%', padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                    />

                    {/* Suggestions Dropdown */}
                    {showLibraryDropdown && newIncludedItem.trim() && (
                      <div 
                        style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          left: 0, 
                          right: 0, 
                          background: '#1E2124', 
                          border: '1px solid rgba(255,255,255,0.08)', 
                          borderRadius: '6px', 
                          marginTop: '4px', 
                          maxHeight: '200px', 
                          overflowY: 'auto', 
                          zIndex: 50,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }}
                      >
                        {suggestions.map(suggestion => (
                          <div
                            key={suggestion.id}
                            onClick={() => {
                              setIncludedItems([...includedItems, suggestion.name]);
                              setNewIncludedItem('');
                              setShowLibraryDropdown(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.75rem',
                              cursor: 'pointer',
                              color: '#D8C7AF',
                              fontSize: '0.85rem',
                              borderBottom: '1px solid rgba(255,255,255,0.03)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#D8C7AF';
                            }}
                          >
                            <span style={{ color: '#B9783B', display: 'flex', alignItems: 'center' }}>
                              {renderIconByName(suggestion.iconName)}
                            </span>
                            <span>{suggestion.name}</span>
                          </div>
                        ))}

                        {/* Option to create a new one */}
                        {!includedLibrary.some(libItem => libItem.name.toLowerCase() === newIncludedItem.toLowerCase().trim()) && (
                          <div
                            onClick={handleAddOrRecommend}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.6rem 0.75rem',
                              cursor: 'pointer',
                              color: '#B9783B',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(185, 120, 59, 0.1)'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Plus size={14} />
                            <span>Create new item "{newIncludedItem.trim()}"</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={handleAddOrRecommend}
                    style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', height: '38px', flexShrink: 0 }}
                  >
                    Add
                  </button>
                </div>

                {/* Close Dropdown on click outside */}
                {showLibraryDropdown && (
                  <div 
                    onClick={() => setShowLibraryDropdown(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                  />
                )}

                {/* Inline Creator Box */}
                {showCreateItemSection && (
                  <div style={{ marginTop: '0.5rem', marginBottom: '1rem', background: '#121416', border: '1px dashed rgba(185, 120, 59, 0.4)', borderRadius: '6px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', zIndex: 45 }}>
                    <div style={{ fontSize: '0.85rem', color: '#D8C7AF' }}>
                      Configure icon for new item <strong>"{newItemName}"</strong>:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {['Fuel', 'Utensils', 'GlassWater', 'Users', 'Compass', 'Sparkles', 'Wifi', 'Music', 'Shield', 'DollarSign', 'Waves', 'Check'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewItemIcon(icon)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '4px',
                            border: newItemIcon === icon ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                            background: newItemIcon === icon ? 'rgba(185, 120, 59, 0.15)' : 'rgba(255,255,255,0.02)',
                            color: newItemIcon === icon ? 'white' : '#D8C7AF',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            {renderIconByName(icon)}
                          </span>
                          <span>{icon}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={saveNewIncludedItemToLib}
                        disabled={isSavingLibraryItem}
                        style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.45rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', opacity: isSavingLibraryItem ? 0.6 : 1 }}
                      >
                        {isSavingLibraryItem ? 'Saving...' : 'Save & Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateItemSection(false)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Selected Items Tags list */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {includedItems.map((item, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(185,120,59,0.12)',
                        border: '1px solid rgba(185,120,59,0.3)',
                        borderRadius: '20px',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.825rem',
                        color: '#F4F1EA'
                      }}
                    >
                      <span style={{ color: '#B9783B', display: 'flex', alignItems: 'center' }}>
                        {renderIconByName(
                          includedLibrary.find(libItem => libItem.name.toLowerCase() === item.toLowerCase())?.iconName || 'Check'
                        )}
                      </span>
                      <span>{item}</span>
                      <button 
                        type="button" 
                        onClick={() => removeIncludedItem(index)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', marginLeft: '0.2rem' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {includedItems.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No items added yet.</span>
                  )}
                </div>
              </div>

              {/* Departure Start Times Manager */}
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Departure Start Times (24h format, HH:MM)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input 
                    type="text"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    placeholder="e.g. 09:00 or 13:30"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStartTime(); } }}
                    style={{ flex: 1, padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button 
                    type="button"
                    onClick={addStartTime}
                    style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Add Time
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {startTimes.map((time, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'rgba(185,120,59,0.12)',
                        border: '1px solid rgba(185,120,59,0.3)',
                        borderRadius: '20px',
                        padding: '0.3rem 0.75rem',
                        fontSize: '0.8rem',
                        color: '#F4F1EA'
                      }}
                    >
                      <span>{time}</span>
                      <button 
                        type="button" 
                        onClick={() => removeStartTime(time)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {startTimes.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No departure times added yet.</span>
                  )}
                </div>
              </div>

              {/* Exclusive Non-Asset Add-ons Manager */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Exclusive Experience Add-ons (Food, Drinks, Services)
                </label>
                
                {/* Global Catalog Quick-Add */}
                {globalAddons.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, display: 'block', marginBottom: '0.35rem' }}>
                      Quick Add from Global Catalog:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {globalAddons.map(globalItem => {
                        const isAlreadyAdded = addons.some(a => a.name.toLowerCase() === globalItem.name.toLowerCase());
                        return (
                          <button
                            key={globalItem.id}
                            type="button"
                            disabled={isAlreadyAdded}
                            onClick={() => {
                              setAddons([...addons, { name: globalItem.name, price: globalItem.price, description: globalItem.description }]);
                            }}
                            style={{
                              background: isAlreadyAdded ? 'rgba(255,255,255,0.02)' : 'rgba(185,120,59,0.12)',
                              border: isAlreadyAdded ? '1px dashed rgba(255,255,255,0.06)' : '1px solid rgba(185,120,59,0.3)',
                              color: isAlreadyAdded ? '#888' : '#B9783B',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '15px',
                              fontSize: '0.75rem',
                              cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                          >
                            + {globalItem.name} (${globalItem.price})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add Custom Add-on Form */}
                <div style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Add Custom Add-on
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '0.5rem' }}>
                    <input 
                      type="text"
                      placeholder="Add-on Name (e.g. Premium Champagne Flight)"
                      value={newAddonName}
                      onChange={e => setNewAddonName(e.target.value)}
                      style={{ padding: '0.5rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', paddingRight: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5, paddingLeft: '0.5rem' }}>$</span>
                      <input 
                        type="number"
                        placeholder="Price"
                        value={newAddonName === '' ? '' : (newAddonPrice === '' ? '' : newAddonPrice)}
                        onChange={e => setNewAddonPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        min={0}
                        style={{ flex: 1, padding: '0.5rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text"
                      placeholder="Short description of this add-on package..."
                      value={newAddonDescription}
                      onChange={e => setNewAddonDescription(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newAddonName.trim()) return;
                        setAddons([...addons, { name: newAddonName.trim(), price: Number(newAddonPrice) || 0, description: newAddonDescription.trim() }]);
                        setNewAddonName('');
                        setNewAddonPrice('');
                        setNewAddonDescription('');
                      }}
                      style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Active Add-ons List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {addons.map((addon, index) => (
                    <div 
                      key={index}
                      style={{
                        background: '#121416',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#B9783B', fontWeight: 600 }}>
                          {addon.name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', paddingRight: '0.4rem', width: '90px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5, paddingLeft: '0.4rem' }}>$</span>
                            <input 
                              type="number"
                              value={addon.price}
                              onChange={e => {
                                const val = Number(e.target.value);
                                const updated = [...addons];
                                updated[index].price = val;
                                setAddons(updated);
                              }}
                              min={0}
                              style={{ flex: 1, padding: '0.25rem 0.15rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.75rem', outline: 'none', textAlign: 'right' }}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => {
                              setAddons(addons.filter((_, i) => i !== index));
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={addon.description}
                        onChange={e => {
                          const val = e.target.value;
                          const updated = [...addons];
                          updated[index].description = val;
                          setAddons(updated);
                        }}
                        placeholder="Description..."
                        rows={1}
                        style={{ padding: '0.35rem 0.5rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', color: 'white', fontSize: '0.75rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  ))}
                  {addons.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#121416', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.4, fontSize: '0.8rem' }}>
                      No add-on products linked yet. Use catalog or custom form to add.
                    </div>
                  )}
                </div>
              </div>

              {/* Itinerary Steps Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Itinerary / Schedule</label>
                  <button 
                    type="button"
                    onClick={addItineraryStep}
                    style={{
                      background: 'rgba(185,120,59,0.15)',
                      border: '1px solid rgba(185,120,59,0.3)',
                      color: '#B9783B',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(185,120,59,0.25)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(185,120,59,0.15)'}
                  >
                    <Plus size={14} /> Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {itinerary.map((step, index) => (
                    <div 
                      key={index}
                      style={{
                        background: '#121416',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        padding: '1.25rem',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Step {index + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button 
                            type="button" 
                            onClick={() => moveItineraryStep(index, 'up')}
                            disabled={index === 0}
                            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', opacity: index === 0 ? 0.3 : 0.7, cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => moveItineraryStep(index, 'down')}
                            disabled={index === itinerary.length - 1}
                            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', opacity: index === itinerary.length - 1 ? 0.3 : 0.7, cursor: index === itinerary.length - 1 ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => removeItineraryStep(index)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                        <input 
                          type="text"
                          value={step.title}
                          onChange={e => updateItineraryStep(index, 'title', e.target.value)}
                          placeholder="Step Title (e.g. Departure from Dock)"
                          style={{ padding: '0.65rem 0.75rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                          required
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', paddingRight: '0.75rem' }}>
                          <input 
                            type="number"
                            value={step.offsetMinutes || 0}
                            onChange={e => updateItineraryStep(index, 'offsetMinutes', Number(e.target.value))}
                            min={0}
                            placeholder="+ Mins"
                            title="Minutes offset from previous step (incremental)"
                            style={{ flex: 1, padding: '0.65rem 0.25rem 0.65rem 0.75rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5 }}>min</span>
                        </div>
                      </div>

                      <textarea 
                        value={step.description}
                        onChange={e => updateItineraryStep(index, 'description', e.target.value)}
                        placeholder="Step details & description..."
                        rows={2}
                        style={{ padding: '0.65rem 0.75rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                      />

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: '#D8C7AF' }}>
                        Connect to Location
                        <select 
                          value={step.locationSlug || ''}
                          onChange={e => updateItineraryStep(index, 'locationSlug', e.target.value)}
                          style={{ padding: '0.65rem 0.75rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="">-- No Location Linked --</option>
                          {allLocations.map(loc => (
                            <option key={loc.id} value={loc.slug}>
                              {loc.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#D8C7AF', cursor: 'pointer', alignSelf: 'flex-start' }}>
                        <input 
                          type="checkbox"
                          checked={!!step.isCrewOnly}
                          onChange={e => updateItineraryStep(index, 'isCrewOnly', e.target.checked)}
                          style={{ width: '14px', height: '14px', accentColor: '#B9783B', cursor: 'pointer' }}
                        />
                        <span>Crew-Only Milestone (Hidden from public adventure schedule)</span>
                      </label>
                    </div>
                  ))}
                  {itinerary.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', background: '#121416', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)', color: '#D8C7AF', opacity: 0.5, fontSize: '0.85rem' }}>
                      No itinerary steps added. Click "Add Step" to configure the schedule.
                    </div>
                  )}
                </div>

                {/* Time Summary under Itinerary Steps */}
                {itinerary.length > 0 && (
                  <div style={{ 
                    marginTop: '1.25rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>Itinerary Summary:</span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ background: 'rgba(185, 120, 59, 0.1)', border: '1px solid rgba(185, 120, 59, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600 }}>
                        <Clock size={13} />
                        <span>Experience Time: {formatDurationHelper(guestMins)}</span>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.35rem 0.75rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#D8C7AF', fontWeight: 600 }}>
                        <Users size={13} />
                        <span>Crew Time: {formatDurationHelper(crewMins)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DYNAMIC EXTENSION: ASSET */}
          {type === 'asset' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Asset Specifications
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Dock / Harbor Location
                    <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', position: 'relative' }}>
                      <MapPin size={16} color="#B9783B" style={{ marginRight: '0.25rem' }} />
                      <input 
                        ref={inputCallbackRef}
                        type="text"
                        value={location}
                        onChange={e => handleLocationChange(e.target.value)}
                        placeholder="Search or type dock/harbor location..."
                        style={{ padding: '0.75rem 2.2rem 0.75rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', flex: 1 }}
                      />
                      {isSearchingNominatim && (
                        <div style={{ position: 'absolute', right: location ? '2.5rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: '#B9783B' }} />
                        </div>
                      )}
                      {location && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('');
                            setAddress('');
                            setLatitude(null);
                            setLongitude(null);
                            setNominatimSuggestions([]);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }}
                        >
                          <X size={16} />
                        </button>
                      )}

                      {/* Nominatim Fallback Dropdown */}
                      {(mapsApiError || !isMapsApiLoaded) && nominatimSuggestions.length > 0 && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            background: '#1E2124', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '6px', 
                            marginTop: '4px', 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            zIndex: 100,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            textAlign: 'left'
                          }}
                        >
                          {nominatimSuggestions.map((suggestion) => {
                            const parts = suggestion.display_name.split(',');
                            const title = parts[0];
                            const subtitle = parts.slice(1).join(',').trim();
                            
                            return (
                              <div
                                key={suggestion.place_id}
                                onClick={() => {
                                  setLocation(title);
                                  setAddress(suggestion.display_name);
                                  setLatitude(parseFloat(suggestion.lat));
                                  setLongitude(parseFloat(suggestion.lon));
                                  setNominatimSuggestions([]);
                                }}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  fontSize: '0.85rem'
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ color: '#F4F1EA', fontWeight: 600 }}>{title}</div>
                                <div style={{ color: '#D8C7AF', fontSize: '0.75rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>
                  
                  {address && (
                    <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.85, padding: '0.25rem 0' }}>
                      <strong>Resolved Address:</strong> {address}
                    </div>
                  )}

                  {latitude !== null && longitude !== null && (
                    <div style={{ marginTop: '0.25rem', height: '220px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                      <iframe
                        title="Dock Location Map Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`}
                      />
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          position: 'absolute', 
                          bottom: '10px', 
                          right: '10px', 
                          background: 'rgba(30, 33, 36, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: '#D8C7AF', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          textDecoration: 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem' 
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'white'}
                        onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}
                      >
                        <ExternalLink size={12} />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Category
                  <input 
                    type="text"
                    value={assetCategory}
                    onChange={e => setAssetCategory(e.target.value)}
                    placeholder="e.g. Boat, Jet Ski, Camera"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Make / Brand
                  <input 
                    type="text"
                    value={assetMake}
                    onChange={e => setAssetMake(e.target.value)}
                    placeholder="e.g. Boston Whaler"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Model
                  <input 
                    type="text"
                    value={assetModel}
                    onChange={e => setAssetModel(e.target.value)}
                    placeholder="e.g. Outrage 330"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Hourly Rental Rate (USD)
                  <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem' }}>
                    <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.875rem' }}>$</span>
                    <input 
                      type="number"
                      min={0}
                      value={assetHourlyRate}
                      onChange={e => setAssetHourlyRate(Number(e.target.value))}
                      placeholder="e.g. 250"
                      style={{ flex: 1, padding: '0.75rem 0.75rem 0.75rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </div>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Associated Owner
                  <select 
                    value={assetOwnerId}
                    onChange={e => setAssetOwnerId(e.target.value)}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', height: '45px' }}
                  >
                    <option value="">-- Select Owner --</option>
                    {allOwners.map(owner => (
                      <option key={owner.id} value={owner.id}>
                        {owner.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '45px', marginTop: '1.35rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.75rem 1rem', color: 'white', fontSize: '0.875rem', cursor: 'pointer', flex: 1, height: '100%', transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox"
                      checked={assetIsVessel}
                      onChange={e => setAssetIsVessel(e.target.checked)}
                      style={{ accentColor: '#B9783B', width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>Mark as Vessel (Main Asset)</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Home Location / Port
                  <select 
                    value={assetHomeLocation}
                    onChange={e => setAssetHomeLocation(e.target.value)}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', height: '45px' }}
                  >
                    <option value="">-- Select Location --</option>
                    {allLocations.map(loc => (
                      <option key={loc.id} value={loc.slug}>
                        {loc.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Quantity Available
                  <input 
                    type="number"
                    min={1}
                    value={assetQuantity}
                    onChange={e => setAssetQuantity(Number(e.target.value))}
                    placeholder="e.g. 1"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', height: '45px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Relocation Speed (Knots)
                  <input 
                    type="number"
                    min={0}
                    value={assetRelocationSpeed}
                    onChange={e => setAssetRelocationSpeed(Number(e.target.value))}
                    placeholder="e.g. 0"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', height: '45px' }}
                  />
                </label>
              </div>

              {/* Asset Key-Value Specs Builder */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Specifications List</label>
                  <button 
                    type="button"
                    onClick={addSpec}
                    style={{
                      background: 'rgba(185,120,59,0.15)',
                      border: '1px solid rgba(185,120,59,0.3)',
                      color: '#B9783B',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Plus size={14} /> Add Spec Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {assetSpecs.map((spec, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="text"
                        value={spec.key}
                        onChange={e => updateSpec(index, 'key', e.target.value)}
                        placeholder="Spec Name (e.g. Length)"
                        style={{ flex: 1, padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                        required
                      />
                      <input 
                        type="text"
                        value={spec.value}
                        onChange={e => updateSpec(index, 'value', e.target.value)}
                        placeholder="Value (e.g. 33 ft)"
                        style={{ flex: 1, padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => removeSpec(index)}
                        style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.5rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {assetSpecs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1rem', background: '#121416', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.5, fontSize: '0.85rem' }}>
                      No specifications defined.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {type === 'asset' && !isNew && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="#B9783B" />
                Asset Blackout & Maintenance Schedule
              </h2>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#D8C7AF', opacity: 0.7 }}>
                Define blockout dates for maintenance, private charters, or seasonal availability. The vessel will not be bookable on the customer calendar during these periods.
              </p>

              {/* Add Blackout Form */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#B9783B' }}>Add New Blackout Period</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Title / Reason
                    <input 
                      type="text"
                      value={newBlackoutTitle}
                      onChange={e => setNewBlackoutTitle(e.target.value)}
                      placeholder="e.g. Annual Hull Inspection"
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Start Date
                    <DatePicker 
                      value={newBlackoutStartDate}
                      onChange={setNewBlackoutStartDate}
                      placeholder="mm / dd / yyyy"
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Start Time
                    <input 
                      type="time"
                      value={newBlackoutStartTime}
                      onChange={e => setNewBlackoutStartTime(e.target.value)}
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    End Date
                    <DatePicker 
                      value={newBlackoutEndDate}
                      onChange={setNewBlackoutEndDate}
                      placeholder="mm / dd / yyyy"
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    End Time
                    <input 
                      type="time"
                      value={newBlackoutEndTime}
                      onChange={e => setNewBlackoutEndTime(e.target.value)}
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', colorScheme: 'dark' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Notes (Optional)</label>
                  <textarea 
                    value={newBlackoutNotes}
                    onChange={e => setNewBlackoutNotes(e.target.value)}
                    placeholder="Provide details about the blockout (internal reference only)"
                    rows={2}
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleAddBlackout}
                    disabled={isAddingBlackout}
                    style={{
                      background: '#B9783B',
                      color: 'white',
                      border: 'none',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background 0.2s',
                      opacity: isAddingBlackout ? 0.6 : 1
                    }}
                    onMouseOver={e => !isAddingBlackout && (e.currentTarget.style.background = '#A0632E')}
                    onMouseOut={e => !isAddingBlackout && (e.currentTarget.style.background = '#B9783B')}
                  >
                    {isAddingBlackout ? 'Adding...' : 'Schedule Blackout'}
                  </button>
                </div>
              </div>

              {/* Scheduled Blackouts List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Scheduled Periods</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {assetBlackouts.map((b) => (
                    <div 
                      key={b.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#121416', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '6px', 
                        padding: '1rem' 
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'white' }}>{b.title}</span>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(185,120,59,0.15)', color: '#B9783B', padding: '2px 6px', borderRadius: '4px' }}>
                            {b.startDate} {b.startTime && `@ ${b.startTime}`} to {b.endDate} {b.endTime && `@ ${b.endTime}`}
                          </span>
                        </div>
                        {b.notes && (
                          <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.6 }}>{b.notes}</span>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(b.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {assetBlackouts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', background: '#121416', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)', color: '#D8C7AF', opacity: 0.5 }}>
                      No blackout periods scheduled for this vessel.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC EXTENSION: STAFF */}
          {type === 'staff' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Staff Information
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Primary Port / Location
                    <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', position: 'relative' }}>
                      <MapPin size={16} color="#B9783B" style={{ marginRight: '0.25rem' }} />
                      <input 
                        ref={inputCallbackRef}
                        type="text"
                        value={location}
                        onChange={e => handleLocationChange(e.target.value)}
                        placeholder="Search or type primary port/location..."
                        style={{ padding: '0.75rem 2.2rem 0.75rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', flex: 1 }}
                      />
                      {isSearchingNominatim && (
                        <div style={{ position: 'absolute', right: location ? '2.5rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: '#B9783B' }} />
                        </div>
                      )}
                      {location && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('');
                            setAddress('');
                            setLatitude(null);
                            setLongitude(null);
                            setNominatimSuggestions([]);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', padding: '0 0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 10 }}
                        >
                          <X size={16} />
                        </button>
                      )}

                      {/* Nominatim Fallback Dropdown */}
                      {(mapsApiError || !isMapsApiLoaded) && nominatimSuggestions.length > 0 && (
                        <div 
                          style={{ 
                            position: 'absolute', 
                            top: '100%', 
                            left: 0, 
                            right: 0, 
                            background: '#1E2124', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '6px', 
                            marginTop: '4px', 
                            maxHeight: '200px', 
                            overflowY: 'auto', 
                            zIndex: 100,
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                            textAlign: 'left'
                          }}
                        >
                          {nominatimSuggestions.map((suggestion) => {
                            const parts = suggestion.display_name.split(',');
                            const title = parts[0];
                            const subtitle = parts.slice(1).join(',').trim();
                            
                            return (
                              <div
                                key={suggestion.place_id}
                                onClick={() => {
                                  setLocation(title);
                                  setAddress(suggestion.display_name);
                                  setLatitude(parseFloat(suggestion.lat));
                                  setLongitude(parseFloat(suggestion.lon));
                                  setNominatimSuggestions([]);
                                }}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  fontSize: '0.85rem'
                                }}
                                onMouseOver={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseOut={e => {
                                  e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <div style={{ color: '#F4F1EA', fontWeight: 600 }}>{title}</div>
                                <div style={{ color: '#D8C7AF', fontSize: '0.75rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>
                  
                  {address && (
                    <div style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.85, padding: '0.25rem 0' }}>
                      <strong>Resolved Address:</strong> {address}
                    </div>
                  )}

                  {latitude !== null && longitude !== null && (
                    <div style={{ marginTop: '0.25rem', height: '220px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                      <iframe
                        title="Primary Location Map Preview"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://maps.google.com/maps?q=${latitude},${longitude}&z=14&output=embed`}
                      />
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ 
                          position: 'absolute', 
                          bottom: '10px', 
                          right: '10px', 
                          background: 'rgba(30, 33, 36, 0.95)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: '#D8C7AF', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          textDecoration: 'none', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem' 
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'white'}
                        onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}
                      >
                        <ExternalLink size={12} />
                        View on Google Maps
                      </a>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Role / Title (e.g. Captain, Chef)
                    <input 
                      type="text"
                      value={staffRole}
                      onChange={e => setStaffRole(e.target.value)}
                      placeholder="e.g. Chief Stewardess"
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%' }}
                      required
                    />
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Star Rating (1 - 5)
                    <select
                      value={staffRating}
                      onChange={e => setStaffRating(Number(e.target.value))}
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', width: '100%', cursor: 'pointer' }}
                    >
                      <option value={5}>5.0 Stars (Excellent)</option>
                      <option value={4.9}>4.9 Stars</option>
                      <option value={4.8}>4.8 Stars</option>
                      <option value={4.7}>4.7 Stars</option>
                      <option value={4.6}>4.6 Stars</option>
                      <option value={4.5}>4.5 Stars (Very Good)</option>
                      <option value={4}>4.0 Stars</option>
                      <option value={3}>3.0 Stars</option>
                      <option value={2}>2.0 Stars</option>
                      <option value={1}>1.0 Star</option>
                    </select>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.75rem 1rem' }}>
                  <input 
                    type="checkbox"
                    checked={staffIsCaptain}
                    onChange={e => setStaffIsCaptain(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#B9783B', cursor: 'pointer' }}
                  />
                  <span>Is a Contracting Captain</span>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Captain's Hourly Rate (USD)
                  <input 
                    type="number"
                    value={staffDailyRate}
                    onChange={e => setStaffDailyRate(Number(e.target.value))}
                    min={0}
                    disabled={!staffIsCaptain}
                    style={{ padding: '0.75rem', background: staffIsCaptain ? '#121416' : '#1A1C1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: staffIsCaptain ? 'white' : '#888', fontSize: '0.875rem', outline: 'none', cursor: staffIsCaptain ? 'text' : 'not-allowed' }}
                  />
                </label>
              </div>

              {staffIsCaptain && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'white' }}>
                    Vessel Certifications / Endorsements
                  </label>
                  <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, margin: '0 0 1rem 0' }}>
                    Select the vessels this captain is certified to skipper. This dictates which captain options are shown in the booking selector for linked experiences.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {allAssets.filter(a => a.isVessel).map(asset => {
                      const isChecked = staffCertifiedVessels.includes(asset.slug);
                      return (
                        <label 
                          key={asset.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            background: isChecked ? 'rgba(185,120,59,0.1)' : '#121416', 
                            border: isChecked ? '1px solid rgba(185,120,59,0.3)' : '1px solid rgba(255,255,255,0.06)', 
                            borderRadius: '6px', 
                            padding: '0.65rem 1rem', 
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            color: '#F4F1EA',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setStaffCertifiedVessels([...staffCertifiedVessels, asset.slug]);
                              } else {
                                setStaffCertifiedVessels(staffCertifiedVessels.filter(s => s !== asset.slug));
                              }
                            }}
                            style={{ accentColor: '#B9783B', width: '15px', height: '15px', cursor: 'pointer' }}
                          />
                          <span>{asset.title}</span>
                        </label>
                      );
                    })}
                    {allAssets.filter(a => a.isVessel).length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.5 }}>No vessels (main assets) available to certify.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications builder */}
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Certifications & Qualifications
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input 
                    type="text"
                    value={newCert}
                    onChange={e => setNewCert(e.target.value)}
                    placeholder="e.g. USCG 100 Ton Master License, STCW95"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }}
                    style={{ flex: 1, padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button type="button" onClick={addCert} style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {staffCertifications.map((cert, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(185,120,59,0.12)', border: '1px solid rgba(185,120,59,0.3)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#F4F1EA' }}>
                      <span>{cert}</span>
                      <button type="button" onClick={() => removeCert(index)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages builder */}
              <div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Languages Spoken
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input 
                    type="text"
                    value={newLang}
                    onChange={e => setNewLang(e.target.value)}
                    placeholder="e.g. English (Native), Spanish (Fluent)"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLang(); } }}
                    style={{ flex: 1, padding: '0.65rem 0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                  <button type="button" onClick={addLang} style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {staffLanguages.map((lang, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(185,120,59,0.12)', border: '1px solid rgba(185,120,59,0.3)', borderRadius: '20px', padding: '0.3rem 0.75rem', fontSize: '0.8rem', color: '#F4F1EA' }}>
                      <span>{lang}</span>
                      <button type="button" onClick={() => removeLang(index)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Biography / Experience
                <textarea 
                  value={staffBio}
                  onChange={e => setStaffBio(e.target.value)}
                  placeholder="Tell customers about this crew member's credentials and experience..."
                  rows={4}
                  style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          )}

          {/* DYNAMIC EXTENSION: LOCATION */}
          {type === 'location' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Location Specifications & Address
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Map Search & Coordinates
                    <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem', position: 'relative' }}>
                      <MapPin size={16} color="#B9783B" style={{ marginRight: '0.25rem' }} />
                      <input 
                        ref={inputCallbackRef}
                        type="text"
                        value={location}
                        onChange={e => handleLocationChange(e.target.value)}
                        placeholder="Search or type destination name..."
                        style={{ padding: '0.75rem 2.2rem 0.75rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none', flex: 1 }}
                      />
                      {isSearchingNominatim && (
                        <div style={{ position: 'absolute', right: location ? '2.5rem' : '0.75rem', display: 'flex', alignItems: 'center' }}>
                          <Loader2 size={14} className="animate-spin" style={{ color: '#B9783B' }} />
                        </div>
                      )}
                      {location && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocation('');
                            setAddress('');
                            setLatitude(null);
                            setLongitude(null);
                            setNominatimSuggestions([]);
                          }}
                          style={{ position: 'absolute', right: '0.75rem', background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', opacity: 0.7 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </label>

                  {/* Nominatim suggestions dropdown */}
                  {nominatimSuggestions.length > 0 && (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                        {nominatimSuggestions.map((sug, idx) => (
                          <div 
                            key={idx}
                          onClick={() => {
                            const parts = sug.display_name.split(',');
                            const title = parts[0];
                            setLocation(title);
                            setAddress(sug.display_name);
                            setLatitude(parseFloat(sug.lat));
                            setLongitude(parseFloat(sug.lon));
                            setNominatimSuggestions([]);
                          }}
                          style={{ padding: '0.65rem 0.85rem', borderBottom: idx < nominatimSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left' }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ fontSize: '0.825rem', color: 'white', fontWeight: 600 }}>{sug.display_name.split(',')[0]}</div>
                          <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sug.display_name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Lat/Long Input Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Manual Latitude
                    <input 
                      type="number"
                      step="any"
                      value={latitude !== null ? latitude : ''}
                      onChange={e => setLatitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="e.g. 30.3935"
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', height: '45px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                    Manual Longitude
                    <input 
                      type="number"
                      step="any"
                      value={longitude !== null ? longitude : ''}
                      onChange={e => setLongitude(e.target.value === '' ? null : parseFloat(e.target.value))}
                      placeholder="e.g. -86.4958"
                      style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', height: '45px' }}
                    />
                  </label>
                </div>
              </div>


              {/* Resolved coordinates info */}
              {latitude && longitude && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: '#121416', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latitude</span>
                    <strong style={{ fontSize: '0.85rem', color: 'white' }}>{latitude.toFixed(6)}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Longitude</span>
                    <strong style={{ fontSize: '0.85rem', color: 'white' }}>{longitude.toFixed(6)}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
                    <strong style={{ fontSize: '0.85rem', color: '#708C84' }}>Resolved</strong>
                  </div>
                  {address && (
                    <div style={{ gridColumn: 'span 3', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.65rem', marginTop: '0.25rem', fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.8 }}>
                      Address: <strong style={{ color: 'white' }}>{address}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Map Preview Frame */}
              {latitude && longitude && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>Map Preview</span>
                  <div style={{ width: '100%', height: '240px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                    <iframe 
                      title="Coordinates Map Preview"
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }}
                      loading="lazy" 
                      allowFullScreen 
                      src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=13&output=embed`}
                    />
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        position: 'absolute', 
                        bottom: '10px', 
                        right: '10px', 
                        background: 'rgba(30, 33, 36, 0.95)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: '#D8C7AF', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        textDecoration: 'none', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.25rem' 
                      }}
                      onMouseOver={e => e.currentTarget.style.color = 'white'}
                      onMouseOut={e => e.currentTarget.style.color = '#D8C7AF'}
                    >
                      <ExternalLink size={12} />
                      View on Google Maps
                    </a>
                  </div>
                </div>
              )}

              {/* Location specific fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Anchor / Dock Status
                  <input 
                    type="text"
                    value={locationAnchorStatus}
                    onChange={e => setLocationAnchorStatus(e.target.value)}
                    placeholder="e.g. Anchor Only / Marina Dock"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Best Time to Visit
                  <input 
                    type="text"
                    value={locationBestTime}
                    onChange={e => setLocationBestTime(e.target.value)}
                    placeholder="e.g. High Tide / Sunset"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Vessel Suitability
                  <input 
                    type="text"
                    value={locationSuitability}
                    onChange={e => setLocationSuitability(e.target.value)}
                    placeholder="e.g. Under 100ft / All Vessels"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* DYNAMIC EXTENSION: OWNER */}
          {type === 'owner' && (
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', margin: 0 }}>
                Owner Profile Settings
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Contact Email
                  <input 
                    type="email"
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    placeholder="owner@example.com"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Contact Phone
                  <input 
                    type="text"
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 123-4567"
                    style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                  />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Revenue Share Percentage (%)
                  <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingRight: '0.75rem' }}>
                    <input 
                      type="number"
                      min={0}
                      max={100}
                      value={ownerRevenueShare}
                      onChange={e => setOwnerRevenueShare(Number(e.target.value))}
                      placeholder="e.g. 65"
                      style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.875rem', outline: 'none' }}
                    />
                    <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.875rem' }}>%</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6 }}>
                    Percentage of the rental revenue allocated to this owner.
                  </span>
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Payment & Payout Details
                <textarea 
                  value={ownerPaymentDetails}
                  onChange={e => setOwnerPaymentDetails(e.target.value)}
                  placeholder="e.g. Bank wire instructions, Routing #, Account #, or mailing address..."
                  rows={4}
                  style={{ padding: '0.75rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '0.875rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </label>
            </div>
          )}

            {/* Validation Errors */}
            {validationError && (
              <div style={{ color: '#EF4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '2rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{validationError}</span>
              </div>
            )}

            <div style={{ height: '4rem' }} />
          </div>

          {/* Budget Sidebar */}
          {type === 'adventure' && (
            <div style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
                  <DollarSign size={20} color="#B9783B" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white' }}>
                    Charter Price Budget
                  </h3>
                </div>

                {/* Experience Base Cost */}
                <div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#D8C7AF' }}>
                    Experience Base Cost
                    <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', paddingLeft: '0.75rem' }}>
                      <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.85rem' }}>$</span>
                      <input 
                        type="number"
                        min={0}
                        value={experienceBaseCost}
                        onChange={e => setExperienceBaseCost(Number(e.target.value))}
                        placeholder="e.g. 150"
                        style={{ flex: 1, padding: '0.5rem 0.5rem 0.5rem 0.25rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                      />
                    </div>
                  </label>
                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5 }}>Fixed costs for provisions, fuel base, ice, etc.</span>
                </div>

                {/* Pre-calculated Asset Rental Costs */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                      Asset Rental Costs
                    </span>
                    {selectedVessels.length > 1 && (
                      <select
                        value={activePreviewVesselSlug}
                        onChange={e => setPreviewVesselSlug(e.target.value)}
                        style={{ background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#D8C7AF', fontSize: '0.75rem', padding: '0.15rem 0.4rem', cursor: 'pointer', outline: 'none' }}
                      >
                        {selectedVessels.map(v => (
                          <option key={v.slug} value={v.slug}>
                            Preview: {v.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#121416', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    {assetCosts.map(item => (
                      <div key={item.slug} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.4rem' }}>
                        <div style={{ color: '#D8C7AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={item.title}>
                          {item.title} <span style={{ opacity: 0.5, fontSize: '0.75rem' }}>(${item.rate}/hr)</span>
                        </div>
                        <span style={{ color: 'white', fontWeight: 600 }}>
                          ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    ))}
                    {assetCosts.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.5, textAlign: 'center', display: 'block', padding: '0.5rem 0' }}>
                        No linked assets.
                      </span>
                    )}
                    {guestHours > 0 && assetCosts.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#B9783B', fontWeight: 600, borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <span>Subtotal ({guestHours.toFixed(1)} hrs Experience Time)</span>
                        <span>${totalAssetCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Line Items */}
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'white', marginBottom: '0.65rem' }}>
                    Custom Budget Line Items
                  </span>
                  
                  {/* Add Custom Item Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#121416', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '0.75rem' }}>
                    <input 
                      type="text"
                      placeholder="Category (e.g. Catering)"
                      value={newBudgetCategory}
                      onChange={e => setNewBudgetCategory(e.target.value)}
                      style={{ padding: '0.45rem 0.6rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', paddingLeft: '0.5rem' }}>
                        <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.8rem' }}>$</span>
                        <input 
                          type="number"
                          placeholder="Cost"
                          value={newBudgetCost || ''}
                          onChange={e => setNewBudgetCost(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.45rem 0.45rem 0.45rem 0.15rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cat = newBudgetCategory.trim();
                          if (cat && newBudgetCost > 0) {
                            setBudgetLineItems([...budgetLineItems, { category: cat, cost: newBudgetCost }]);
                            setNewBudgetCategory('');
                            setNewBudgetCost(0);
                          }
                        }}
                        style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.45rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        Add
                      </button>
                    </div>

                    {/* Suggestion Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.35rem' }}>
                      {['Fuel & Lubrication', 'Complementary Food & Beverages', 'Cleaning Services', 'Provisions', 'Dockage Fees'].map(sug => {
                        if (budgetLineItems.some(li => li.category === sug)) return null;
                        return (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setNewBudgetCategory(sug)}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              color: '#D8C7AF',
                              padding: '0.2rem 0.4rem',
                              borderRadius: '3px',
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(185,120,59,0.1)'; e.currentTarget.style.color = '#B9783B'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#D8C7AF'; }}
                          >
                            {sug}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom items list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {budgetLineItems.map((li, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121416', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)' }}>
                        <span style={{ color: '#D8C7AF', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={li.category}>
                          {li.category}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600 }}>
                            ${li.cost.toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setBudgetLineItems(budgetLineItems.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculated Total Base Price */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Grand Total Base Price
                  </span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#B9783B', fontFamily: "'Cormorant Garamond', serif" }}>
                    ${calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    <span style={{ fontSize: '0.9rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 400, marginLeft: '0.35rem' }}>
                      {currency}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.4 }}>
                    This total is saved to the adventure database as basePrice and shown to public users.
                  </span>
                </div>
              </div>
            </div>
          )}
        </form>
      </main>

      {/* ASSET LIBRARY MODAL PICKER */}
      <AssetLibraryModal 
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => {
          if (mediaPickerTarget === 'hero') {
            setHeroImage(url);
          } else {
            setNewGalleryUrl(url);
          }
          setIsMediaModalOpen(false);
        }}
      />

    </div>
  );
}
