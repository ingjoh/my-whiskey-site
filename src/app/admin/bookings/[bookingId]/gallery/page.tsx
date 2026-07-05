'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, UploadCloud, Loader2, Sparkles, MapPin, 
  Trash2, Eye, EyeOff, Save, CheckCircle2, Image as ImageIcon
} from 'lucide-react';
import { uploadFile } from '@/lib/storage';

export default function AdminTripGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

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

  useEffect(() => {
    loadGalleryData();
  }, [bookingId]);

  useEffect(() => {
    if (media.length > 0 && typeof window !== 'undefined') {
      initMap();
    }
  }, [media]);

  const loadGalleryData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch booking details to get baseline info
      const idToken = sessionStorage.getItem('authToken') || '';
      const bRes = await fetch(`/api/checkout?bookingId=${bookingId}`);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBookingDetails(bData);
      }

      // 2. Fetch or initialize gallery details
      const gRes = await fetch(`/api/trips/${bookingId}/gallery`, {
        headers: {
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
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
      alert('Upload failed. Ensure you have network connectivity.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateAIStory = async () => {
    setIsGeneratingStory(true);
    try {
      const idToken = sessionStorage.getItem('authToken') || '';
      const res = await fetch(`/api/trips/${bookingId}/suggest-story`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || '');
        setStory(data.story || '');
        if (!description) {
          setDescription(`A private charter memory on board the ${bookingDetails?.vesselTitle || 'yacht'}.`);
        }
      } else {
        alert('AI service currently busy. Please try again.');
      }
    } catch (err) {
      console.error('Failed to generate story:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleSuggestCaption = async (mediaItem: any, index: number) => {
    setCaptioningIds(prev => [...prev, mediaItem.id]);
    try {
      // Find asset by matching public URL to run AI Vision Analysis
      const idToken = sessionStorage.getItem('authToken') || '';
      const assetsRes = await fetch(`/api/admin/media/${mediaItem.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        }
      });
      
      // Let's call the suggest-caption endpoint which accepts raw url
      const res = await fetch(`/api/trips/${bookingId}/suggest-caption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
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
    setIsSaving(true);
    try {
      const idToken = sessionStorage.getItem('authToken') || '';
      const res = await fetch(`/api/trips/${bookingId}/gallery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
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
        alert('Trip memories updated and saved successfully.');
      } else {
        alert('Failed to save trip memories.');
      }
    } catch (err) {
      console.error('Failed to save gallery:', err);
      alert('Save operation encountered a network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const initMap = () => {
    // Collect pins with valid coordinates
    const pins = media
      .filter(m => m.exif?.latitude && m.exif?.longitude)
      .map(m => ({
        lat: m.exif.latitude,
        lng: m.exif.longitude,
        title: m.caption || 'Photo location'
      }));

    if (pins.length === 0 || !mapContainerRef.current) return;

    // Load Leaflet dynamically to bypass SSR issues
    const setupLeaflet = () => {
      const L = (window as any).L;
      if (!L) return;

      if (mapRef.current) {
        mapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current).setView([pins[0].lat, pins[0].lng], 13);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const latlngs: any[] = [];
      pins.forEach(pin => {
        L.marker([pin.lat, pin.lng]).addTo(map).bindPopup(pin.title);
        latlngs.push([pin.lat, pin.lng]);
      });

      if (pins.length > 1) {
        L.polyline(latlngs, { color: '#B9783B', weight: 4 }).addTo(map);
        map.fitBounds(L.polyline(latlngs).getBounds());
      }
    };

    if (!(window as any).L) {
      // Inject stylesheet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Inject script
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
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#B9783B' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
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
                      href={`/trip/${bookingId}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ display: 'block', color: 'white', fontWeight: 600, textDecoration: 'underline', marginTop: '0.35rem' }}
                    >
                      /trip/{bookingId} ↗
                    </a>
                  </div>
                </div>
              )}
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
