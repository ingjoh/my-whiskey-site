'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, Users, MapPin, Phone, Compass, Anchor, Mail } from 'lucide-react';
import QRCode from 'qrcode';
import { getContentItems, ContentItem, loadSiteSettings, loadPrintDesign } from '@/lib/db';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import './print.css';

interface PrintElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'divider' | 'dynamic-excursion' | 'dynamic-vessel' | 'dynamic-staff' | 'dynamic-contact' | 'hero' | 'contact-card' | 'logo' | 'dynamic-location';
  props: Record<string, any>;
}

interface PrintZone {
  id: string;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  elements: PrintElement[];
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlayOpacity?: number;
  verticalAlign?: 'top' | 'middle' | 'bottom' | 'space-between';
}

interface PrintPage {
  id: string;
  zones: PrintZone[];
}

interface RepeatLayoutConfig {
  enabled: boolean;
  paperPreset: 'letter' | 'a4' | 'custom';
  paperWidth: string;
  paperHeight: string;
  rows: number;
  cols: number;
  margins: string;
  spacing: string;
}

interface PrintDesign {
  id: string;
  name: string;
  preset: string;
  width: string;
  height: string;
  gridCols: number;
  gridRows: number;
  pages: PrintPage[];
  repeatLayout?: RepeatLayoutConfig;
  printTheme: 'dark' | 'light';
}

function formatMarkdown(text: string): string {
  if (!text) return '';
  
  // First handle headers
  let html = text
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
  // Handle bold and italic
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
  // Handle list items: lines starting with *, -, or •
  html = html.replace(/^[•\-\*]\s+(.*?)$/gm, '<li>$1</li>');
    
  // Wrap consecutive <li> tags in a <ul> tag
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Replace remaining newlines with <br />
  html = html.replace(/\n/g, '<br />');
  
  // clean up duplicate brs around ul/li/h
  html = html.replace(/<\/(h[1-3]|ul|li)><br \/>/g, '<\/$1>');

  return html;
}

function RenderPrintElement({
  el,
  adventures,
  vessels,
  staffList,
  locations = [],
  businessDetails,
  printTheme,
  siteSettings
}: {
  el: PrintElement;
  adventures: ContentItem[];
  vessels: ContentItem[];
  staffList: ContentItem[];
  locations?: ContentItem[];
  businessDetails: any;
  printTheme: 'dark' | 'light';
  siteSettings?: any;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (el.type === 'qr' || el.type === 'contact-card') {
      let targetUrl = (el.type === 'contact-card' ? el.props.qrUrl : el.props.url) || 'https://mywhiskey.com';
      if (el.props.partnerType && el.props.partnerType !== 'none' && el.props.partnerSlug) {
        targetUrl = `${window.location.origin}/go/${el.props.partnerType}/${el.props.partnerSlug}`;
        const params = new URLSearchParams();
        if (el.props.campaign) {
          params.set('campaign', el.props.campaign);
        }
        if (el.props.promoCode) {
          params.set('promo', el.props.promoCode);
        }
        const qs = params.toString();
        if (qs) {
          targetUrl += `?${qs}`;
        }
      } else if (targetUrl) {
        try {
          const urlObj = new URL(targetUrl);
          if (el.props.campaign) {
            urlObj.searchParams.set('utm_campaign', el.props.campaign);
          }
          if (el.props.promoCode) {
            urlObj.searchParams.set('promo', el.props.promoCode);
          }
          targetUrl = urlObj.toString();
        } catch (e) {
          if (el.props.promoCode) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl += `${separator}promo=${encodeURIComponent(el.props.promoCode)}`;
          }
          if (el.props.campaign) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl += `${separator}utm_campaign=${encodeURIComponent(el.props.campaign)}`;
          }
        }
      }

      QRCode.toDataURL(targetUrl, {
        margin: 1,
        width: 300,
        color: {
          dark: '#121416',
          light: '#ffffff'
        }
      })
      .then(url => setQrUrl(url))
      .catch(err => console.error('QR generation error in element:', err));
    }
  }, [el, businessDetails.url]);

  const wrapperStyle: React.CSSProperties = {
    padding: el.props.style?.padding || '0px',
    margin: el.props.style?.margin || '0px',
    borderRadius: el.props.style?.borderRadius || '0px',
    backgroundColor: el.props.style?.backgroundColor || 'transparent',
    borderWidth: el.props.style?.borderWidth || '0px',
    borderColor: el.props.style?.borderColor || 'transparent',
    borderStyle: el.props.style?.borderStyle || 'solid',
    color: el.props.style?.color || 'inherit',
    fontFamily: el.props.style?.fontFamily || 'inherit',
    fontSize: el.props.style?.fontSize || 'inherit',
    fontWeight: el.props.style?.fontWeight || 'inherit',
    fontStyle: el.props.style?.fontStyle || 'inherit',
    textAlign: el.props.style?.textAlign as any || 'inherit',
    width: '100%',
    boxSizing: 'border-box'
  };

  const elementContent = (() => {
    switch (el.type) {
      case 'text': {
        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;
        
        return (
          <div
            className="collateral-text-block"
            style={{
              lineHeight: el.props.style?.lineHeight || '1.4',
              fontSize: el.props.style?.fontSize 
                ? `calc(${el.props.style.fontSize} * ${fontScale})` 
                : `${fontScale * 10}pt`
            }}
            dangerouslySetInnerHTML={{ __html: formatMarkdown(el.props.text) }}
          />
        );
      }
      case 'image': {
        return (
          <div
            style={{
              width: el.props.style?.width || '100%',
              height: el.props.style?.height || '1.5in',
              borderRadius: el.props.style?.borderRadius || '4px',
              overflow: 'hidden',
              marginLeft: el.props.style?.marginLeft || '0px',
              marginRight: el.props.style?.marginRight || '0px'
            }}
          >
            <img
              src={el.props.src}
              style={{
                width: '100%',
                height: '100%',
                objectFit: el.props.style?.objectFit || 'cover'
              }}
              alt=""
            />
          </div>
        );
      }
      case 'qr': {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: el.props.size || '1.2in', height: el.props.size || '1.2in', background: '#ffffff', padding: '6px', borderRadius: '6px' }}>
              {qrUrl ? (
                <img src={qrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="QR Code" />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
              )}
            </div>
            <span style={{ fontSize: '8px', opacity: 0.6 }}>{el.props.labelText || 'Scan to Book'}</span>
          </div>
        );
      }
      case 'divider': {
        return (
          <div
            style={{
              borderTop: `${el.props.thickness || '1px'} ${el.props.style || 'solid'} ${el.props.color || '#B9783B'}`,
              margin: el.props.margin || '0.5rem 0'
            }}
          />
        );
      }
      case 'dynamic-excursion': {
        const adv = adventures.find(a => a.slug === el.props.slug);
        if (!adv) return <div style={{ fontSize: '9px', opacity: 0.5 }}>Excursion not selected</div>;

        const priceText = adv.basePrice && Number(adv.basePrice) > 0
          ? `From $${Number(adv.basePrice).toLocaleString()}`
          : 'Rates on Request';

        const showImage = el.props.showImage !== false;
        const showDescription = el.props.showDescription !== false;
        const showDuration = el.props.showDuration !== false;
        const showPrice = el.props.showPrice !== false;
        const showItinerary = el.props.showItinerary !== false;
        const durationText = adv.duration || 'Not specified';
        const capacityText = adv.maxGuests ? `Up to ${adv.maxGuests} guests` : '';

        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Uppercase Gold Tag */}
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
              EXCLUSIVE ADVENTURE
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(185, 120, 59, 0.2)', paddingBottom: '0.2rem' }}>
              <h4 className="serif-font" style={{ margin: 0, fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(1.0rem * ${fontScale})`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{adv.title}</h4>
              {!el.props.condensedLayout && showPrice && (
                <span style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale})`, fontWeight: 700, color: '#B9783B' }}>{priceText}</span>
              )}
            </div>

            {el.props.condensedLayout ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', marginTop: '0.15rem' }}>
                {/* Left Column: Image */}
                {showImage && adv.heroImage && (
                  <div style={{ width: '50%', flexShrink: 0, overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', position: 'relative' }}>
                    <img src={adv.heroImage} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                )}
                {/* Right Column: Stack of Price + Spec boxes */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
                  {showPrice && (
                    <div style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale})`, fontWeight: 700, color: '#B9783B', borderBottom: '1px solid rgba(185,120,59,0.1)', paddingBottom: '0.15rem', marginBottom: '0.1rem' }}>
                      {priceText}
                    </div>
                  )}
                  {showDuration && (
                    <div style={{
                      background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                      borderLeft: '3px solid #B9783B',
                      borderRadius: '6px',
                      padding: '0.25rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      <Clock size={11} color="#B9783B" style={{ flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: `calc(0.45rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', lineHeight: 1.1 }}>Duration</span>
                        <span style={{ fontSize: `calc(0.62rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white', lineHeight: 1.1 }}>{durationText}</span>
                      </div>
                    </div>
                  )}
                  {adv.maxGuests && (
                    <div style={{
                      background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                      borderLeft: '3px solid #B9783B',
                      borderRadius: '6px',
                      padding: '0.25rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                    }}>
                      <Users size={11} color="#B9783B" style={{ flexShrink: 0 }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: `calc(0.45rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', lineHeight: 1.1 }}>Capacity</span>
                        <span style={{ fontSize: `calc(0.62rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white', lineHeight: 1.1 }}>{capacityText}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {showImage && adv.heroImage && (
                  <div style={{ width: '100%', height: '1.1in', overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                    <img src={adv.heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={adv.title} />
                  </div>
                )}

                {/* 2-Column Metrics Grid */}
                {(showDuration || adv.maxGuests) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                    {showDuration && adv.duration && (
                      <div style={{
                        background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                        borderLeft: '3px solid #B9783B',
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}>
                        <Clock size={12} color="#B9783B" style={{ flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Duration</span>
                          <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{durationText}</span>
                        </div>
                      </div>
                    )}
                    {adv.maxGuests && (
                      <div style={{
                        background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                        borderLeft: '3px solid #B9783B',
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}>
                        <Users size={12} color="#B9783B" style={{ flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Capacity</span>
                          <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{capacityText}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {showDescription && adv.shortDescription && (
              <div 
                className="markdown-content"
                style={{ fontSize: `calc(0.68rem * ${fontScale})`, opacity: 0.85, margin: '0.1rem 0 0 0', lineHeight: '1.35', whiteSpace: 'normal' }}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(adv.shortDescription) }}
              />
            )}

            {showItinerary && adv.itinerary && adv.itinerary.length > 0 && (
              <div style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: `calc(0.6rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.05em', opacity: 0.6, display: 'block', marginBottom: '0.25rem' }}>ITINERARY HIGHLIGHTS</span>
                {(() => {
                  const highlights = adv.itinerary.filter((step: any) => step.isHighlight);
                  const displaySteps = highlights.length > 0 ? highlights.slice(0, 4) : adv.itinerary.slice(0, 3);
                  return displaySteps.map((step: any, sIdx: number) => (
                    <div key={sIdx} style={{ fontSize: `calc(0.68rem * ${fontScale})`, display: 'flex', gap: '0.3rem', marginBottom: '0.15rem', alignItems: 'flex-start', lineHeight: '1.3' }}>
                      <span style={{ color: '#B9783B', fontWeight: 'bold' }}>•</span>
                      <span style={{ opacity: 0.8 }}>{step.title}</span>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        );
      }
      case 'dynamic-vessel': {
        const v = vessels.find(asset => asset.slug === el.props.slug);
        if (!v) return <div style={{ fontSize: '9px', opacity: 0.5 }}>Vessel not selected</div>;

        const showImage = el.props.showImage !== false;
        const showDescription = el.props.showDescription !== false;
        const showSpecs = el.props.showSpecs !== false;

        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Uppercase Gold Tag */}
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
              PREMIUM YACHT
            </div>

            <h4 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(1.0rem * ${fontScale})`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{v.title}</h4>

            {showImage && v.heroImage && (
              <div style={{ width: '100%', height: '1.1in', overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <img src={v.heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={v.title} />
              </div>
            )}

            {showDescription && (v.shortDescription || v.description) && (
              <div 
                className="markdown-content"
                style={{ fontSize: `calc(0.72rem * ${fontScale})`, opacity: 0.85, margin: '0', lineHeight: '1.35', whiteSpace: 'normal' }}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(v.shortDescription || v.description || '') }}
              />
            )}

            {/* 2-Column Metrics Grid */}
            {showSpecs && v.specifications && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                {Object.entries(v.specifications).slice(0, 4).map(([key, val]) => (
                  <div key={key} style={{
                    background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderLeft: '3px solid #B9783B',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>{key}</span>
                    <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 'dynamic-staff': {
        const staff = staffList.find(s => s.slug === el.props.slug);
        if (!staff) return <div style={{ fontSize: '9px', opacity: 0.5 }}>Staff member not selected</div>;

        const showAvatar = el.props.showAvatar !== false;
        const showRole = el.props.showRole !== false;
        const showBio = el.props.showBio !== false;
        const role = staff.role || (staff.isCaptain ? 'Captain' : 'Crew');

        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            alignItems: 'flex-start',
            color: el.props.style?.color || 'inherit', 
            fontFamily: "'Inter', sans-serif",
            background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
            border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: '8px',
            padding: '0.5rem',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
          }}>
            {showAvatar && staff.heroImage && (
              <img
                src={staff.heroImage}
                style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #B9783B', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
                alt={staff.title}
              />
            )}
            <div style={{ flex: 1 }}>
              <h5 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale})`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{staff.title}</h5>
              {showRole && (
                <div style={{ display: 'inline-flex', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.25)', borderRadius: '12px', padding: '0.1rem 0.4rem', fontSize: `calc(0.5rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.06em', color: '#B9783B', textTransform: 'uppercase', marginTop: '0.1rem', marginBottom: '0.2rem' }}>
                  {role}
                </div>
              )}
              {showBio && staff.shortBio && (
                <div 
                  className="markdown-content"
                  style={{ fontSize: `calc(0.68rem * ${fontScale})`, opacity: 0.8, lineHeight: '1.3', margin: '0', whiteSpace: 'normal' }}
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(staff.shortBio) }}
                />
              )}
            </div>
          </div>
        );
      }
      case 'dynamic-contact': {
        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            color: el.props.style?.color || 'inherit',
            fontFamily: "'Inter', sans-serif",
            padding: '0.5rem',
            background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
            border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
            borderRadius: '6px'
          }}>
            {el.props.showPhone !== false && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale})` }}>
                <Phone size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                <span>{businessDetails.phone}</span>
              </div>
            )}
            {el.props.showEmail !== false && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale})` }}>
                <Mail size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                <span>{businessDetails.email}</span>
              </div>
            )}
            {el.props.showAddress !== false && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale})` }}>
                <MapPin size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                <span>{businessDetails.address}</span>
              </div>
            )}
            {el.props.showSocials !== false && (businessDetails.instagram || businessDetails.facebook) && (
              <>
                {businessDetails.instagram && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale})` }}>
                    <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(8px * ${fontScale})`, width: '10px', textAlign: 'center' }}>IG</span>
                    <span>{businessDetails.instagram.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}</span>
                  </div>
                )}
                {businessDetails.facebook && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale})` }}>
                    <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(8px * ${fontScale})`, width: '10px', textAlign: 'center' }}>FB</span>
                    <span>{businessDetails.facebook.replace('https://facebook.com/', '').replace('https://www.facebook.com/', '')}</span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      }
      case 'hero': {
        const fontScale = ({
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0) * 1.5;

        const opacityVal = el.props.overlayOpacity !== undefined ? el.props.overlayOpacity : 50;
        const factor = opacityVal / 50; // 1.0 at 50%
        const topOpacity = printTheme === 'light' 
          ? Math.min(1.0, factor * 0.85) 
          : Math.min(1.0, factor * 0.55);
        const bottomOpacity = printTheme === 'light' 
          ? Math.min(1.0, factor * 0.96) 
          : Math.min(1.0, factor * 0.92);
        const overlayColor = printTheme === 'light' ? '249,248,246' : '26,28,30';
        const bgImg = el.props.backgroundImage 
          ? `linear-gradient(rgba(${overlayColor}, ${topOpacity}), rgba(${overlayColor}, ${bottomOpacity})), url("${el.props.backgroundImage}")` 
          : 'none';

        return (
          <div 
            className="collateral-glass-panel"
            style={{ 
              backgroundImage: bgImg,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              padding: el.props.style?.padding || '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: el.props.style?.textAlign as any || 'center',
              color: el.props.style?.color || 'white',
              fontFamily: el.props.style?.fontFamily || 'inherit',
              backgroundColor: el.props.glassOpacity !== undefined 
                ? (printTheme === 'light' ? `rgba(255,255,255,${el.props.glassOpacity / 100})` : `rgba(18,20,22,${el.props.glassOpacity / 100})`)
                : (el.props.style?.backgroundColor || 'transparent'),
              '--glass-print-opacity': el.props.glassOpacity !== undefined 
                ? Math.max(0.88, el.props.glassOpacity / 100).toString()
                : '1',
              ...(el.props.fullPageImage ? {
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                borderRadius: '0px',
                border: 'none',
                boxShadow: 'none',
                zIndex: 1
              } : {
                width: '100%',
                borderRadius: el.props.style?.borderRadius || '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }),
              backdropFilter: `blur(${el.props.glassOpacity !== undefined ? '8px' : '1px'})`
            } as any}
          >
            {el.props.logoType && el.props.logoType !== 'none' && (() => {
              const logoUrl = el.props.logoType === 'square'
                ? siteSettings?.brand?.logoSquareUrl
                : siteSettings?.brand?.logoRectUrl;
              
              if (!logoUrl) return null;
              return (
                <img 
                  src={logoUrl} 
                  style={{ 
                    height: el.props.logoHeight || '40px',
                    width: 'auto',
                    objectFit: 'contain',
                    marginBottom: '0.4rem'
                  }}
                  alt=""
                />
              );
            })()}

            {el.props.eyebrow && (
              <span style={{ display: 'inline-flex', background: el.props.eyebrowColor ? `${el.props.eyebrowColor}1a` : 'rgba(185, 120, 59, 0.1)', border: `1px solid ${el.props.eyebrowColor || '#B9783B'}`, borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: `calc(0.55rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.18em', color: el.props.eyebrowColor || '#B9783B', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                {el.props.eyebrow}
              </span>
            )}
            <h1 className="brand-title serif-font" style={{ fontFamily: 'inherit', fontSize: `calc(1.6rem * ${fontScale})`, margin: '0.2rem 0', letterSpacing: '0.08em', fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.6)', color: el.props.headlineColor || 'white' }}>{el.props.headline}</h1>
            <div style={{ width: '30px', height: '1.5px', background: '#B9783B', margin: '0.35rem 0' }}></div>
            <p className="serif-font" style={{ fontFamily: 'inherit', fontSize: `calc(0.85rem * ${fontScale})`, fontStyle: 'italic', opacity: 0.95, margin: '0 0 0.15rem 0', textShadow: '0 1px 4px rgba(0,0,0,0.5)', color: el.props.taglineColor || 'inherit' }}>
              {el.props.tagline}
            </p>
            {el.props.shortText && (
              <span style={{ fontFamily: 'inherit', fontSize: `calc(0.65rem * ${fontScale})`, letterSpacing: '0.12em', opacity: 0.75, textShadow: '0 1px 3px rgba(0,0,0,0.5)', color: el.props.shortTextColor || 'inherit' }}>{el.props.shortText}</span>
            )}
          </div>
        );
      }
      case 'dynamic-location': {
        const loc = locations.find(l => l.slug === el.props.slug);
        if (!loc) return <div style={{ fontSize: '9px', opacity: 0.5 }}>Location not selected</div>;

        const showImage = el.props.showImage !== false;
        const showDescription = el.props.showDescription !== false;
        const showSpecs = el.props.showSpecs !== false;

        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
            
            {/* Uppercase Gold Tag */}
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale})`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
              FEATURED DESTINATION
            </div>

            <h4 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(1.0rem * ${fontScale})`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{loc.title}</h4>

            {showImage && loc.heroImage && (
              <div style={{ width: '100%', height: '1.1in', overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <img src={loc.heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={loc.title} />
              </div>
            )}

            {el.props.showShortDescription !== false && loc.shortDescription && (
              <p style={{ fontSize: `calc(0.72rem * ${fontScale})`, fontWeight: 600, opacity: 0.95, margin: '0', lineHeight: '1.35' }}>
                {loc.shortDescription}
              </p>
            )}

            {showDescription && loc.description && (
              <div 
                className="markdown-content"
                style={{ fontSize: `calc(0.72rem * ${fontScale})`, opacity: 0.85, margin: '0', lineHeight: '1.35', whiteSpace: 'normal' }}
                dangerouslySetInnerHTML={{ __html: formatMarkdown(loc.description) }}
              />
            )}

            {/* Metrics Grid */}
            {showSpecs && (loc.anchorStatus || loc.bestTime || loc.suitability) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                {loc.anchorStatus && (
                  <div style={{
                    background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderLeft: '3px solid #B9783B',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Anchor/Dock</span>
                    <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.anchorStatus}</span>
                  </div>
                )}
                {loc.bestTime && (
                  <div style={{
                    background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderLeft: '3px solid #B9783B',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Best Time</span>
                    <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.bestTime}</span>
                  </div>
                )}
                {loc.suitability && (
                  <div style={{
                    background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                    borderLeft: '3px solid #B9783B',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}>
                    <span style={{ fontSize: `calc(0.5rem * ${fontScale})`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Suitability</span>
                    <span style={{ fontSize: `calc(0.7rem * ${fontScale})`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.suitability}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
      case 'contact-card': {
        const showPhone = el.props.showPhone !== false;
        const showEmail = el.props.showEmail !== false;
        const showAddress = el.props.showAddress !== false;
        const showSocials = el.props.showSocials !== false;
        const showQr = el.props.showQr !== false;

        const fontScale = {
          xs: 0.8,
          s: 0.9,
          m: 1.0,
          l: 1.15,
          xl: 1.3
        }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

        return (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '0.5rem',
              width: '100%',
              color: el.props.style?.color || 'inherit',
              fontFamily: "'Inter', sans-serif",
              background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
              border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: '8px',
              padding: '0.5rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {el.props.tagline && (
                <span className="serif-font gold-accent" style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale})`, fontWeight: 600, display: 'block', borderBottom: '1px solid rgba(185,120,59,0.15)', paddingBottom: '0.1rem' }}>
                  {el.props.tagline}
                </span>
              )}
              
              <div style={{ fontSize: `calc(0.68rem * ${fontScale})`, display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: 0.9, marginTop: '0.1rem' }}>
                {showPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Phone size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                    <span>{businessDetails.phone}</span>
                  </div>
                )}
                {showEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Mail size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: `calc(0.6rem * ${fontScale})` }}>{businessDetails.email}</span>
                  </div>
                )}
                {showAddress && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: `calc(0.6rem * ${fontScale})`, opacity: 0.6 }}>{businessDetails.address}</span>
                  </div>
                )}
                {showSocials && (businessDetails.instagram || businessDetails.facebook) && (
                  <>
                    {businessDetails.instagram && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(7px * ${fontScale})`, width: '9px', textAlign: 'center' }}>IG</span>
                        <span style={{ fontSize: `calc(0.6rem * ${fontScale})` }}>{businessDetails.instagram.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}</span>
                      </div>
                    )}
                    {businessDetails.facebook && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(7px * ${fontScale})`, width: '9px', textAlign: 'center' }}>FB</span>
                        <span style={{ fontSize: `calc(0.6rem * ${fontScale})` }}>{businessDetails.facebook.replace('https://facebook.com/', '').replace('https://www.facebook.com/', '')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {showQr && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
                <div style={{ 
                  width: el.props.size || '0.95in', 
                  height: el.props.size || '0.95in', 
                  background: 'white', 
                  padding: '4px', 
                  borderRadius: '6px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1.5px solid #B9783B',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}>
                  {qrUrl ? (
                    <img src={qrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="QR Code" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#ccc' }} />
                  )}
                </div>
                {el.props.ctaText && (
                  <span style={{ fontSize: `calc(6px * ${fontScale})`, opacity: 0.7, fontWeight: 'bold', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                    {el.props.ctaText}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }
      case 'logo': {
        const logoType = el.props.logoType || 'rect';
        const logoUrl = logoType === 'square' 
          ? siteSettings?.brand?.logoSquareUrl 
          : siteSettings?.brand?.logoRectUrl;
        const fallbackText = logoType === 'square' ? 'Logo Square' : 'Logo Rect';
        
        return (
          <div style={{ 
            display: 'flex', 
            justifyContent: el.props.style?.textAlign === 'center' ? 'center' : el.props.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
            width: '100%',
            padding: el.props.style?.padding || '0px'
          }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                style={{ 
                  width: el.props.style?.width || '120px',
                  height: 'auto',
                  objectFit: 'contain'
                }} 
                alt="Logo" 
              />
            ) : (
              <div style={{
                fontSize: '9px',
                opacity: 0.5,
                border: '1px dashed #B9783B',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                {fallbackText}
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  })();

  if (!elementContent) return null;

  return (
    <div style={wrapperStyle}>
      {elementContent}
    </div>
  );
}

function CollateralPrintContent() {
  const searchParams = useSearchParams();
  const { settings: contextSettings } = useSiteSettings();

  // New Grid Design ID
  const designId = searchParams.get('designId') || '';

  // Legacy Parameters Fallback
  const template = searchParams.get('template') || 'trifold';
  const refParam = searchParams.get('ref') || '';
  const campaign = searchParams.get('campaign') || 'general';
  const rawAdventures = searchParams.get('adventures') || '';
  const rawVessels = searchParams.get('vessels') || '';
  const staffSlug = searchParams.get('staff') || '';
  const headlineOverride = searchParams.get('headline') || '';
  const hideGuides = searchParams.get('hideGuides') === 'true';

  const columns = Number(searchParams.get('columns') || '3');
  const showImage = searchParams.get('showImage') !== 'false';
  const showDescription = searchParams.get('showDescription') !== 'false';
  const showDuration = searchParams.get('showDuration') !== 'false';
  const showPrice = searchParams.get('showPrice') !== 'false';
  const showItinerary = searchParams.get('showItinerary') !== 'false';
  const printThemeParam = searchParams.get('printTheme') || 'dark';

  // State
  const [design, setDesign] = useState<PrintDesign | null>(null);
  const [adventures, setAdventures] = useState<ContentItem[]>([]);
  const [vessels, setVessels] = useState<ContentItem[]>([]);
  const [staffList, setStaffList] = useState<ContentItem[]>([]);
  const [locations, setLocations] = useState<ContentItem[]>([]);
  const [staff, setStaff] = useState<ContentItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [siteSettings, setSiteSettings] = useState<any>(null);

  const [businessDetails, setBusinessDetails] = useState({
    name: 'M/Y WHISKEY',
    phone: '850-555-YACHT',
    email: 'concierge@motoryachtwhiskey.com',
    address: 'Destin Harbor, FL',
    url: 'https://mywhiskey.com',
    instagram: '',
    facebook: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [allAdventures, allAssets, allStaff, allLocations, settings] = await Promise.all([
          getContentItems('adventure'),
          getContentItems('asset'),
          getContentItems('staff'),
          getContentItems('location'),
          loadSiteSettings()
        ]);

        if (settings) {
          setSiteSettings(settings);
        }

        if (settings?.contact) {
          setBusinessDetails({
            name: settings.general?.siteName || 'M/Y WHISKEY',
            phone: settings.contact.phone || '850-555-YACHT',
            email: settings.contact.email || 'concierge@motoryachtwhiskey.com',
            address: settings.contact.address || 'Destin Harbor, FL',
            url: 'https://mywhiskey.com',
            instagram: settings.social?.instagram || '',
            facebook: settings.social?.facebook || '',
            twitter: settings.social?.twitter || '',
            linkedin: settings.social?.linkedin || '',
            youtube: settings.social?.youtube || ''
          });
        }

        setAdventures(allAdventures.filter(a => a.status === 'published'));
        setVessels(allAssets.filter(v => v.isVessel && v.status === 'published'));
        setStaffList(allStaff.filter(s => s.status === 'published'));
        setLocations(allLocations.filter(l => l.status === 'published'));

        // Legacy Staff filter
        if (staffSlug) {
          const member = allStaff.find(s => s.slug === staffSlug);
          if (member) setStaff(member);
        } else {
          setStaff(allStaff.find(s => s.isCaptain && s.status === 'published') || null);
        }

        // Load custom print design if id is passed
        if (designId) {
          const loadedDesign = await loadPrintDesign(designId);
          if (loadedDesign) {
            const designObj = loadedDesign as PrintDesign;
            const repeatEnabledParam = searchParams.get('repeatEnabled');
            
            if (repeatEnabledParam !== null) {
              const enabled = repeatEnabledParam === 'true';
              const cols = Number(searchParams.get('repeatCols') || '1');
              const rows = Number(searchParams.get('repeatRows') || '1');
              const paperPreset = (searchParams.get('repeatPaperPreset') || 'letter') as any;
              const paperWidth = searchParams.get('repeatPaperWidth') || '8.5in';
              const paperHeight = searchParams.get('repeatPaperHeight') || '11in';
              const margins = searchParams.get('repeatMargins') || '0.5in';
              const spacing = searchParams.get('repeatSpacing') || '0.25in';
              
              designObj.repeatLayout = {
                enabled,
                paperPreset,
                paperWidth,
                paperHeight,
                rows,
                cols,
                margins,
                spacing
              };
            }
            
            const printThemeParam = searchParams.get('printTheme');
            if (printThemeParam === 'light' || printThemeParam === 'dark') {
              designObj.printTheme = printThemeParam;
            }
            
            setDesign(designObj);
          }
        }
      } catch (err) {
        console.error('Error loading print collateral data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [designId, staffSlug]);

  // Generate QR Code URL (Legacy Mode only, element QR generates inside RenderPrintElement)
  const promoParam = searchParams.get('promo') || searchParams.get('discount') || '';
  let targetUrl = `${businessDetails.url}/?ref=${encodeURIComponent(refParam)}&utm_source=print&utm_medium=collateral&utm_campaign=${encodeURIComponent(campaign)}`;
  if (promoParam) {
    targetUrl += `&promo=${encodeURIComponent(promoParam)}`;
  }

  useEffect(() => {
    if (!loading) {
      if (!design) {
        QRCode.toDataURL(targetUrl, {
          margin: 1,
          width: 300,
          color: {
            dark: '#121416',
            light: '#ffffff'
          }
        })
          .then(url => {
            setQrDataUrl(url);
            // Delay slightly for render
            setTimeout(() => {
              window.print();
            }, 1200);
          })
          .catch(err => {
            console.error('QR code generation failed:', err);
          });
      } else {
        // Delay for QR codes and dynamic contents inside custom design
        setTimeout(() => {
          window.print();
        }, 1500);
      }
    }
  }, [targetUrl, loading, design]);

  if (loading) {
    return (
      <div style={{ background: '#121416', color: '#F4F1EA', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h3>Preparing Print-Ready Layout...</h3>
          <p style={{ opacity: 0.6, fontSize: '0.85rem' }}>Fetching database records & generating high-res QR codes</p>
        </div>
      </div>
    );
  }

  const guidesClass = hideGuides ? 'hide-guides' : '';
  const currentPrintTheme = (design ? design.printTheme : printThemeParam) as 'dark' | 'light';
  const borderStyle = currentPrintTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';

  // Return dynamic @page CSS rule to force correct printer orientation
  const getDynamicPrintStyle = () => {
    if (design) {
      const { repeatLayout } = design;
      if (repeatLayout && repeatLayout.enabled) {
        const sizePreset = repeatLayout.paperPreset === 'a4' ? 'a4 portrait' : 'letter portrait';
        return `@media print { @page { size: ${sizePreset}; margin: 0; } }`;
      } else {
        let sizeRule = `${design.width} ${design.height}`;
        if (design.preset === 'letter-landscape') {
          sizeRule = 'letter landscape';
        } else if (design.preset === 'letter-portrait') {
          sizeRule = 'letter portrait';
        } else if (design.preset === 'a4-landscape') {
          sizeRule = 'a4 landscape';
        } else if (design.preset === 'a4-portrait') {
          sizeRule = 'a4 portrait';
        } else if (design.preset === 'business-card') {
          sizeRule = '3.75in 2.25in';
        }
        return `@media print { @page { size: ${sizeRule}; margin: 0; } }`;
      }
    } else {
      if (template === 'trifold') {
        return `@media print { @page { size: letter landscape; margin: 0; } }`;
      } else if (template === 'rackcard') {
        return `@media print { @page { size: 4.25in 9.25in; margin: 0; } }`;
      } else if (template === 'businesscard') {
        return `@media print { @page { size: 3.75in 2.25in; margin: 0; } }`;
      }
    }
    return '';
  };

  // 1. RENDER CUSTOM GRID DESIGN
  if (design) {
    const { repeatLayout, pages } = design;

    // Repeating layout (e.g. multi-up business cards sheet)
    if (repeatLayout && repeatLayout.enabled) {
      return (
        <div className={`print-container print-theme-${currentPrintTheme} ${guidesClass}`}>
          <style dangerouslySetInnerHTML={{ __html: getDynamicPrintStyle() }} />
          
          {pages.map((p) => (
            <div
              key={`repeat-${p.id}`}
              className={`repeat-sheet print-theme-${currentPrintTheme}`}
              style={{
                width: repeatLayout.paperWidth,
                height: repeatLayout.paperHeight,
                padding: repeatLayout.margins,
                backgroundColor: currentPrintTheme === 'light' ? '#F9F8F6' : '#121416',
                color: currentPrintTheme === 'light' ? '#1E2124' : '#F4F1EA',
              }}
            >
              <div
                className="repeat-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${repeatLayout.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${repeatLayout.rows}, 1fr)`,
                  gap: repeatLayout.spacing,
                  width: '100%',
                  height: '100%'
                }}
              >
                {Array.from({ length: repeatLayout.cols * repeatLayout.rows }).map((_, rIdx) => (
                  <div
                    key={rIdx}
                    style={{
                      width: design.width,
                      height: design.height,
                      position: 'relative',
                      overflow: 'hidden',
                      border: '1px dotted rgba(185, 120, 59, 0.25)',
                      backgroundColor: currentPrintTheme === 'light' ? '#F9F8F6' : '#1A1C1E',
                      margin: 'auto'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: '0.125in',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${design.gridCols}, 1fr)`,
                        gridTemplateRows: `repeat(${design.gridRows}, 1fr)`,
                        width: 'calc(100% - 0.25in)',
                        height: 'calc(100% - 0.25in)',
                        overflow: 'hidden'
                      }}
                    >
                      {p.zones.map((zone) => (
                        <div
                          key={zone.id}
                          style={{
                            gridColumn: `${zone.columnStart} / span ${zone.columnSpan}`,
                            gridRow: `${zone.rowStart} / span ${zone.rowSpan}`,
                            padding: '0.1in',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.25rem',
                            justifyContent: zone.verticalAlign === 'top' ? 'flex-start' : zone.verticalAlign === 'middle' ? 'center' : zone.verticalAlign === 'bottom' ? 'flex-end' : zone.verticalAlign === 'space-between' ? 'space-between' : 'center',
                            height: '100%',
                            backgroundColor: zone.backgroundColor || 'transparent',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Snapping Zone background custom visuals */}
                          {zone.backgroundImage && (
                            <div 
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `url("${zone.backgroundImage}")`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                zIndex: 0
                              }}
                            />
                          )}
                          {zone.backgroundImage && (
                            <div 
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: `rgba(18, 20, 22, ${(zone.backgroundOverlayOpacity ?? 50) / 100})`,
                                zIndex: 1
                              }}
                            />
                          )}

                          {zone.elements.map((el) => (
                            <div 
                              key={el.id} 
                              style={{ 
                                position: el.props.fullPageImage ? 'absolute' : 'relative',
                                ...(el.props.fullPageImage ? { inset: 0, zIndex: 1 } : { zIndex: 2 })
                              }}
                            >
                               <RenderPrintElement
                                 el={el}
                                 adventures={adventures}
                                 vessels={vessels}
                                 staffList={staffList}
                                 locations={locations}
                                 businessDetails={businessDetails}
                                 printTheme={currentPrintTheme}
                                 siteSettings={siteSettings || contextSettings}
                               />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Standard sequential pages (e.g. tri-folds, leaflets)
    return (
      <div className={`print-container print-theme-${currentPrintTheme} ${guidesClass}`}>
        <style dangerouslySetInnerHTML={{ __html: getDynamicPrintStyle() }} />

        {pages.map((p) => (
          <div
            key={p.id}
            className={`page-sheet print-theme-${currentPrintTheme}`}
            style={{
              width: design.width,
              height: design.height,
              backgroundColor: currentPrintTheme === 'light' ? '#F9F8F6' : '#121416',
              color: currentPrintTheme === 'light' ? '#1E2124' : '#F4F1EA',
            }}
          >
            {!hideGuides && (
              <>
                <div className="bleed-bleed"></div>
                <div className="bleed-safe"></div>
                {design.preset === 'letter-landscape' && design.gridCols === 3 && (
                  <>
                    <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(239, 68, 68, 0.4)', pointerEvents: 'none', zIndex: 100 }} />
                    <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(239, 68, 68, 0.4)', pointerEvents: 'none', zIndex: 100 }} />
                  </>
                )}
                <div className="crop-marks">
                  <div className="crop-mark crop-tl"></div>
                  <div className="crop-mark crop-tr"></div>
                  <div className="crop-mark crop-bl"></div>
                  <div className="crop-mark crop-br"></div>
                </div>
              </>
            )}

            <div
              style={{
                position: 'absolute',
                inset: '0.125in',
                display: 'grid',
                gridTemplateColumns: `repeat(${design.gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${design.gridRows}, 1fr)`,
                width: 'calc(100% - 0.25in)',
                height: 'calc(100% - 0.25in)',
                overflow: 'hidden'
              }}
            >
              {p.zones.map((zone) => (
                <div
                  key={zone.id}
                  style={{
                    gridColumn: `${zone.columnStart} / span ${zone.columnSpan}`,
                    gridRow: `${zone.rowStart} / span ${zone.rowSpan}`,
                    padding: '0.2in',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    justifyContent: zone.verticalAlign === 'top' ? 'flex-start' : zone.verticalAlign === 'middle' ? 'center' : zone.verticalAlign === 'bottom' ? 'flex-end' : zone.verticalAlign === 'space-between' ? 'space-between' : 'space-between',
                    borderRight: (design.preset === 'letter-landscape' && zone.columnStart + zone.columnSpan - 1 < design.gridCols) ? `1px solid ${borderStyle}` : 'none',
                    backgroundColor: zone.backgroundColor || 'transparent',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Snapping Zone background custom visuals */}
                  {zone.backgroundImage && (
                    <div 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url("${zone.backgroundImage}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        zIndex: 0
                      }}
                    />
                  )}
                  {zone.backgroundImage && (
                    <div 
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: `rgba(18, 20, 22, ${(zone.backgroundOverlayOpacity ?? 50) / 100})`,
                        zIndex: 1
                      }}
                    />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, width: '100%', position: 'relative', zIndex: 2 }}>
                    {zone.elements.map((el) => (
                      <RenderPrintElement
                        key={el.id}
                        el={el}
                        adventures={adventures}
                        vessels={vessels}
                        staffList={staffList}
                        locations={locations}
                        businessDetails={businessDetails}
                        printTheme={currentPrintTheme}
                        siteSettings={siteSettings || contextSettings}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 2. LEGACY TEMPLATES RENDERER (FALLBACK)
  return (
    <div className={`print-container print-theme-${currentPrintTheme} ${guidesClass}`}>
      <style dangerouslySetInnerHTML={{ __html: getDynamicPrintStyle() }} />

      {template === 'trifold' && (
        <>
          <div className={`page-sheet page-trifold print-theme-${currentPrintTheme}`}>
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div className="trim-content">
              <div className="trifold-col" style={{ borderRight: `1px solid ${borderStyle}` }}>
                <div>
                  <h3 className="brand-title gold-accent" style={{ fontSize: '1.25rem', margin: '0 0 0.75rem 0' }}>The Vessel</h3>
                  {vessels[0] ? (
                    <div>
                      <h4 style={{ margin: '0 0 0.4rem 0', color: currentPrintTheme === 'light' ? '#1E2124' : 'white', fontSize: '0.9rem' }}>{vessels[0].title}</h4>
                      <p style={{ fontSize: '0.72rem', opacity: 0.8, lineHeight: '1.4', margin: '0 0 0.75rem 0' }}>
                        {vessels[0].shortDescription || 'Experience absolute luxury on our signature cruising yacht.'}
                      </p>

                      {vessels[0].heroImage && (
                        <div style={{ width: '100%', height: '1.5in', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${borderStyle}`, marginBottom: '0.75rem' }}>
                          <img src={vessels[0].heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={vessels[0].title} />
                        </div>
                      )}

                      {vessels[0].specifications && Object.entries(vessels[0].specifications).slice(0, 4).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${borderStyle}`, padding: '0.25rem 0', fontSize: '0.68rem' }}>
                          <span style={{ opacity: 0.6 }}>{key}</span>
                          <span style={{ fontWeight: 600 }}>{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.72rem', opacity: 0.6 }}>Luxury fleet assets detailing the motor yacht specs.</p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid rgba(185,120,59,0.2)', paddingTop: '0.75rem', fontSize: '0.68rem', opacity: 0.7 }}>
                  * All charters are fully crewed with professional captains.
                </div>
              </div>

              <div className="trifold-col" style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center', borderRight: `1px solid ${borderStyle}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.6, fontWeight: 700 }}>RESERVATIONS</span>
                  <span className="serif-font gold-accent" style={{ fontSize: '1.4rem', fontWeight: 600 }}>SCAN TO BOOK</span>
                </div>

                <div style={{ width: '1.4in', height: '1.4in', background: 'white', padding: '6px', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginBottom: '1.25rem' }}>
                  {qrDataUrl && <img src={qrDataUrl} className="qr-code-img" alt="Booking QR Code" />}
                </div>

                <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontWeight: 600, color: currentPrintTheme === 'light' ? '#1E2124' : 'white' }}>{businessDetails.name}</div>
                  <div style={{ opacity: 0.8 }}>{businessDetails.phone}</div>
                  <div style={{ opacity: 0.8 }}>{businessDetails.email}</div>
                  <div style={{ opacity: 0.6, fontSize: '0.68rem', marginTop: '0.2rem' }}>{businessDetails.address}</div>
                </div>
              </div>

              <div
                className="trifold-col"
                style={{
                  backgroundImage: vessels[0]?.heroImage ? `linear-gradient(${currentPrintTheme === 'light' ? 'rgba(249,248,246,0.75), rgba(249,248,246,0.95)' : 'rgba(18,20,22,0.45), rgba(18,20,22,0.95)'}), url("${vessels[0].heroImage}")` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  backgroundColor: currentPrintTheme === 'light' ? '#F9F8F6' : '#121416'
                }}
              >
                <div style={{ border: '1px solid rgba(185,120,59,0.3)', padding: '2.5rem 1.25rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', background: currentPrintTheme === 'light' ? 'rgba(249,248,246,0.85)' : 'rgba(18,20,22,0.7)', backdropFilter: 'blur(1px)' }}>
                  <span style={{ letterSpacing: '0.3em', fontSize: '0.6rem', color: '#B9783B', fontWeight: 700 }}>MOTOR YACHT</span>
                  <h1 className="brand-title serif-font" style={{ fontSize: '1.9rem', margin: 0, letterSpacing: '0.08em', color: currentPrintTheme === 'light' ? '#1E2124' : 'white', fontWeight: 600 }}>WHISKEY</h1>
                  <div style={{ width: '30px', height: '1px', background: '#B9783B' }}></div>
                  <p className="serif-font" style={{ fontSize: '0.82rem', fontStyle: 'italic', opacity: 0.8, margin: 0 }}>
                    {headlineOverride || 'Luxury Private Yacht Charters'}
                  </p>
                  <span style={{ fontSize: '0.6rem', letterSpacing: '0.15em', opacity: 0.6 }}>DESTIN • FLORIDA</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`page-sheet page-trifold print-theme-${currentPrintTheme}`}>
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div className="trim-content">
              {adventures.slice(0, columns).map((adv, idx) => (
                <div
                  key={adv.slug}
                  className="trifold-col"
                  style={{
                    width: `${100 / columns}%`,
                    borderRight: idx < columns - 1 ? `1px solid ${borderStyle}` : 'none'
                  }}
                >
                  <div>
                    <span className="serif-font gold-accent" style={{ fontSize: '1.1rem', fontWeight: 600, borderBottom: '1px solid rgba(185,120,59,0.3)', paddingBottom: '0.2rem', display: 'block', marginBottom: '0.75rem' }}>
                      0{idx + 1}. {adv.title}
                    </span>
                    {showDescription && adv.shortDescription && (
                      <p style={{ fontSize: '0.72rem', opacity: 0.85, lineHeight: '1.45', margin: '0 0 0.75rem 0' }}>
                        {adv.shortDescription}
                      </p>
                    )}

                    {showImage && adv.heroImage && (
                      <div style={{ width: '100%', height: '1.4in', overflow: 'hidden', borderRadius: '4px', border: `1px solid ${borderStyle}`, marginBottom: '0.75rem' }}>
                        <img src={adv.heroImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={adv.title} />
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem', fontSize: '0.7rem' }}>
                      {showDuration && adv.duration && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={12} color="#B9783B" />
                          <span style={{ opacity: 0.8 }}><strong style={{ color: currentPrintTheme === 'light' ? '#1E2124' : 'white' }}>Duration:</strong> {adv.duration}</span>
                        </div>
                      )}
                      {adv.maxGuests && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Users size={12} color="#B9783B" />
                          <span style={{ opacity: 0.8 }}><strong style={{ color: currentPrintTheme === 'light' ? '#1E2124' : 'white' }}>Capacity:</strong> Up to {adv.maxGuests} Guests</span>
                        </div>
                      )}
                      {showPrice && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: '11px', width: '12px', textAlign: 'center' }}>$</span>
                          <span style={{ opacity: 0.8 }}>
                            <strong style={{ color: currentPrintTheme === 'light' ? '#1E2124' : 'white' }}>Price:</strong> {adv.basePrice && Number(adv.basePrice) > 0 ? `From $${Number(adv.basePrice).toLocaleString()}` : 'Rates on Request'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    {showItinerary && adv.itinerary && adv.itinerary.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em', color: currentPrintTheme === 'light' ? '#1E2124' : 'white', display: 'block', marginBottom: '0.3rem' }}>ITINERARY HIGHLIGHTS</span>
                        {(() => {
                          const highlights = (adv.itinerary || []).filter((step: any) => step.isHighlight);
                          const displaySteps = highlights.length > 0 ? highlights.slice(0, 5) : (adv.itinerary || []).slice(0, 3);
                          return displaySteps.map((step: any, sIdx: number) => (
                            <div key={sIdx} style={{ fontSize: '0.68rem', display: 'flex', gap: '0.4rem', marginBottom: '0.25rem', alignItems: 'flex-start' }}>
                              <span style={{ color: '#B9783B', fontWeight: 600 }}>•</span>
                              <span style={{ opacity: 0.8 }}>{step.title}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {template === 'rackcard' && (
        <>
          <div className="page-sheet page-rackcard">
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div
              className="trim-content"
              style={{
                flexDirection: 'column',
                padding: '0.4in',
                justifyContent: 'space-between',
                textAlign: 'center',
                alignItems: 'center',
                backgroundImage: (vessels[0]?.heroImage || adventures[0]?.heroImage) ? `linear-gradient(rgba(18,20,22,0.35), rgba(18,20,22,0.85)), url("${vessels[0]?.heroImage || adventures[0]?.heroImage}")` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '1.5rem', background: 'rgba(18,20,22,0.6)', padding: '1rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(1px)' }}>
                <span style={{ letterSpacing: '0.3em', fontSize: '0.65rem', color: '#B9783B', fontWeight: 700 }}>MOTOR YACHT</span>
                <h1 className="brand-title serif-font" style={{ fontSize: '2.1rem', margin: 0, fontWeight: 600 }}>WHISKEY</h1>
                <div style={{ width: '40px', height: '1px', background: '#B9783B', margin: '0.5rem auto' }}></div>
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.6 }}>DESTIN • FLORIDA</span>
              </div>

              <div style={{ border: '1px solid rgba(185,120,59,0.2)', padding: '1.5rem 1rem', background: 'rgba(18,20,22,0.85)', width: '100%', borderRadius: '6px' }}>
                <h3 className="serif-font gold-accent" style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
                  {headlineOverride || 'Luxury Private Charter'}
                </h3>
                <p style={{ fontSize: '0.75rem', opacity: 0.8, lineHeight: '1.4', margin: 0 }}>
                  Experience the Emerald Coast aboard a premium yacht. Sunset cruises, sandbar getaways, and private coastal cruises.
                </p>
              </div>

              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginBottom: '1rem', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                M/Y WHISKEY • 5-Star Rated Captains
              </div>
            </div>
          </div>

          <div className="page-sheet page-rackcard">
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div className="trim-content" style={{ flexDirection: 'column', padding: '0.4in', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
              <div>
                <span className="serif-font gold-accent" style={{ fontSize: '1.15rem', fontWeight: 600, display: 'block', margin: '1rem 0 0.75rem 0' }}>Our Excursions</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
                  {adventures.slice(0, 3).map((adv) => (
                    <div key={adv.slug} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {adv.heroImage && (
                        <img src={adv.heroImage} style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }} alt="" />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 600, color: 'white' }}>
                          <span>{adv.title}</span>
                          {adv.basePrice !== undefined && <span className="gold-accent">${Number(adv.basePrice).toLocaleString()}</span>}
                        </div>
                        <p style={{ fontSize: '0.62rem', opacity: 0.7, margin: '0.15rem 0 0 0', lineHeight: '1.3' }}>
                          {adv.shortDescription}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.15em', opacity: 0.6, fontWeight: 700 }}>BOOK PRIVATE CHARTER</span>
                <div style={{ width: '1.2in', height: '1.2in', background: 'white', padding: '5px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                  {qrDataUrl && <img src={qrDataUrl} className="qr-code-img" alt="Booking QR Code" />}
                </div>
                <span className="gold-accent" style={{ fontSize: '0.78rem', fontWeight: 600, marginTop: '0.25rem' }}>
                  {businessDetails.phone}
                </span>
                <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>
                  {businessDetails.email}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {template === 'businesscard' && (
        <>
          <div className="page-sheet page-businesscard">
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div className="trim-content">
              <div className="business-card-front" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%', height: '100%' }}>
                {staff?.heroImage && (
                  <img
                    src={staff.heroImage}
                    style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #B9783B', flexShrink: 0 }}
                    alt={staff.title}
                  />
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                  <h3 className="brand-title serif-font" style={{ fontSize: '0.9rem', margin: 0, color: 'white', fontWeight: 600 }}>
                    {staff ? staff.title : 'Crew Member'}
                  </h3>
                  <span className="gold-accent" style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    {staff ? (staff.role || (staff.isCaptain ? 'Captain' : 'Crew')) : 'Charter Representative'}
                  </span>

                  <div style={{ width: '20px', height: '1px', background: '#B9783B', margin: '0.15rem 0' }}></div>

                  <div style={{ fontSize: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.05rem', opacity: 0.8, color: '#D8C7AF' }}>
                    <span>{businessDetails.phone}</span>
                    <span>{businessDetails.email}</span>
                  </div>
                </div>

                <div style={{ width: '0.85in', height: '0.85in', background: 'white', padding: '3px', borderRadius: '3px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)', flexShrink: 0 }}>
                  {qrDataUrl && <img src={qrDataUrl} className="qr-code-img" alt="Attributed QR Code" />}
                </div>
              </div>
            </div>
          </div>

          <div className="page-sheet page-businesscard">
            <div className="bleed-bleed"></div>
            <div className="bleed-safe"></div>
            <div className="trim-content">
              <div className="business-card-back">
                <span style={{ fontSize: '0.5rem', letterSpacing: '0.25em', opacity: 0.6 }}>MOTOR YACHT</span>
                <h2 className="brand-title serif-font" style={{ fontSize: '1.3rem', margin: 0, fontWeight: 600, letterSpacing: '0.05em' }}>WHISKEY</h2>
                <div style={{ width: '30px', height: '1px', background: '#B9783B' }}></div>
                <span style={{ fontSize: '0.55rem', opacity: 0.7, color: '#D8C7AF' }}>DESTIN • FLORIDA</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CollateralPrintPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#121416', color: '#F4F1EA', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <h3>Loading Print Renderer...</h3>
      </div>
    }>
      <CollateralPrintContent />
    </Suspense>
  );
}
