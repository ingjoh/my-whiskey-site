'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, UploadCloud, Loader2, Sparkles, MapPin, 
  Trash2, Eye, EyeOff, Save, CheckCircle2, Image as ImageIcon, Share2
} from 'lucide-react';
import { uploadFile } from '@/lib/storage';
import { firebaseConfig } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

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

export default function AdminTripGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const { user } = useAuth();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [captioningIds, setCaptioningIds] = useState<string[]>([]);
  
  // Gallery state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [tippingLedger, setTippingLedger] = useState({ totalTipped: 0, stripePaymentIntentIds: [] });
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user) {
      loadGalleryData();
    }
  }, [bookingId, user]);

  useEffect(() => {
    if (media.length > 0 && typeof window !== 'undefined') {
      initMap();
    }
  }, [media]);

  const loadGalleryData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();

      // Fetch or initialize gallery details
      const gRes = await fetch(`/api/trips/${bookingId}/gallery`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        setTitle(gData.title || '');
        setDescription(gData.description || '');
        setStory(gData.story || '');
        setMedia(gData.media || []);
        setIsPublished(gData.isPublished || false);
        setTippingLedger(gData.tippingLedger || { totalTipped: 0, stripePaymentIntentIds: [] });
        if (gData.booking) {
          setBookingDetails(gData.booking);
        }
      }
    } catch (err) {
      console.error('Failed to load gallery data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Upload to storage, which automatically triggers GPS EXIF parsing
        const url = await uploadFile(file, `trips/${bookingId}`);
        
        // Retrieve the recently created asset to get its resolved ID and EXIF details
        // Query the list to find the matching url
        const listRes = await fetch('/api/listings/active'); // standard listings GET, or query active assets
        const assetsRes = await fetch('/api/workspaces/active'); // fallback
        
        // We will query our assets collection to get the details
        // Or simply construct an media element payload
        const fileType = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Let's parse EXIF GPS client-side just in case for immediate map loading
        let exif: any = null;
        try {
          const exifr = (await import('exifr')).default;
          const gps = await exifr.gps(file);
          const meta = await exifr.parse(file, ['DateTimeOriginal', 'Make', 'Model']);
          if (gps || meta) {
            exif = {
              latitude: gps?.latitude || null,
              longitude: gps?.longitude || null,
              capturedAt: meta?.DateTimeOriginal ? new Date(meta.DateTimeOriginal).toISOString() : null,
              cameraMake: meta?.Make || null,
              cameraModel: meta?.Model || null,
            };
          }
        } catch {}

        return {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url,
          type: fileType,
          caption: '',
          exif
        };
      });

      const uploadedMedia = await Promise.all(uploadPromises);
      setMedia(prev => [...prev, ...uploadedMedia]);
    } catch (error) {
      console.error('Failed to batch upload:', error);
      showToast('error', 'Upload failed. Ensure you have network connectivity.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateAIStory = async () => {
    if (!user) return;
    setIsGeneratingStory(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/trips/${bookingId}/suggest-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || '');
        setStory(data.story || '');
        if (!description) {
          setDescription(`A private charter memory on board the ${bookingDetails?.vesselTitle || 'yacht'}.`);
        }
        showToast('success', 'Personalized story generated successfully!');
      } else {
        showToast('error', 'AI service currently busy. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate story:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleSuggestCaption = async (mediaItem: any, index: number) => {
    if (!user) return;
    setCaptioningIds(prev => [...prev, mediaItem.id]);
    try {
      // Find asset by matching public URL to run AI Vision Analysis
      const idToken = await user.getIdToken();
      const assetsRes = await fetch(`/api/admin/media/${mediaItem.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      // Let's call the suggest-caption endpoint which accepts raw url
      const res = await fetch(`/api/trips/${bookingId}/suggest-caption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ imageUrl: mediaItem.url })
      });

      if (res.ok) {
        const data = await res.json();
        updateMediaField(index, 'caption', data.caption);
      } else {
        // Fallback context caption
        updateMediaField(index, 'caption', 'Sunset over Choctawhatchee Bay, Destin.');
      }
    } catch (err) {
      console.error('Failed to generate caption:', err);
    } finally {
      setCaptioningIds(prev => prev.filter(id => id !== mediaItem.id));
    }
  };

  const updateMediaField = (index: number, field: string, value: any) => {
    setMedia(prev => prev.map((m, idx) => idx === index ? { ...m, [field]: value } : m));
  };

  const removeMediaItem = (index: number) => {
    setMedia(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async () => {
    if (!user) {
      showToast('error', 'You must be logged in to save.');
      return;
    }
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/trips/${bookingId}/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title,
          description,
          story,
          media,
          isPublished
        })
      });

      if (res.ok) {
        showToast('success', 'Trip memories updated and saved successfully.');
      } else {
        showToast('error', 'Failed to save trip memories.');
      }
    } catch (err) {
      console.error('Failed to save gallery:', err);
      showToast('error', 'Save operation encountered a network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const initMap = () => {
    // Collect pins with valid coordinates and sort chronologically
    const pins = [...media]
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
        title: m.caption || 'Photo location'
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
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative'
      };

      const map = new google.maps.Map(mapContainerRef.current, mapOptions);
      mapRef.current = map;

      const bounds = new google.maps.LatLngBounds();
      const pathCoordinates: any[] = [];

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
            this.element.style.left = (position.x - 21) + 'px';
            this.element.style.top = (position.y - 21) + 'px';
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

        // Spawn Overlay
        new HTMLOverlay(new google.maps.LatLng(pin.lat, pin.lng), el);
      });

      if (pins.length > 1) {
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
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
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
      {/* Top Header navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.1rem', color: '#B9783B' }}>
          <Sparkles size={20} /> Voyage Memories Studio
        </div>
        <Link 
          href="/admin/bookings" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#D8C7AF', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Operations
        </Link>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              Manage Trip Experience: BK-{bookingId}
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.7, margin: 0, fontSize: '0.9rem' }}>
              Create a custom memory page for {bookingDetails?.guestName || 'the guest'}. Upload media, build stories, and activate crew tipping.
            </p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ background: '#B9783B', border: 'none', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save Gallery'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2.5rem' }}>
          
          {/* Left Main form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* AI Narrative Section */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#B9783B', fontWeight: 600 }}>Trip Story & Description</h3>
                <button 
                  type="button" 
                  onClick={handleGenerateAIStory}
                  disabled={isGeneratingStory}
                  style={{ background: 'rgba(185, 120, 59, 0.15)', border: '1px solid rgba(185, 120, 59, 0.3)', color: '#D8C7AF', padding: '0.45rem 1rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  {isGeneratingStory ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isGeneratingStory ? 'Composing...' : 'Suggest Story (AI)'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#D8C7AF', marginBottom: '0.35rem' }}>Memory Page Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. The Johnson Family's Emerald Coast Adventure"
                    style={{ width: '100%', padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#D8C7AF', marginBottom: '0.35rem' }}>Short Description</label>
                  <input 
                    type="text" 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="e.g. A gorgeous sun-drenched day sailing to Crab Island and Destin Harbor."
                    style={{ width: '100%', padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#D8C7AF', marginBottom: '0.35rem' }}>Detailed Story</label>
                  <textarea 
                    rows={6}
                    value={story} 
                    onChange={e => setStory(e.target.value)} 
                    placeholder="Describe their experience. Who joined? What did they see? (Dolphins, snorkeling stops, etc.)"
                    style={{ width: '100%', padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: 'white', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>

            {/* Batch Upload Media section */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#B9783B', fontWeight: 600 }}>Trip Photos & Videos</h3>
                
                <label style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.45rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                  {isUploading ? 'Uploading...' : 'Batch Upload Photos'}
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleBatchUpload} multiple accept="image/*,video/*" />
                </label>
              </div>

              {media.length === 0 ? (
                <div style={{ border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '6px', padding: '3rem', textAlign: 'center', color: '#888' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>No media uploaded for this trip yet. Drop photos above.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                  {media.map((item, index) => (
                    <div key={item.id || index} style={{ background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ height: '110px', background: 'black', position: 'relative' }}>
                        {item.type === 'video' ? (
                          <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={item.url} alt="Trip media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        <button 
                          onClick={() => removeMediaItem(index)}
                          style={{ position: 'absolute', top: '0.35rem', right: '0.35rem', background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', padding: '0.25rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={12} />
                        </button>
                        {item.exif?.latitude && (
                          <div style={{ position: 'absolute', bottom: '0.35rem', left: '0.35rem', background: 'rgba(0,0,0,0.6)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.55rem', display: 'flex', alignItems: 'center', gap: '0.15rem', color: '#D8C7AF' }}>
                            <MapPin size={8} /> GPS
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                        <input 
                          type="text" 
                          placeholder="Caption..." 
                          value={item.caption || ''} 
                          onChange={e => updateMediaField(index, 'caption', e.target.value)}
                          style={{ width: '100%', padding: '0.25rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '3px', color: 'white', fontSize: '0.72rem', outline: 'none' }}
                        />
                        {item.type === 'image' && (
                          <button 
                            type="button" 
                            onClick={() => handleSuggestCaption(item, index)}
                            disabled={captioningIds.includes(item.id)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#D8C7AF', padding: '0.2rem', borderRadius: '3px', fontSize: '0.62rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                          >
                            {captioningIds.includes(item.id) ? <Loader2 size={8} className="animate-spin" /> : <Sparkles size={8} />}
                            {captioningIds.includes(item.id) ? 'Scanning...' : 'Suggest Caption'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EXIF Route Map Preview section */}
            {media.some(m => m.exif?.latitude) && (
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#B9783B', fontWeight: 600 }}>Route Map Preview (EXIF GPS)</h3>
                <div ref={mapContainerRef} style={{ height: '300px', borderRadius: '6px', overflow: 'hidden', background: '#121416' }} />
              </div>
            )}

          </div>

          {/* Right Sidebar settings panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Publishing Settings */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#D8C7AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibility & Status</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121416', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}>
                  {isPublished ? <Eye size={16} color="#10b981" /> : <EyeOff size={16} color="#888" />}
                  <span>{isPublished ? 'Published & Shared' : 'Draft / Private'}</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={isPublished} 
                  onChange={e => setIsPublished(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#B9783B', cursor: 'pointer' }}
                />
              </div>

              {isPublished && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.74rem', color: '#10b981', display: 'flex', gap: '0.45rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong>This trip page is live!</strong> Share this link with the traveler to let them relive their excursion and add crew tips:
                    <a 
                      href={`/trip/${bookingDetails?.token || bookingId}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ display: 'block', color: 'white', fontWeight: 600, textDecoration: 'underline', marginTop: '0.35rem' }}
                    >
                      /trip/{bookingDetails?.token || bookingId} ↗
                    </a>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/trip/${bookingDetails?.token || bookingId}`;
                    navigator.clipboard.writeText(link);
                    showToast('success', 'Guest share link copied to clipboard!');
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.45rem', 
                    background: 'rgba(185, 120, 59, 0.12)', 
                    border: '1px solid rgba(185, 120, 59, 0.25)', 
                    color: '#D8C7AF', 
                    padding: '0.65rem', 
                    borderRadius: '6px', 
                    fontSize: '0.78rem', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                >
                  <Share2 size={14} /> Copy Guest Share Link
                </button>

                <a 
                  href={`/trip/${bookingDetails?.token || bookingId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.45rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', 
                    padding: '0.65rem', 
                    borderRadius: '6px', 
                    fontSize: '0.78rem', 
                    fontWeight: 600, 
                    textDecoration: 'none',
                    textAlign: 'center',
                    transition: 'background 0.2s'
                  }}
                >
                  <Eye size={14} /> Preview Excursion Page ↗
                </a>
              </div>
            </div>

            {/* Crew Tipping Stats */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#D8C7AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gratuity split Ledger</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.6 }}>Total Crew Tips:</span>
                  <strong style={{ color: '#10b981', fontSize: '1rem' }}>${(tippingLedger?.totalTipped || 0) / 100}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.6 }}>Tipping transactions:</span>
                  <span>{tippingLedger?.stripePaymentIntentIds?.length || 0} payments</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
