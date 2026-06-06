'use client';

import React, { useState } from 'react';
import { 
  MapPin, Clock, Compass, Anchor, Ship, Globe, FileText, Film, 
  Download, X, ArrowRight, Sun, ExternalLink 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SwipeScrollContainer } from '../builder/SwipeScrollContainer';

interface GalleryItem {
  type: 'image' | 'video' | 'document';
  url: string;
  name?: string;
}

interface LinkedAdventure {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  heroImage?: string;
  basePrice?: number;
  currency?: string;
  duration?: string;
  guestDurationMinutes?: number;
  crewDurationMinutes?: number;
}

interface LocationDetailViewProps {
  item: {
    id: string;
    slug: string;
    title: string;
    contentType: string;
    shortDescription: string;
    heroImage?: string;
    location?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    anchorStatus?: string;
    bestTime?: string;
    suitability?: string;
    gallery?: GalleryItem[];
  };
  theme: {
    backgroundColor: string;
    foregroundColor: string;
    primaryColor: string;
    surfaceColor: string;
    mutedColor: string;
    accentColor: string;
  };
  linkedAdventures?: LinkedAdventure[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

export default function LocationDetailView({ 
  item, 
  theme, 
  linkedAdventures = [] 
}: LocationDetailViewProps) {
  const latitude = item.latitude;
  const longitude = item.longitude;
  const locationName = item.location || 'Destin, FL';
  const anchorStatus = item.anchorStatus || 'Sandbar / Anchor Only';
  const bestTime = item.bestTime || 'High Tide';
  const suitability = item.suitability || 'All Vessels';
  const galleryItems = item.gallery || [];
  const descriptionMarkdown = item.description || '';

  // Gallery tabs & lightbox states
  const [activeGalleryTab, setActiveGalleryTab] = useState<'all' | 'images' | 'videos' | 'documents'>('all');
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [activeLightboxType, setActiveLightboxType] = useState<'image' | 'video' | null>(null);

  // Helper to format currency
  const formatCost = (val: number, currency: string = 'USD') => {
    const symbol = CURRENCY_SYMBOLS[currency] || '$';
    return `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDuration = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'hidden' }}>
      {/* Premium Styling Injections */}
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

        .location-hero-content {
          animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .location-specs-container {
          margin-top: -3.5rem;
          margin-bottom: 4.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
        }

        .location-spec-card {
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

        .location-spec-card:hover {
          transform: translateY(-4px);
          background: rgba(30, 33, 36, 0.9);
          border-top-color: #B9783B;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4);
          border-color: rgba(185, 120, 59, 0.2) rgba(255, 255, 255, 0.08) rgba(255, 255, 255, 0.08) rgba(255, 255, 255, 0.08);
        }

        .location-spec-card:hover .spec-icon-wrapper {
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

        .location-spec-info {
          display: flex;
          flex-direction: column;
        }

        .location-spec-label {
          font-size: 0.75rem;
          color: #D8C7AF;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.15rem;
        }

        .location-spec-value {
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          font-family: 'Cormorant Garamond', serif;
          letter-spacing: 0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 767px) {
          .location-specs-container {
            margin-top: -2.5rem !important;
            margin-bottom: 2.5rem !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.25rem !important;
            padding: 0 0.25rem !important;
          }
          .location-spec-card {
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
          .location-spec-card:hover {
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
          .location-spec-info {
            align-items: center !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .location-spec-label {
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
          .location-spec-value {
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

        .adventure-hosted-card {
          transition: all 0.25s ease;
        }

        .adventure-hosted-card:hover {
          transform: translateY(-3px);
          border-color: rgba(185, 120, 59, 0.4) !important;
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }

        .location-map-card {
          border-top: 4px solid #B9783B !important;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .location-map-card:hover {
          box-shadow: 0 25px 50px rgba(0,0,0,0.4) !important;
          border-top-color: #d28c4b !important;
          transform: translateY(-2px);
        }

        .location-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
          gap: 3.5rem;
          align-items: start;
        }

        .location-content-container {
          padding: 0 2rem 6rem 2rem;
        }

        @media (max-width: 992px) {
          .location-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 2rem;
          }
        }

        @media (max-width: 767px) {
          .location-content-container {
            padding: 0 1rem 4rem 1rem !important;
          }
        }
      ` }} />

      {/* Hero Header Section */}
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
          className="location-hero-content"
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
              width: 'fit-content'
            }}
          >
            <Compass size={14} style={{ color: '#B9783B' }} />
            Cruising Destination Stop
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
        className="location-content-container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 5
        }}
      >
        {/* 4-Column Specs Bar (Overlapping Hero) */}
        <div className="location-specs-container">
          {/* Anchor Status */}
          <div className="location-spec-card">
            <div className="spec-icon-wrapper">
              <Anchor size={22} color="#B9783B" />
            </div>
            <div className="location-spec-info">
              <div className="location-spec-label">
                <span className="desktop-only">Anchor & </span>Dock
              </div>
              <div className="location-spec-value">
                {anchorStatus}
              </div>
            </div>
          </div>

          {/* Best Time to Visit */}
          <div className="location-spec-card">
            <div className="spec-icon-wrapper">
              <Sun size={22} color="#B9783B" />
            </div>
            <div className="location-spec-info">
              <div className="location-spec-label">
                Best Time<span className="desktop-only"> to Visit</span>
              </div>
              <div className="location-spec-value">
                {bestTime}
              </div>
            </div>
          </div>

          {/* Vessel Suitability */}
          <div className="location-spec-card">
            <div className="spec-icon-wrapper">
              <Ship size={22} color="#B9783B" />
            </div>
            <div className="location-spec-info">
              <div className="location-spec-label">
                <span className="desktop-only">Vessel </span>Suitability
              </div>
              <div className="location-spec-value">
                {suitability}
              </div>
            </div>
          </div>

          {/* Coordinates or Address */}
          <div className="location-spec-card">
            <div className="spec-icon-wrapper">
              <Compass size={22} color="#B9783B" />
            </div>
            <div className="location-spec-info">
              <div className="location-spec-label">Coordinates</div>
              <div className="location-spec-value">
                {latitude && longitude ? (
                  `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`
                ) : (
                  locationName
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Layout Splitting */}
        <div className="location-layout">
          
          {/* Left Column (1.6fr) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            
            {/* Overview & Markdown Description */}
            <div>
              <h2 className="adventure-section-heading">
                About {item.title}
              </h2>
              <div style={{ fontSize: '1.05rem', color: '#D8C7AF', lineHeight: '1.8', display: 'flex', flexDirection: 'column', gap: '1.25rem', opacity: 0.95 }} className="prose prose-invert">
                {descriptionMarkdown ? (
                  <ReactMarkdown>{descriptionMarkdown}</ReactMarkdown>
                ) : (
                  <p>{item.shortDescription}</p>
                )}
              </div>
            </div>

            {/* Media Gallery Section */}
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
                      : galleryItems.filter(media => {
                          if (tab === 'images') return media.type === 'image';
                          if (tab === 'videos') return media.type === 'video';
                          if (tab === 'documents') return media.type === 'document';
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
                            <img 
                              src={media.url} 
                              alt={media.name || 'Gallery Image'} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} 
                              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
                              onMouseOut={e => e.currentTarget.style.transform = 'scale(1.0)'} 
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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

          {/* Right Column (1fr) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Interactive Map Preview Card */}
            {latitude && longitude && (
              <div 
                className="location-map-card"
                style={{
                  background: '#1E2124',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '2rem 1.75rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.25rem 0', letterSpacing: '0.01em' }}>
                    Interactive Map
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.6, margin: 0 }}>
                    Cruising coordinates & anchorage location
                  </p>
                </div>

                <div style={{ width: '100%', height: '240px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <iframe 
                    title="Location Interactive Map Preview"
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }}
                    loading="lazy" 
                    allowFullScreen 
                    src={`https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=13&output=embed`}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D8C7AF', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                    <span>Latitude:</span>
                    <strong style={{ color: 'white' }}>{latitude.toFixed(6)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#D8C7AF', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                    <span>Longitude:</span>
                    <strong style={{ color: 'white' }}>{longitude.toFixed(6)}</strong>
                  </div>
                  {item.address && (
                    <div style={{ color: '#D8C7AF', fontSize: '0.8rem', lineHeight: '1.4', marginTop: '0.25rem' }}>
                      <span style={{ display: 'block', opacity: 0.6, marginBottom: '0.15rem' }}>Format Address:</span>
                      <span style={{ color: 'white' }}>{item.address}</span>
                    </div>
                  )}
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textDecoration: 'none',
                    background: 'transparent',
                    border: '1px solid #B9783B',
                    color: '#B9783B',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(185,120,59,0.1)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Open in Google Maps <ExternalLink size={16} />
                </a>
              </div>
            )}

            {/* Experiences Visiting Here */}
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontFamily: "'Cormorant Garamond', serif", 
                fontWeight: 700, 
                color: 'white', 
                marginBottom: '1.25rem',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '0.5rem'
              }}>
                Experiences Visiting Here
              </h3>

              {linkedAdventures.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {linkedAdventures.map(adv => {
                    const guestMinutes = adv.guestDurationMinutes || 0;
                    return (
                      <a
                        key={adv.id}
                        href={`/experiences/${adv.slug}`}
                        className="adventure-hosted-card"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          background: '#1E2124',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          transition: 'all 0.25s'
                        }}
                      >
                        {adv.heroImage && (
                          <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
                            <img src={adv.heroImage} alt={adv.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>
                            Private Charter
                          </span>
                          <h4 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: "'Cormorant Garamond', serif" }}>
                            {adv.title}
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.7, margin: '0 0 1rem 0', lineHeight: '1.4', flex: 1 }}>
                            {adv.shortDescription}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                            {guestMinutes > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7 }}>
                                <Clock size={12} color="#B9783B" />
                                <span>{formatDuration(guestMinutes)}</span>
                              </div>
                            )}
                            {adv.basePrice && adv.basePrice > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, marginLeft: 'auto' }}>
                                <span style={{ color: '#B9783B', fontWeight: 600 }}>From {formatCost(adv.basePrice, adv.currency)}</span>
                              </div>
                            )}
                          </div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600, marginTop: '0.75rem' }}>
                            View Charter Details <ArrowRight size={12} />
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px dashed rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  padding: '1.5rem', 
                  textAlign: 'center', 
                  color: '#D8C7AF', 
                  fontSize: '0.9rem', 
                  opacity: 0.7 
                }}>
                  No public charters stop here directly yet. Contact us to design a custom itinerary.
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Lightbox Modal overlay */}
      {activeLightboxUrl && (
        <div 
          onClick={() => {
            setActiveLightboxUrl(null);
            setActiveLightboxType(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          {/* Close button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLightboxUrl(null);
              setActiveLightboxType(null);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
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
          {galleryItems.find(g => g.url === activeLightboxUrl)?.name && (
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
              {galleryItems.find(g => g.url === activeLightboxUrl)?.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
