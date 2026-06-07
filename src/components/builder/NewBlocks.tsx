'use client';
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageNode, ThemeConfig } from '@/store/useBuilderStore';
import { Anchor, MapPin, Navigation, Info, Users, Star, Quote, ChevronDown, ChevronUp, CheckCircle, Video, Play, Clock, Ship } from 'lucide-react';
import remarkBreaks from 'remark-breaks';
import * as LucideIcons from 'lucide-react';
import { ChevronLeft, ChevronRight, X as CloseIcon } from 'lucide-react';
import VideoPlayer from '@/components/public/VideoPlayer';
import { SmartLink } from '@/components/SmartLink';
import { getContentItems, ContentItem, getContentTypeConfigs, ContentTypeConfig, getContentItem } from '@/lib/db';
import { SwipeScrollContainer } from './SwipeScrollContainer';

export const TextBlock = ({ node, theme }: { node: PageNode, theme?: ThemeConfig }) => {
  const preset = node.props.typographyPreset;
  
  const presetStyle = preset && theme?.typography?.[preset as keyof typeof theme.typography] 
    ? { ...(theme.typography[preset as keyof typeof theme.typography] as React.CSSProperties) } 
    : {};

  if (preset && ['h1', 'h2', 'h3'].includes(preset)) {
    presetStyle.fontFamily = theme?.typography?.headingFontFamily;
  } else if (preset) {
    presetStyle.fontFamily = theme?.typography?.bodyFontFamily;
  }

  const DynamicTag = preset === 'h1' ? 'h1' : preset === 'h2' ? 'h2' : preset === 'h3' ? 'h3' : preset === 'small' ? 'small' : 'p';

  return (
    <div style={{ color: node.props.style?.color || 'inherit', ...presetStyle, ...node.props.style }}>
      <ReactMarkdown
        components={{
          p: ({node, ...props}) => <DynamicTag style={{ margin: '0.5rem 0', ...presetStyle }} {...props} />,
          ul: ({node, ...props}) => <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', ...presetStyle }} {...props} />,
          ol: ({node, ...props}) => <ol style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', ...presetStyle }} {...props} />,
          li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
        }}
      >
        {node.props.text}
      </ReactMarkdown>
    </div>
  );
};

// ─── HTML EMBED ─────────────────────────────────────────────────────────────
export const HtmlBlock = ({ node }: { node: PageNode }) => {
  const { htmlCode = '' } = node.props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Standard React dangerouslySetInnerHTML suppresses script parsing/execution.
    // We force execution by cloning scripts and replacing them in the DOM.
    const scripts = containerRef.current.getElementsByTagName('script');
    Array.from(scripts).forEach(oldScript => {
      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy content
      if (oldScript.innerHTML) {
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      }
      
      // Replace script
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });
  }, [htmlCode]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        margin: '0 auto',
        ...node.props.style 
      }}
      dangerouslySetInnerHTML={{ __html: htmlCode }}
    />
  );
};

// ─── DIVIDER ────────────────────────────────────────────────────────────────
export const DividerBlock = ({ node }: { node: PageNode }) => (
  <hr style={{
    borderStyle: node.props.style || 'solid',
    borderWidth: node.props.thickness || '1px',
    borderColor: node.props.color || 'var(--color-border)',
    margin: node.props.margin || '2rem 0',
    width: '100%',
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  }} />
);

// â”€â”€â”€ ICON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const IconBlock = ({ node }: { node: PageNode }) => {
  const iconName = node.props.iconName || 'Anchor';
  const Icon = (LucideIcons as any)[iconName] as React.ComponentType<any> | undefined;
  if (!Icon) return <div style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>Icon "{iconName}" not found</div>;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
      <Icon size={node.props.size || 48} color={node.props.color || 'var(--color-primary)'} />
    </div>
  );
};

// â”€â”€â”€ VIDEO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const VideoBlock = ({ node }: { node: PageNode }) => {
  const {
    videoUrl = '',
    autoPlay = false,
    muted = true,
    loop = false,
    startTime = 0,
    endTime = null,
    playbackSpeed = 1.0,
    objectFit = 'contain',
    overlayOpacity = 0,
    showControls = true
  } = node.props;

  return (
    <div style={{ width: '100%', borderRadius: 'var(--base-radius)', overflow: 'hidden', background: 'transparent', aspectRatio: '16/9' }}>
      <VideoPlayer 
        url={videoUrl}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        startTime={startTime}
        endTime={endTime}
        playbackSpeed={playbackSpeed}
        objectFit={objectFit}
        overlayOpacity={overlayOpacity}
        showControls={showControls}
      />
    </div>
  );
};

// â”€â”€â”€ MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAP_FILTERS: Record<string, string> = {
  standard: 'none',
  grayscale: 'grayscale(100%) contrast(1.1) brightness(0.95)',
  dark: 'invert(90%) hue-rotate(180deg) grayscale(30%) contrast(1.2)',
  sepia: 'sepia(60%) grayscale(10%) contrast(0.9)',
  desaturated: 'grayscale(50%) opacity(0.9) contrast(1.05)',
  luxuryBlue: 'sepia(100%) hue-rotate(190deg) saturate(250%) brightness(85%) contrast(1.1)'
};

export const MapBlock = ({ node, isEditorMode = false }: { node: PageNode; isEditorMode?: boolean }) => {
  const title = node.props.title || '';
  const subtitle = node.props.subtitle || '';
  const theme = node.props.mapTheme || 'standard';
  
  const query = encodeURIComponent(node.props.locationQuery || 'Monaco');
  const zoom = node.props.zoomLevel || 14;
  const isSatellite = node.props.isSatellite || false;
  const src = `https://maps.google.com/maps?q=${query}&z=${zoom}${isSatellite ? '&t=k' : ''}&output=embed`;
  
  const hasContent = (title && title.trim() !== '') || (subtitle && subtitle.trim() !== '');
  const filterStyle = MAP_FILTERS[theme] || 'none';

  return (
    <div style={{ width: '100%', padding: '1rem 0', ...node.props.style }}>
      {/* Header block with 10px minimum clickable spacing if empty */}
      <div style={{ 
        padding: hasContent ? '1rem 2rem 2rem' : '5px', 
        minHeight: hasContent ? 'auto' : '10px', 
        textAlign: 'center',
        transition: 'padding 0.2s'
      }}>
        {title && (
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--color-primary)' }}>
            <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{title}</ReactMarkdown>
          </h2>
        )}
        {subtitle && (
          <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '1rem' }}>
            <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{subtitle}</ReactMarkdown>
          </p>
        )}
      </div>

      <div style={{ width: '100%', aspectRatio: '16/8', borderRadius: 'var(--base-radius)', overflow: 'hidden', position: 'relative', border: '1px solid var(--color-border)' }}>
        <iframe 
          src={src} 
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none',
            pointerEvents: isEditorMode ? 'none' : 'auto',
            filter: filterStyle,
            backgroundColor: '#eee' // subtle backdrop color
          }} 
          allowFullScreen 
          loading="lazy" 
        />
      </div>
    </div>
  );
};

// â”€â”€â”€ ACCORDION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const AccordionBlock = ({ node }: { node: PageNode }) => {
  const [open, setOpen] = useState<number | null>(null);
  const items: { question: string; answer: string }[] = node.props.items || [];
  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '4rem 2rem', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '2.5rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ background: 'var(--color-surface)', borderRadius: 'var(--base-radius)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <button
              onClick={() => setOpen(open === idx ? null : idx)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', background: 'transparent', border: 'none', color: 'var(--color-foreground)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left', gap: '1rem' }}
            >
              <span>{item.question}</span>
              <span style={{ fontSize: '1.5rem', lineHeight: 1, color: 'var(--color-primary)', flexShrink: 0, transform: open === idx ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>+</span>
            </button>
            {open === idx && (
              <div style={{ padding: '0 1.5rem 1.25rem', color: 'var(--color-muted)', lineHeight: 1.7 }}>
                <ReactMarkdown>{item.answer}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// â”€â”€â”€ AMENITIES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const AmenitiesBlock = ({ node }: { node: PageNode }) => {
  const features: { icon: string; title: string; description: string }[] = node.props.features || [];
  return (
    <div style={{ width: '100%', padding: '4rem 2rem', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {features.map((f, idx) => {
          const Icon = (LucideIcons as any)[f.icon] as React.ComponentType<any> | undefined;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', padding: '2rem', background: 'var(--color-surface)', borderRadius: 'var(--base-radius)', border: '1px solid var(--color-border)' }}>
              {Icon && <Icon size={40} color="var(--color-primary)" />}
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>{f.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// â”€â”€â”€ PRICING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const PricingBlock = ({ node }: { node: PageNode }) => {
  const specs: { label: string; value: string }[] = node.props.specs || [];
  const pricing: { season: string; rate: string }[] = node.props.pricing || [];
  return (
    <div style={{ width: '100%', padding: '4rem 2rem', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.1em' }}>Specifications</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {specs.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-muted)', fontSize: '0.95rem' }}>{s.label}</td>
                  <td style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-muted)', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.1em' }}>Charter Rates</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {pricing.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '0.75rem 0', color: 'var(--color-muted)', fontSize: '0.95rem' }}>{p.season}</td>
                  <td style={{ padding: '0.75rem 0', fontWeight: 700, color: 'var(--color-primary)', textAlign: 'right' }}>{p.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// â”€â”€â”€ CREW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const CrewBlock = ({ node }: { node: PageNode }) => {
  const crew: { image: string; name: string; role: string; bio: string }[] = node.props.crew || [];
  return (
    <div style={{ width: '100%', padding: '4rem 2rem', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <SwipeScrollContainer
        active={node.props.mobileLayout === 'swipe'}
        gridTemplateColumns="repeat(auto-fit, minmax(260px, 1fr))"
        gap="2rem"
        arrowColor="var(--color-primary)"
        style={{ maxWidth: '1200px', margin: '0 auto' }}
      >
        {crew.map((member, idx) => (
          <div key={idx} style={{ background: 'var(--color-surface)', borderRadius: 'var(--base-radius)', border: '1px solid var(--color-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
              {member.image ? (
                <img src={member.image} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>No Photo</div>
              )}
            </div>
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 700 }}>{member.name}</h3>
              <div style={{ color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{member.role}</div>
              <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{member.bio}</p>
            </div>
          </div>
        ))}
      </SwipeScrollContainer>
    </div>
  );
};

// â”€â”€â”€ ITINERARY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ItineraryBlock = ({ node }: { node: PageNode }) => {
  const days: { dayNumber: number; location: string; description: string; image: string }[] = node.props.days || [];
  return (
    <div style={{ width: '100%', padding: '4rem 2rem', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '3rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: 'var(--color-border)', transform: 'translateX(-50%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {days.map((day, idx) => {
            const isLeft = idx % 2 === 0;
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isLeft && (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--base-radius)', overflow: 'hidden', maxWidth: '380px', width: '100%' }}>
                      {day.image && <img src={day.image} alt={day.location} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />}
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.25rem' }}>{day.location}</div>
                        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{day.description}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', zIndex: 1 }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>D{day.dayNumber}</div>
                </div>
                <div>
                  {!isLeft && (
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--base-radius)', overflow: 'hidden', maxWidth: '380px', width: '100%' }}>
                      {day.image && <img src={day.image} alt={day.location} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />}
                      <div style={{ padding: '1.25rem' }}>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.25rem' }}>{day.location}</div>
                        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{day.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const TestimonialsBlock = ({ node }: { node: PageNode }) => {
  const [active, setActive] = useState(0);
  const quotes: { text: string; author: string }[] = node.props.quotes || [];
  if (quotes.length === 0) return null;
  const prev = () => setActive((a) => (a - 1 + quotes.length) % quotes.length);
  const next = () => setActive((a) => (a + 1) % quotes.length);
  return (
    <div style={{ width: '100%', padding: '4rem 2rem', textAlign: 'center', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ marginBottom: '2.5rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
        <div style={{ fontSize: '5rem', lineHeight: 0.8, color: 'var(--color-primary)', opacity: 0.4, marginBottom: '1rem' }}>&ldquo;</div>
        <blockquote style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.8, color: 'var(--color-foreground)', fontStyle: 'italic', minHeight: '80px' }}>
          {quotes[active].text}
        </blockquote>
        <cite style={{ display: 'block', marginTop: '1.5rem', color: 'var(--color-primary)', fontStyle: 'normal', fontWeight: 600 }}>
          {quotes[active].author}
        </cite>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={prev} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LucideIcons.ChevronLeft size={20} /></button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {quotes.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ width: '8px', height: '8px', borderRadius: '50%', border: 'none', background: i === active ? 'var(--color-primary)' : 'var(--color-border)', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          <button onClick={next} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LucideIcons.ChevronRight size={20} /></button>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const VideoHeroBlock = ({ node }: { node: PageNode }) => {
  const { 
    videoUrl = '', 
    loop = true, 
    startTime = 0, 
    endTime = null, 
    playbackSpeed = 1.0,
    overlayOpacity = 0.55,
    fullWidth = true,
    objectFit = 'cover',
    showControls = false
  } = node.props;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: fullWidth ? 'none' : '1200px',
      margin: '0 auto',
      minHeight: '600px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: 'var(--section-padding)',
      borderRadius: fullWidth ? '0' : 'var(--base-radius)',
      ...node.props.style
    }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <VideoPlayer 
          url={videoUrl}
          autoPlay={true}
          muted={true}
          loop={loop}
          startTime={startTime}
          endTime={endTime}
          playbackSpeed={playbackSpeed}
          objectFit={objectFit}
          overlayOpacity={overlayOpacity}
          showControls={showControls}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 2, padding: '4rem 2rem', maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '1rem' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.headline || 'M/Y Whiskey'}</ReactMarkdown>
        </h1>
        <p style={{ fontSize: 'var(--p-large-font-size)', fontWeight: 'var(--p-large-font-weight)', color: '#ddd', marginBottom: '2.5rem' }}>
          {node.props.subheadline || 'Life at sea, reimagined.'}
        </p>
        <SmartLink href={node.props.buttonLink || '#'} target={node.props.buttonTarget} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '1rem 2.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--base-radius)', fontSize: 'var(--a-font-size)', fontWeight: 'var(--a-font-weight)', cursor: 'pointer' }}>
            {node.props.buttonText || 'Enquire Now'}
          </button>
        </SmartLink>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const GalleryWithLightbox = ({ node, isEditorMode = false }: { node: PageNode; isEditorMode?: boolean }) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const images: string[] = node.props.images || [];
  const openLightbox = (idx: number) => { if (!isEditorMode) setLightboxIdx(idx); };
  const closeLightbox = () => setLightboxIdx(null);
  const prev = () => setLightboxIdx((i) => (i! - 1 + images.length) % images.length);
  const next = () => setLightboxIdx((i) => (i! + 1) % images.length);

  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx]);

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', ...node.props.style }}>
      {node.props.title && (
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
      )}
      <SwipeScrollContainer
        active={node.props.mobileLayout === 'swipe'}
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
        gap="1.5rem"
        arrowColor="var(--color-primary)"
      >
        {images.map((img, idx) => (
          <div key={idx} onClick={() => openLightbox(idx)} style={{ position: 'relative', borderRadius: 'var(--base-radius)', overflow: 'hidden', aspectRatio: '4/3', cursor: isEditorMode ? 'default' : 'pointer' }}>
            {img ? (
              <img src={img} alt={`Gallery image ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', display: 'block' }}
                onMouseOver={(e) => { if (!isEditorMode) e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--color-background)', border: '2px dashed var(--color-border)' }} />
            )}
          </div>
        ))}
      </SwipeScrollContainer>
      {lightboxIdx !== null && (
        <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Close Button */}
          <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <CloseIcon size={20} />
          </button>
          
          {/* Prev Button */}
          <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: 'absolute', left: '1.25rem', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <ChevronLeft size={28} />
          </button>
          
          {/* Image */}
          <img onClick={(e) => e.stopPropagation()} src={images[lightboxIdx]} alt="" style={{ maxHeight: '90vh', maxWidth: 'calc(100vw - 160px)', objectFit: 'contain', borderRadius: '8px', userSelect: 'none' }} />
          
          {/* Next Button */}
          <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: 'absolute', right: '1.25rem', width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <ChevronRight size={28} />
          </button>
          
          {/* Counter */}
          <div style={{ position: 'absolute', bottom: '1.25rem', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', background: 'rgba(0,0,0,0.4)', padding: '0.25rem 0.75rem', borderRadius: '9999px' }}>{lightboxIdx + 1} / {images.length}</div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const EnhancedHeroBlock = ({ node }: { node: PageNode }) => {
  const {
    eyebrow = 'PRIVATE COASTAL ADVENTURES',
    headline = 'Private Coastal Adventures',
    subheadline = 'Understated luxury. Open water.',
    primaryButtonText = 'Explore Experiences',
    secondaryButtonText = 'Plan Your Charter',
    locationText = 'Departing from Baytowne Marina, Sandestin, Florida',
    bgImage = '',
    overlayOpacity = 0.6,
    fullWidth = true,
    minHeight = '85vh',
    textAlignment = 'center',
    leftOpacity = 0.6,
    centerOpacity = 0.4,
    rightOpacity = 0.1,
    // New styling props
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'inherit',
    subheadlineColor = '#e0e0e0',
    primaryButtonBgColor = 'var(--color-primary)',
    primaryButtonTextColor = 'white',
    secondaryButtonBgColor = 'transparent',
    secondaryButtonTextColor = 'white',
    contentBgColor = 'transparent',
    innerBorderRadius = fullWidth ? '0' : 'var(--base-radius)',
    headlineFontSize = 'clamp(3rem, 5vw, 4.5rem)',
    subheadlineFontSize = '1.2rem',
  } = node.props;

  const isGradient = textAlignment === 'left-half' || textAlignment === 'right-half';
  const bgGradient = isGradient
    ? `linear-gradient(to right, rgba(0,0,0,${leftOpacity}) 0%, rgba(0,0,0,${leftOpacity}) 20%, rgba(0,0,0,${centerOpacity}) 50%, rgba(0,0,0,${rightOpacity}) 80%, rgba(0,0,0,${rightOpacity}) 100%)`
    : `linear-gradient(rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${overlayOpacity}))`;

  return (
    <section style={{
      width: '100%',
      ...node.props.style
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: fullWidth ? 'none' : '1200px',
        margin: '0 auto',
        minHeight: minHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 0,
        borderRadius: innerBorderRadius,
        backgroundColor: contentBgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
      }}>
        {bgImage && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: bgGradient,
            zIndex: 1,
            pointerEvents: 'none'
          }} />
        )}
        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'var(--section-padding)',
        }}>
          <div style={{ 
            maxWidth: (textAlignment === 'left-half' || textAlignment === 'right-half') ? 'min(100%, max(50%, 400px))' : '900px', 
            margin: textAlignment === 'left-half' ? '0 auto 0 0' : textAlignment === 'right-half' ? '0 0 0 auto' : '0 auto', 
            width: '100%', 
            textAlign: 'left' 
          }}>
          {eyebrow && (
            <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>
              {eyebrow}
            </div>
          )}
          <h1 style={{ marginBottom: '1.5rem', fontSize: headlineFontSize, fontWeight: 'var(--h1-font-weight)', lineHeight: 1.1, color: headlineColor, fontFamily: 'var(--font-heading)' }}>
            <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown>
          </h1>
          {subheadline && (
            <div style={{ fontSize: subheadlineFontSize, fontWeight: 400, color: subheadlineColor, marginBottom: '2.5rem', maxWidth: '500px', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
              <ReactMarkdown components={{ p: (({children}: any) => <p style={{ fontSize: 'inherit', margin: 0 }}>{children}</p>) as any }}>{subheadline}</ReactMarkdown>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
            {primaryButtonText && (
              <SmartLink href={node.props.primaryButtonLink || '#'} target={node.props.primaryButtonTarget} style={{ textDecoration: 'none' }}>
                <button style={{ padding: '0.875rem 2rem', background: primaryButtonBgColor, color: primaryButtonTextColor, border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                  {primaryButtonText}
                </button>
              </SmartLink>
            )}
            {secondaryButtonText && (
              <SmartLink href={node.props.secondaryButtonLink || '#'} target={node.props.secondaryButtonTarget} style={{ textDecoration: 'none' }}>
                <button style={{ padding: '0.875rem 2rem', background: secondaryButtonBgColor, color: secondaryButtonTextColor, border: `1px solid ${secondaryButtonTextColor}`, borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
                  {secondaryButtonText}
                </button>
              </SmartLink>
            )}
          </div>
        {locationText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#e0e0e0', marginTop: '2rem' }}>
            <LucideIcons.MapPin size={18} />
            <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{locationText}</ReactMarkdown>
          </div>
        )}
      </div>
      </div>
      </div>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const TextMediaBlock = ({ node }: { node: PageNode }) => {
  const {
    eyebrow = '',
    headline = '',
    description = '',
    linkText = '',
    imageUrl = '',
    imagePosition = 'right',
    // New styling props
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    descriptionColor = 'var(--color-foreground)',
    linkColor = 'var(--color-primary)',
    headlineFontSize = '2.5rem',
    descriptionFontSize = '1.05rem',
    autoPlay = true,
    muted = true,
    loop = true,
    showControls = false,
    startTime = 0,
    endTime = null,
    playbackSpeed = 1.0,
  } = node.props;

  const isVideo = imageUrl?.match(/\.(mp4|webm|ogg|mov)/i) || imageUrl?.includes('video') || imageUrl?.includes('youtube.com') || imageUrl?.includes('youtu.be') || imageUrl?.includes('vimeo.com');

  const content = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: imagePosition === 'page-width' ? '0' : '2rem' }}>
      {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]} components={{ p: (({children}: any) => <>{children}</>) as any }}>{eyebrow}</ReactMarkdown></div>}
      {headline && <h2 style={{ marginBottom: '1.5rem', color: headlineColor, fontSize: headlineFontSize, lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]} components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
      {imagePosition !== 'page-width' && description && <div style={{ color: descriptionColor, fontSize: descriptionFontSize, lineHeight: 1.6, marginBottom: '2rem', fontFamily: 'var(--font-sans)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{description}</ReactMarkdown></div>}
      {imagePosition !== 'page-width' && linkText && <SmartLink href={node.props.linkUrl || '#'} target={node.props.linkTarget} style={{ color: linkColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]} components={{ p: (({children}: any) => <>{children}</>) as any }}>{linkText}</ReactMarkdown> &rarr;</SmartLink>}
    </div>
  );

  const media = (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      {imageUrl ? (
         isVideo ? (
           <div style={{ width: '100%', borderRadius: '1rem', overflow: 'hidden', aspectRatio: '16/9' }}>
             <VideoPlayer 
               url={imageUrl} 
               autoPlay={autoPlay} 
               muted={muted} 
               loop={loop} 
               showControls={showControls} 
               startTime={startTime} 
               endTime={endTime} 
               playbackSpeed={playbackSpeed} 
               objectFit="cover" 
             />
           </div>
         ) : (
           <img src={imageUrl} alt="Feature Media" style={{ width: '100%', borderRadius: '1rem', objectFit: 'cover' }} />
         )
      ) : (
         <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--color-background)', border: '2px dashed var(--color-border)', borderRadius: '1rem' }} />
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      {imagePosition === 'page-width' ? (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px' }}>
            {content}
          </div>
          <div style={{ width: '100%' }}>
            {media}
          </div>
          <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {description && <div style={{ color: descriptionColor, fontSize: descriptionFontSize, lineHeight: 1.6, marginBottom: '2rem', fontFamily: 'var(--font-sans)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]}>{description}</ReactMarkdown></div>}
            {linkText && <SmartLink href={node.props.linkUrl || '#'} target={node.props.linkTarget} style={{ color: linkColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}><ReactMarkdown remarkPlugins={[remarkBreaks]} components={{ p: (({children}: any) => <>{children}</>) as any }}>{linkText}</ReactMarkdown> &rarr;</SmartLink>}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: imagePosition === 'right' ? 'row' : 'row-reverse', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
          <div style={{ flex: '1 1 min(400px, 100%)' }}>{content}</div>
          <div style={{ flex: '1 1 min(400px, 100%)' }}>{media}</div>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const ExperiencesGridBlock = ({ node }: { node: PageNode }) => {
  const {
    eyebrow = '',
    headline = '',
    cards = [],
    bottomText = '',
    // New styling props
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    cardBgColor = '#192D3B',
    cardTextColor = 'var(--color-foreground)',
    cardBorderRadius = '4px',
    bottomTextColor = 'var(--color-foreground)',
    headlineFontSize = '2.5rem',
  } = node.props;

  return (
    <section style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
        {headline && <h2 style={{ marginBottom: '3rem', color: headlineColor, fontSize: headlineFontSize, fontFamily: 'var(--font-heading)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
        
        <SwipeScrollContainer
          active={node.props.mobileLayout === 'swipe'}
          gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          gap="1.5rem"
          arrowColor={eyebrowColor}
          style={{ marginBottom: '4rem', textAlign: 'center' }}
        >
          {cards.map((c: any, i: number) => {
            const Icon = c.icon ? (LucideIcons as any)[c.icon] as React.ComponentType<any> | undefined : undefined;
            return (
              <div key={i} style={{ background: cardBgColor, borderRadius: cardBorderRadius, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ aspectRatio: '16/9', overflow: 'hidden' }}>
                  {c.image ? <img src={c.image} alt={c.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--color-background)' }} />}
                </div>
                <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  {Icon && <div style={{ marginBottom: '1rem', width: '48px', height: '48px', borderRadius: '50%', border: `1px solid ${eyebrowColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={eyebrowColor} /></div>}
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: cardTextColor, fontFamily: 'var(--font-heading)' }}>{c.title}</h3>
                  {c.subtitle && <div style={{ color: eyebrowColor, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{c.subtitle}</div>}
                  <p style={{ color: '#b0bec5', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem', fontFamily: 'var(--font-sans)' }}>{c.description}</p>
                  <div style={{ marginTop: 'auto' }}>
                     <SmartLink href={c.linkUrl || '#'} target={c.linkTarget} style={{ color: eyebrowColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>{c.linkText} &rarr;</SmartLink>
                  </div>
                </div>
              </div>
            );
          })}
        </SwipeScrollContainer>
        
        {bottomText && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', opacity: 0.7 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)', maxWidth: '100px' }} />
            <div style={{ color: bottomTextColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>{bottomText}</div>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-border)', maxWidth: '100px' }} />
          </div>
        )}
      </div>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const YachtFeatureBlock = ({ node }: { node: PageNode }) => {
  const {
    eyebrow = '',
    headline = '',
    description = '',
    images = [],
    amenities = [],
    linkText = '',
    // New styling props
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    descriptionColor = 'var(--color-foreground)',
    linkColor = 'var(--color-primary)',
    headlineFontSize = '2.5rem',
  } = node.props;

  return (
    <section style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '4rem', alignItems: 'center' }}>
        {/* Left side: Images */}
        <div style={{ flex: '1 1 min(500px, 100%)', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '1rem', aspectRatio: '1' }}>
          <div style={{ gridColumn: '1 / 2', gridRow: '1 / 3', overflow: 'hidden' }}>
            {images[0] ? <img src={images[0]} alt="Yacht main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--color-background)' }} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            {images[1] ? <img src={images[1]} alt="Yacht detail 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--color-background)' }} />}
          </div>
          <div style={{ overflow: 'hidden' }}>
            {images[2] ? <img src={images[2]} alt="Yacht detail 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'var(--color-background)' }} />}
          </div>
        </div>
        
        {/* Right side: Text + Amenities */}
        <div style={{ flex: '1 1 min(500px, 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
          {headline && <h2 style={{ marginBottom: '1.5rem', color: headlineColor, fontSize: headlineFontSize, lineHeight: 1.2, fontFamily: 'var(--font-heading)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
          {description && <div style={{ color: descriptionColor, fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem', fontFamily: 'var(--font-sans)' }}><ReactMarkdown>{description}</ReactMarkdown></div>}
          
          {amenities && amenities.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              {amenities.map((am: any, i: number) => {
                const Icon = am.icon ? (LucideIcons as any)[am.icon] as React.ComponentType<any> | undefined : undefined;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {Icon && <Icon size={18} color={linkColor} />}
                    <span style={{ fontSize: '0.875rem', color: descriptionColor, fontFamily: 'var(--font-sans)' }}>{am.text}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          {linkText && <SmartLink href={node.props.linkUrl || '#'} target={node.props.linkTarget} style={{ color: linkColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>{linkText} &rarr;</SmartLink>}
        </div>
      </div>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const TestimonialsGridBlock = ({ node }: { node: PageNode }) => {
  const {
    eyebrow = 'GUESTS SAY IT BEST',
    headline = 'Loved by our guests',
    description = 'See why M/Y Whiskey is the top-rated luxury charter experience in the bay.',
    linkText = 'Read All Reviews',
    overallRating = 4.9,
    ratingText = 'Based on 120+ verified charters',
    quotes = [],
    // Styling props
    eyebrowColor = 'var(--color-primary)',
    quoteColor = 'inherit',
    authorColor = 'var(--color-primary)',
    cardBgColor = 'var(--color-surface)',
    textColor = 'inherit',
    descriptionColor = 'var(--color-muted)',
  } = node.props;

  // Star Badge component for overall rating
  const renderOverallStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push(<LucideIcons.Star key={i} size={20} fill={eyebrowColor} color={eyebrowColor} />);
      } else if (rating >= i - 0.5) {
        stars.push(<LucideIcons.StarHalf key={i} size={20} fill={eyebrowColor} color={eyebrowColor} />);
      } else {
        stars.push(<LucideIcons.Star key={i} size={20} fill="transparent" color={eyebrowColor} strokeWidth={1.5} />);
      }
    }
    return stars;
  };

  return (
    <div style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Split Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4rem' }}>
          <div style={{ flex: '1 1 500px' }}>
            {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
            {headline && <h2 style={{ fontSize: '3rem', margin: '0 0 1rem', lineHeight: 1.2, color: textColor }}>{headline}</h2>}
            {description && <p style={{ fontSize: '1.125rem', color: descriptionColor, margin: 0, maxWidth: '600px' }}>{description}</p>}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1.5rem', textAlign: 'right' }}>
            {overallRating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 700, lineHeight: 1, fontFamily: 'serif', color: textColor }}>{Number(overallRating).toFixed(1)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {renderOverallStars(Number(overallRating))}
                  </div>
                  {ratingText && <div style={{ fontSize: '0.875rem', color: descriptionColor, fontWeight: 500 }}>{ratingText}</div>}
                </div>
              </div>
            )}
            {linkText && (
              <SmartLink href={node.props.linkUrl || '#'} target={node.props.linkTarget} style={{ textDecoration: 'none' }}>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: eyebrowColor, fontSize: '1rem', fontWeight: 600, padding: 0, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {linkText}
                  <LucideIcons.ArrowRight size={18} />
                </button>
              </SmartLink>
            )}
          </div>
        </div>
        
        <SwipeScrollContainer
          active={node.props.mobileLayout === 'swipe'}
          gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
          gap="2rem"
          arrowColor={eyebrowColor}
        >
          {quotes.map((q: any, i: number) => {
            const numStars = typeof q.stars === 'number' ? q.stars : 5;
            
            return (
              <div key={i} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                background: cardBgColor, 
                borderRadius: 'var(--radius-lg)', 
                padding: '2.5rem', 
                boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)',
                border: '1px solid var(--color-border)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Decorative watermark */}
                <div style={{ position: 'absolute', top: '-1rem', right: '1rem', color: eyebrowColor, fontSize: '10rem', lineHeight: 1, opacity: 0.08, fontFamily: 'serif', userSelect: 'none' }}>&ldquo;</div>
                
                {/* Stars */}
                <div style={{ display: 'flex', gap: '0.25rem', color: eyebrowColor, marginBottom: '1.5rem', zIndex: 1 }}>
                  {Array.from({ length: 5 }).map((_, starIdx) => (
                    <LucideIcons.Star key={starIdx} size={16} fill={starIdx < numStars ? 'currentColor' : 'transparent'} strokeWidth={starIdx < numStars ? 0 : 1.5} />
                  ))}
                </div>
                
                {/* Quote Text */}
                <p style={{ margin: '0 0 2.5rem', fontSize: '1.05rem', lineHeight: 1.7, color: quoteColor, flex: 1, fontFamily: 'serif', fontStyle: 'italic', zIndex: 1 }}>{q.text}</p>
                
                {/* Author Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 1, marginTop: 'auto' }}>
                  {q.avatar ? (
                    <img src={q.avatar} alt={q.author} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `1px solid rgba(255,255,255,0.2)`, padding: '2px' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(var(--color-primary-rgb), 0.1)', color: eyebrowColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.5rem', border: `1px solid rgba(255,255,255,0.2)` }}>
                      {q.author ? q.author.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ color: authorColor, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{q.author}</div>
                    {q.subtitle && <div style={{ color: 'var(--color-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-sans)' }}>{q.subtitle}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </SwipeScrollContainer>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const CTABlock = ({ node }: { node: PageNode }) => {
  const {
    headline = 'Your next favorite day is waiting.',
    subheadline = 'Let\'s plan your private coastal adventure.',
    buttonText = 'Book Your Charter',
    bgImage = '',
    overlayOpacity = 0.5,
    // New styling props
    headlineColor = 'inherit',
    subheadlineColor = '#e0e0e0',
    buttonBgColor = 'var(--color-primary)',
    buttonTextColor = 'white',
    headlineFontSize = '2.5rem',
    subheadlineFontSize = '1.1rem',
  } = node.props;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6rem 2rem',
      textAlign: 'center',
      backgroundImage: bgImage ? `url(${bgImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'white',
      ...node.props.style
    }}>
      {bgImage && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(0,0,0,${overlayOpacity})`,
          zIndex: 1,
          pointerEvents: 'none'
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
        {headline && <h2 style={{ fontSize: headlineFontSize, marginBottom: '1rem', fontWeight: 400, color: headlineColor, fontFamily: 'var(--font-heading)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
        {subheadline && <p style={{ fontSize: subheadlineFontSize, color: subheadlineColor, marginBottom: '2.5rem', fontFamily: 'var(--font-sans)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{subheadline}</ReactMarkdown></p>}
        {buttonText && (
          <SmartLink href={node.props.buttonLink || '#'} target={node.props.buttonTarget} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.875rem 2rem', background: buttonBgColor, color: buttonTextColor, border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)' }}>
              {buttonText}
            </button>
          </SmartLink>
        )}
      </div>
    </div>
  );
};


// --------------------------------------------------------------------------------------------------
export const ComparisonTableBlock = ({ node }: { node: PageNode }) => {
  const {
    title = 'Compare Experiences',
    subheadline = '',
    description = '',
    items = [],
    rows = []
  } = node.props;

  const titleColor = node.props.titleColor || 'var(--color-primary)';
  const titleFontSize = node.props.titleFontSize || 'clamp(2rem, 5vw, 3.5rem)';
  const subheadlineColor = node.props.subheadlineColor || 'var(--color-foreground)';
  const subheadlineFontSize = node.props.subheadlineFontSize || 'clamp(1rem, 2vw, 1.2rem)';
  const descriptionColor = node.props.descriptionColor || 'var(--color-muted)';
  const featureTextColor = node.props.featureTextColor || 'var(--color-foreground)';
  const cellTextColor = node.props.cellTextColor || 'var(--color-muted)';

  const getComplianceColor = (iconName: string) => {
    switch (iconName) {
      case 'BadgeCheck': return '#E5A93C'; // Bright Gold for Core Advantage
      case 'CircleCheck': return 'var(--color-accent)'; // Sage Green for Fully Supported
      case 'CircleDot': return 'var(--color-primary)'; // Bronze for Partially Supported
      case 'CirclePlus': return 'var(--color-muted)'; // Light Gold for Optional
      case 'CloudSun': return '#7895A2'; // Slate Blue for Weather Dependent
      case 'CircleMinus': return '#C47451'; // Rust for Limited Support
      case 'CircleX': return '#9E4747'; // Deep Red for Not Supported
      default: return 'var(--color-primary)';
    }
  };

  return (
    <div style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px', margin: '0 auto 4rem auto' }}>
          {title && <h2 style={{ fontSize: titleFontSize, color: titleColor, marginBottom: '1rem', fontFamily: 'var(--font-heading)', fontWeight: 400 }}>{title}</h2>}
          {subheadline && <p style={{ fontSize: subheadlineFontSize, color: subheadlineColor, marginBottom: description ? '1.5rem' : '0', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subheadline}</p>}
          {description && <p style={{ fontSize: '1rem', color: descriptionColor, lineHeight: 1.6 }}>{description}</p>}
        </div>

        <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
          <div style={{ minWidth: '600px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${items.length}, 1fr)`, gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, color: cellTextColor, textTransform: 'uppercase', fontSize: '0.875rem' }}>Feature</div>
              {items.map((item: any, i: number) => (
                <div key={i} style={{ fontWeight: 600, fontSize: '1.25rem', fontFamily: 'var(--font-heading)', color: featureTextColor }}>{item.name}</div>
              ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {rows.map((row: any, rIndex: number) => (
                <div key={rIndex} style={{ display: 'grid', gridTemplateColumns: `minmax(200px, 1.5fr) repeat(${items.length}, 1fr)`, gap: '1rem', padding: '1.5rem 0', borderBottom: rIndex < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', color: featureTextColor }}>
                    {row.featureIcon && (LucideIcons as any)[row.featureIcon] && React.createElement((LucideIcons as any)[row.featureIcon], { size: 32, color: 'var(--color-primary)', style: { flexShrink: 0 } })}
                    {row.feature}
                  </div>
                  {items.map((item: any, i: number) => {
                    const cell = row.values?.[i] || { text: '', icon: '' };
                    const IconComp = cell.icon ? (LucideIcons as any)[cell.icon] : null;
                    const iconColor = cell.icon ? getComplianceColor(cell.icon) : 'var(--color-primary)';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', color: cellTextColor }}>
                        {item.showIcon && IconComp && <IconComp size={40} color={iconColor} style={{ flexShrink: 0, marginTop: '0.1rem' }} />}
                        {item.showText && <span style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>{cell.text}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {node.props.showLegend && (
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--color-border)', color: featureTextColor }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)' }}>Compliance Legend</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
              
              {/* Column 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.BadgeCheck size={32} color={getComplianceColor('BadgeCheck')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Strongly supported / core advantage</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Supported and a clear Whiskey advantage.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CircleCheck size={32} color={getComplianceColor('CircleCheck')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Fully supported</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Feature/activity is supported.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CircleDot size={32} color={getComplianceColor('CircleDot')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Partially supported</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Possible, but basic or less complete.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CircleMinus size={32} color={getComplianceColor('CircleMinus')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Limited support</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Constrained, basic, or not ideal.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CircleX size={32} color={getComplianceColor('CircleX')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Not supported</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Not available or not suitable.</span>
                  </div>
                </div>
              </div>

              {/* Column 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CloudSun size={32} color={getComplianceColor('CloudSun')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Weather/conditions dependent</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>Possible when conditions allow.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <LucideIcons.CirclePlus size={32} color={getComplianceColor('CirclePlus')} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '0.15rem', color: featureTextColor, fontSize: '0.95rem' }}>Optional/add-on or varies</strong>
                    <span style={{ fontSize: '0.8rem', color: cellTextColor, lineHeight: 1.4 }}>May vary by rental/provider or package.</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const ContentGridBlock = ({ node }: { node: PageNode }) => {
  const {
    contentType = 'adventure',
    eyebrow = '',
    headline = '',
    limit = 6,
    columns = 3,
    // Styling props
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    cardBgColor = '#192D3B',
    cardTextColor = 'var(--color-foreground)',
    cardBorderRadius = '4px',
    headlineFontSize = '2.5rem',
  } = node.props;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [configs, setConfigs] = useState<ContentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    
    Promise.all([
      getContentItems(contentType),
      getContentTypeConfigs()
    ]).then(([fetchedItems, fetchedConfigs]) => {
      if (!active) return;
      // Filter only published items
      const published = fetchedItems.filter(item => item.status === 'published');
      setItems(published.slice(0, limit));
      setConfigs(fetchedConfigs);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching content grid items:', err);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [contentType, limit]);

  // Find the slug prefix for our link
  const currentConfig = configs.find(c => c.id === contentType);
  const prefix = currentConfig?.slugPrefix || (contentType === 'adventure' ? 'experiences' : contentType === 'asset' ? 'fleet' : 'crew');

  // Columns layout computation
  const gridTemplateColumns = `repeat(auto-fit, minmax(${columns === 1 ? '100%' : columns === 2 ? '450px' : columns === 4 ? '240px' : '300px'}, 1fr))`;

  const renderSpecs = (item: ContentItem) => {
    switch (contentType) {
      case 'adventure': {
        const price = item.basePrice ? `From $${item.basePrice.toLocaleString()}` : '';
        const duration = item.duration ? `${item.duration}` : '';
        const maxGuests = item.maxGuests ? `Up to ${item.maxGuests} guests` : '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {duration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Clock size={14} color={eyebrowColor} />
                <span>{duration}</span>
              </div>
            )}
            {maxGuests && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Users size={14} color={eyebrowColor} />
                <span>{maxGuests}</span>
              </div>
            )}
            {price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                <LucideIcons.DollarSign size={14} color="var(--color-primary)" />
                <span>{price}</span>
              </div>
            )}
          </div>
        );
      }
      case 'asset': {
        const category = item.category ? `${item.category.charAt(0).toUpperCase() + item.category.slice(1)}` : '';
        const specs = [];
        if (item.make) specs.push(item.make);
        if (item.model) specs.push(item.model);
        const specStr = specs.join(' ');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Info size={14} color={eyebrowColor} />
                <span>{category}</span>
              </div>
            )}
            {specStr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Anchor size={14} color={eyebrowColor} />
                <span>{specStr}</span>
              </div>
            )}
          </div>
        );
      }
      case 'staff': {
        const role = item.role ? `${item.role}` : '';
        const certs = Array.isArray(item.certifications) && item.certifications.length > 0
          ? item.certifications.slice(0, 2).join(', ')
          : '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {role && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Briefcase size={14} color={eyebrowColor} />
                <span>{role}</span>
              </div>
            )}
            {certs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Award size={14} color={eyebrowColor} />
                <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{certs}</span>
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (contentType) {
      case 'adventure': return 'Explore Experience';
      case 'asset': return 'View Details';
      case 'staff': return 'Meet Member';
      default: return 'Learn More';
    }
  };

  return (
    <section style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header section */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
          {headline && <h2 style={{ color: headlineColor, fontSize: headlineFontSize, fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
        </div>

        {/* Loading skeleton */}
        {loading ? (
          <SwipeScrollContainer
            active={node.props.mobileLayout === 'swipe'}
            gridTemplateColumns={gridTemplateColumns}
            gap="2rem"
            arrowColor={eyebrowColor}
          >
            {[1, 2, 3].slice(0, columns).map((idx) => (
              <div key={idx} style={{ background: cardBgColor, borderRadius: cardBorderRadius, border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px', opacity: 0.6 }}>
                <div style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: cardBorderRadius }} />
                <div style={{ width: '40%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                <div style={{ width: '80%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                <div style={{ width: '100%', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: 'auto' }} />
              </div>
            ))}
          </SwipeScrollContainer>
        ) : items.length === 0 ? (
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--color-border)', borderRadius: '8px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <LucideIcons.AlertCircle size={32} color="var(--color-primary)" />
            <span>No published {contentType} items found.</span>
          </div>
        ) : (
          <SwipeScrollContainer
            active={node.props.mobileLayout === 'swipe'}
            gridTemplateColumns={gridTemplateColumns}
            gap="2rem"
            arrowColor={eyebrowColor}
          >
            {items.map((item) => {
              const isHovered = hoveredItemId === item.id;
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    background: cardBgColor,
                    borderRadius: cardBorderRadius,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(185, 120, 59, 0.15)' : '0 4px 20px rgba(0,0,0,0.25)',
                    borderColor: isHovered ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Card Image */}
                  <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
                    {item.heroImage ? (
                      <img
                        src={item.heroImage}
                        alt={item.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                        }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LucideIcons.Anchor size={40} color="var(--color-primary)" style={{ opacity: 0.3 }} />
                      </div>
                    )}
                    {/* Location Tag */}
                    {item.location && (
                      <div style={{
                        position: 'absolute',
                        bottom: '1rem',
                        left: '1rem',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.35rem 0.65rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: 'var(--color-foreground)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <LucideIcons.MapPin size={12} color="var(--color-primary)" />
                        <span style={{ fontFamily: 'var(--font-sans)' }}>{item.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Item title */}
                    <h3 style={{ margin: 0, fontSize: '1.4rem', color: cardTextColor, fontFamily: 'var(--font-heading)', fontWeight: 600, lineHeight: 1.25 }}>
                      {item.title}
                    </h3>
                    
                    {/* Short description */}
                    {item.shortDescription && (
                      <p style={{ color: 'rgba(244, 241, 234, 0.7)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0.75rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.7rem', fontFamily: 'var(--font-sans)' }}>
                        {item.shortDescription}
                      </p>
                    )}

                    {/* Specs / Meta info rendering */}
                    {renderSpecs(item)}

                    {/* Action link */}
                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                      <SmartLink
                        href={`/${prefix}/${item.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: isHovered ? 'var(--color-foreground)' : 'var(--color-primary)',
                          textDecoration: 'none',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          fontFamily: 'var(--font-sans)',
                          transition: 'color 0.25s ease'
                        }}
                      >
                        <span>{getButtonText()}</span>
                        <LucideIcons.ArrowRight size={14} style={{ transition: 'transform 0.25s ease', transform: isHovered ? 'translateX(4px)' : 'none' }} />
                      </SmartLink>
                    </div>
                  </div>
                </div>
              );
            })}
          </SwipeScrollContainer>
        )}
      </div>
    </section>
  );
};


// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const DynamicCardBlock = ({ node, preFetchedItems }: { node: PageNode; preFetchedItems?: ContentItem[] }) => {
  const {
    contentType = 'adventure',
    filterSubtype = 'all',
    eyebrow = '',
    headline = '',
    limit = 6,
    columns = 3,
    showImage = true,
    showTitle = true,
    showDescription = true,
    showLocation = true,
    showDuration = true,
    showPrice = true,
    showRating = true,
    showCerts = true,
    showButton = true,
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    cardBgColor = '#192D3B',
    cardTextColor = 'var(--color-foreground)',
    cardBorderRadius = '4px',
    headlineFontSize = '2.5rem',
  } = node.props;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [configs, setConfigs] = useState<ContentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    if (preFetchedItems) {
      let filtered = preFetchedItems.filter(item => item.status === 'published');
      
      // Filter by connected item slug if specified
      if (node.props.filterByItemSlug) {
        const slug = node.props.filterByItemSlug;
        filtered = filtered.filter(adv => 
          (Array.isArray(adv.linkedAssets) && adv.linkedAssets.includes(slug)) ||
          (Array.isArray(adv.linkedStaff) && adv.linkedStaff.includes(slug)) ||
          (Array.isArray(adv.linkedLocations) && adv.linkedLocations.includes(slug))
        );
      }

      setItems(filtered.slice(0, limit));
      setLoading(false);

      // Fetch configs on mount for correct slugPrefix/prefix routing
      getContentTypeConfigs().then(fetchedConfigs => {
        if (active) setConfigs(fetchedConfigs);
      }).catch(err => console.error('Error fetching dynamic card configs:', err));

      return () => { active = false; };
    }

    Promise.all([
      getContentItems(contentType),
      getContentTypeConfigs()
    ]).then(([fetchedItems, fetchedConfigs]) => {
      if (!active) return;
      
      let filtered = fetchedItems.filter(item => item.status === 'published');
      
      // Apply subtype filtering
      if (contentType === 'asset' && filterSubtype !== 'all') {
        filtered = filtered.filter(item => {
          if (filterSubtype === 'vessel') return item.isVessel === true;
          if (filterSubtype === 'gear') return item.isVessel !== true;
          return true;
        });
      } else if (contentType === 'staff' && filterSubtype !== 'all') {
        filtered = filtered.filter(item => {
          if (filterSubtype === 'captain') return item.isCaptain === true;
          if (filterSubtype === 'crew') return item.isCaptain !== true;
          return true;
        });
      }

      // Filter by connected item slug if specified
      if (node.props.filterByItemSlug) {
        const slug = node.props.filterByItemSlug;
        filtered = filtered.filter(adv => 
          (Array.isArray(adv.linkedAssets) && adv.linkedAssets.includes(slug)) ||
          (Array.isArray(adv.linkedStaff) && adv.linkedStaff.includes(slug)) ||
          (Array.isArray(adv.linkedLocations) && adv.linkedLocations.includes(slug))
        );
      }

      setItems(filtered.slice(0, limit));
      setConfigs(fetchedConfigs);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching dynamic cards:', err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [contentType, filterSubtype, limit, preFetchedItems, node.props.filterByItemSlug]);

  const currentConfig = configs.find(c => c.id === contentType);
  const prefix = currentConfig?.slugPrefix || (contentType === 'adventure' ? 'experiences' : contentType === 'asset' ? 'fleet' : contentType === 'location' ? 'locations' : 'crew');
  const gridTemplateColumns = `repeat(auto-fit, minmax(${columns === 1 ? '100%' : columns === 2 ? '450px' : columns === 4 ? '240px' : '300px'}, 1fr))`;

  const getButtonText = () => {
    switch (contentType) {
      case 'adventure': return 'Explore Experience';
      case 'asset': return 'View Details';
      case 'staff': return 'Meet Member';
      case 'location': return 'Explore Destination';
      default: return 'Learn More';
    }
  };

  const renderSpecs = (item: ContentItem) => {
    switch (contentType) {
      case 'adventure': {
        const price = item.basePrice ? `From $${item.basePrice.toLocaleString()}` : '';
        const duration = item.duration ? `${item.duration}` : '';
        const maxGuests = item.maxGuests ? `Up to ${item.maxGuests} guests` : '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {showDuration && duration && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Clock size={14} color={eyebrowColor} />
                <span>{duration}</span>
              </div>
            )}
            {maxGuests && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Users size={14} color={eyebrowColor} />
                <span>{maxGuests}</span>
              </div>
            )}
            {showPrice && price && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                <LucideIcons.DollarSign size={14} color="var(--color-primary)" />
                <span>{price}</span>
              </div>
            )}
          </div>
        );
      }
      case 'asset': {
        const category = item.category ? `${item.category.charAt(0).toUpperCase() + item.category.slice(1)}` : '';
        const specs = [];
        if (item.make) specs.push(item.make);
        if (item.model) specs.push(item.model);
        const specStr = specs.join(' ');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Info size={14} color={eyebrowColor} />
                <span>{category}</span>
              </div>
            )}
            {specStr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Anchor size={14} color={eyebrowColor} />
                <span>{specStr}</span>
              </div>
            )}
            {showPrice && (item.dailyRate > 0 || item.hourlyRate > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                <LucideIcons.DollarSign size={14} color="var(--color-primary)" />
                <span>
                  {item.dailyRate > 0 ? `$${item.dailyRate.toLocaleString()}/day` : `$${item.hourlyRate.toLocaleString()}/hr`}
                </span>
              </div>
            )}
          </div>
        );
      }
      case 'staff': {
        const role = item.role ? `${item.role}` : '';
        const rating = typeof item.rating === 'number' ? item.rating : 5;
        const certs = Array.isArray(item.certifications) && item.certifications.length > 0
          ? item.certifications.slice(0, 2).join(', ')
          : '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {role && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Briefcase size={14} color={eyebrowColor} />
                <span>{role}</span>
              </div>
            )}
            {showRating && rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-primary)' }}>
                {Array.from({ length: 5 }).map((_, starIdx) => (
                  <LucideIcons.Star 
                    key={starIdx} 
                    size={14} 
                    fill={starIdx < rating ? 'currentColor' : 'transparent'} 
                    strokeWidth={starIdx < rating ? 0 : 1.5} 
                  />
                ))}
                <span style={{ marginLeft: '0.25rem', color: '#b0bec5', fontSize: '0.8rem' }}>({rating.toFixed(1)})</span>
              </div>
            )}
            {showCerts && certs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Award size={14} color={eyebrowColor} />
                <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{certs}</span>
              </div>
            )}
          </div>
        );
      }
      case 'location': {
        const anchor = item.anchorStatus || '';
        const bestTime = item.bestTime || '';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '1rem', fontSize: '0.875rem', color: '#b0bec5', fontFamily: 'var(--font-sans)' }}>
            {anchor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Anchor size={14} color={eyebrowColor} />
                <span>{anchor}</span>
              </div>
            )}
            {bestTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LucideIcons.Clock size={14} color={eyebrowColor} />
                <span>Best: {bestTime}</span>
              </div>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <section style={{ width: '100%', padding: '6rem 2rem', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {(eyebrow || headline) && (
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
            {headline && <h2 style={{ color: headlineColor, fontSize: headlineFontSize, fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
          </div>
        )}

        {loading ? (
          <SwipeScrollContainer
            active={node.props.mobileLayout === 'swipe'}
            gridTemplateColumns={gridTemplateColumns}
            gap="2rem"
            arrowColor={eyebrowColor}
          >
            {[1, 2, 3].slice(0, columns).map((idx) => (
              <div key={idx} style={{ background: cardBgColor, borderRadius: cardBorderRadius, border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '350px', opacity: 0.6 }}>
                <div style={{ width: '100%', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: cardBorderRadius }} />
                <div style={{ width: '40%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                <div style={{ width: '80%', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                <div style={{ width: '100%', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', marginTop: 'auto' }} />
              </div>
            ))}
          </SwipeScrollContainer>
        ) : items.length === 0 ? (
          <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', textAlign: 'center', padding: '4rem 2rem', border: '1px dashed var(--color-border)', borderRadius: '8px', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <LucideIcons.AlertCircle size={32} color="var(--color-primary)" />
            <span>No published {contentType} items matching filters.</span>
          </div>
        ) : (
          <SwipeScrollContainer
            active={node.props.mobileLayout === 'swipe'}
            gridTemplateColumns={gridTemplateColumns}
            gap="2rem"
            arrowColor={eyebrowColor}
          >
            {items.map((item) => {
              const isHovered = hoveredItemId === item.id;
              
              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    background: cardBgColor,
                    borderRadius: cardBorderRadius,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
                    boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(185, 120, 59, 0.15)' : '0 4px 20px rgba(0,0,0,0.25)',
                    borderColor: isHovered ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Card Image */}
                  {showImage && (
                    <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
                      {item.heroImage ? (
                        <img
                          src={item.heroImage}
                          alt={item.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <LucideIcons.Anchor size={40} color="var(--color-primary)" style={{ opacity: 0.3 }} />
                        </div>
                      )}
                      
                      {/* Base Port / Location tag overlay */}
                      {showLocation && item.location && (
                        <div style={{
                          position: 'absolute',
                          bottom: '1rem',
                          left: '1rem',
                          background: 'rgba(15, 23, 42, 0.75)',
                          backdropFilter: 'blur(8px)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          color: 'var(--color-foreground)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          <LucideIcons.MapPin size={12} color="var(--color-primary)" />
                          <span style={{ fontFamily: 'var(--font-sans)' }}>{item.location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card Content */}
                  <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Item Title */}
                    {showTitle && (
                      <h3 style={{ margin: 0, fontSize: '1.4rem', color: cardTextColor, fontFamily: 'var(--font-heading)', fontWeight: 600, lineHeight: 1.25 }}>
                        {item.title}
                      </h3>
                    )}

                    {/* Short Description */}
                    {showDescription && item.shortDescription && (
                      <p style={{ color: 'rgba(244, 241, 234, 0.7)', fontSize: '0.9rem', lineHeight: 1.5, margin: '0.75rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.7rem', fontFamily: 'var(--font-sans)' }}>
                        {item.shortDescription}
                      </p>
                    )}

                    {/* Meta Specs */}
                    {renderSpecs(item)}

                    {/* Action link button */}
                    {showButton && (
                      <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                        <SmartLink
                          href={`/${prefix}/${item.slug}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: isHovered ? 'var(--color-foreground)' : 'var(--color-primary)',
                            textDecoration: 'none',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            fontFamily: 'var(--font-sans)',
                            transition: 'color 0.25s ease'
                          }}
                        >
                          <span>{getButtonText()}</span>
                          <LucideIcons.ArrowRight size={14} style={{ transition: 'transform 0.25s ease', transform: isHovered ? 'translateX(4px)' : 'none' }} />
                        </SmartLink>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </SwipeScrollContainer>
        )}
      </div>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const DynamicCarousel = ({ node }: { node: PageNode }) => {
  const {
    contentType = 'adventure',
    filterSubtype = 'all',
    eyebrow = '',
    headline = '',
    limit = 10,
    autoScroll = false,
    showImage = true,
    showTitle = true,
    showDescription = true,
    showPrice = true,
    showButton = true,
    eyebrowColor = 'var(--color-primary)',
    headlineColor = 'var(--color-foreground)',
    cardBgColor = '#192D3B',
    cardTextColor = 'var(--color-foreground)',
    cardBorderRadius = '4px',
    headlineFontSize = '2.5rem',
  } = node.props;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [configs, setConfigs] = useState<ContentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [scrollIndex, setScrollIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getContentItems(contentType),
      getContentTypeConfigs()
    ]).then(([fetchedItems, fetchedConfigs]) => {
      if (!active) return;
      
      let filtered = fetchedItems.filter(item => item.status === 'published');
      
      if (contentType === 'asset' && filterSubtype !== 'all') {
        filtered = filtered.filter(item => {
          if (filterSubtype === 'vessel') return item.isVessel === true;
          if (filterSubtype === 'gear') return item.isVessel !== true;
          return true;
        });
      } else if (contentType === 'staff' && filterSubtype !== 'all') {
        filtered = filtered.filter(item => {
          if (filterSubtype === 'captain') return item.isCaptain === true;
          if (filterSubtype === 'crew') return item.isCaptain !== true;
          return true;
        });
      }

      setItems(filtered.slice(0, limit));
      setConfigs(fetchedConfigs);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching carousel items:', err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [contentType, filterSubtype, limit]);

  // Autoplay functionality
  useEffect(() => {
    if (!autoScroll || items.length <= 1) return;
    
    const interval = setInterval(() => {
      setScrollIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [autoScroll, items]);

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cards = container.children;
    if (cards.length > index && cards[index]) {
      const card = cards[index] as HTMLElement;
      container.scrollTo({
        left: card.offsetLeft - 32,
        behavior: 'smooth'
      });
    }
  };

  const handleNext = () => {
    if (items.length <= 1) return;
    const next = (scrollIndex + 1) % items.length;
    setScrollIndex(next);
    scrollToIndex(next);
  };

  const handlePrev = () => {
    if (items.length <= 1) return;
    const prev = (scrollIndex - 1 + items.length) % items.length;
    setScrollIndex(prev);
    scrollToIndex(prev);
  };

  const currentConfig = configs.find(c => c.id === contentType);
  const prefix = currentConfig?.slugPrefix || (contentType === 'adventure' ? 'experiences' : contentType === 'asset' ? 'fleet' : 'crew');

  return (
    <section style={{ width: '100%', padding: '6rem 0', background: 'var(--color-surface)', ...node.props.style }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            {eyebrow && <div style={{ color: eyebrowColor, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>{eyebrow}</div>}
            {headline && <h2 style={{ color: headlineColor, fontSize: headlineFontSize, fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{headline}</ReactMarkdown></h2>}
          </div>
          
          {/* Controls */}
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={handlePrev}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <LucideIcons.ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNext}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                <LucideIcons.ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slider Container */}
      <div 
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: '2rem',
          overflowX: 'auto',
          padding: '1rem 32px 3rem 32px',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          div::-webkit-scrollbar {
            display: none;
          }
        `}} />
        
        {loading ? (
          [1, 2, 3, 4].map(idx => (
            <div key={idx} style={{ flex: '0 0 320px', minWidth: '320px', background: cardBgColor, borderRadius: cardBorderRadius, height: '380px', opacity: 0.6 }} />
          ))
        ) : items.length === 0 ? (
          <div style={{ width: '100%', textAlign: 'center', color: 'var(--color-muted)', padding: '2rem' }}>No items found.</div>
        ) : (
          items.map((item, idx) => {
            const isHovered = hoveredItemId === item.id;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                style={{
                  flex: '0 0 340px',
                  minWidth: '340px',
                  background: cardBgColor,
                  borderRadius: cardBorderRadius,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid rgba(255,255,255,0.05)',
                  scrollSnapAlign: 'start',
                  transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: isHovered ? '0 15px 30px rgba(0,0,0,0.5)' : '0 4px 15px rgba(0,0,0,0.2)',
                  borderColor: isHovered ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'
                }}
              >
                {/* Hero Image */}
                {showImage && (
                  <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
                    {item.heroImage ? (
                      <img 
                        src={item.heroImage} 
                        alt={item.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)', transform: isHovered ? 'scale(1.05)' : 'scale(1)' }} 
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LucideIcons.Anchor size={40} color="var(--color-primary)" style={{ opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {showTitle && (
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: cardTextColor, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                      {item.title}
                    </h3>
                  )}

                  {showDescription && item.shortDescription && (
                    <p style={{ color: 'rgba(244, 241, 234, 0.7)', fontSize: '0.85rem', lineHeight: 1.4, margin: '0.5rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', fontFamily: 'var(--font-sans)' }}>
                      {item.shortDescription}
                    </p>
                  )}

                  {/* Pricing */}
                  {showPrice && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '1rem' }}>
                      <LucideIcons.DollarSign size={14} color="var(--color-primary)" />
                      <span>
                        {contentType === 'adventure' && item.basePrice > 0 && `From $${item.basePrice.toLocaleString()}`}
                        {contentType === 'asset' && item.dailyRate > 0 && `$${item.dailyRate.toLocaleString()}/day`}
                        {contentType === 'asset' && item.hourlyRate > 0 && !item.dailyRate && `$${item.hourlyRate.toLocaleString()}/hr`}
                      </span>
                    </div>
                  )}

                  {/* Action Link */}
                  {showButton && (
                    <div style={{ marginTop: 'auto', paddingTop: '1.25rem' }}>
                      <SmartLink
                        href={`/${prefix}/${item.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontFamily: 'var(--font-sans)'
                        }}
                      >
                        <span>Explore Details</span>
                        <LucideIcons.ArrowRight size={12} />
                      </SmartLink>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => { setScrollIndex(idx); scrollToIndex(idx); }}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: scrollIndex === idx ? 'var(--color-primary)' : 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'background 0.3s'
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const BookingWidget = ({ node }: { node: PageNode }) => {
  const {
    headline = 'Ready for Adventure?',
    subheadline = 'Book a bespoke luxury yacht charter tailored exactly to your desires.',
    layout = 'card',
    showAdventuresList = true
  } = node.props;

  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('2');
  const [adventure, setAdventure] = useState('');
  const [adventures, setAdventures] = useState<ContentItem[]>([]);

  useEffect(() => {
    let active = true;
    getContentItems('adventure').then(items => {
      if (!active) return;
      setAdventures(items.filter(i => i.status === 'published'));
      if (items.length > 0) {
        setAdventure(items[0].slug);
      }
    });
    return () => { active = false; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (date) query.set('date', date);
    if (guests) query.set('guests', guests);
    if (adventure) query.set('adventure', adventure);
    
    window.location.href = `/booking?${query.toString()}`;
  };

  const formContent = (
    <form 
      onSubmit={handleSearch}
      style={{
        display: 'flex',
        flexDirection: layout === 'bar' ? 'row' : 'column',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'stretch',
        width: '100%'
      }}
    >
      {/* Date */}
      <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Charter Date</label>
        <div style={{ position: 'relative' }}>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'white',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem'
            }}
          />
        </div>
      </div>

      {/* Guests */}
      <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guests</label>
        <select 
          value={guests} 
          onChange={e => setGuests(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: 'white',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem'
          }}
        >
          {Array.from({ length: 10 }).map((_, idx) => (
            <option key={idx + 1} value={idx + 1} style={{ background: '#121416' }}>{idx + 1} {idx === 0 ? 'Guest' : 'Guests'}</option>
          ))}
        </select>
      </div>

      {/* Experience Select */}
      {showAdventuresList && adventures.length > 0 && (
        <div style={{ flex: '1 2 250px', display: 'flex', flexDirection: 'column', gap: '0.35rem', textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adventure</label>
          <select 
            value={adventure} 
            onChange={e => setAdventure(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'white',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.9rem'
            }}
          >
            {adventures.map(adv => (
              <option key={adv.slug} value={adv.slug} style={{ background: '#121416' }}>{adv.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Submit Button */}
      <div style={{ flex: layout === 'bar' ? '1 1 180px' : 'none', display: 'flex', alignItems: 'flex-end', marginTop: layout === 'bar' ? '0' : '0.5rem' }}>
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            height: '42px',
            background: 'var(--color-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontFamily: 'var(--font-sans)'
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <LucideIcons.CalendarCheck size={16} />
          <span>Check Availability</span>
        </button>
      </div>
    </form>
  );

  if (layout === 'bar') {
    return (
      <div style={{ width: '100%', padding: '3rem 2rem', background: '#1E2124', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', ...node.props.style }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
          {(headline || subheadline) && (
            <div style={{ textAlign: 'left', marginBottom: '0.5rem' }}>
              {headline && <h3 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>{headline}</h3>}
              {subheadline && <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-muted)', fontSize: '0.9rem' }}>{subheadline}</p>}
            </div>
          )}
          {formContent}
        </div>
      </div>
    );
  }

  // Centered Card layout
  return (
    <div style={{ width: '100%', padding: '6rem 2rem', display: 'flex', justifyContent: 'center', ...node.props.style }}>
      <div 
        style={{ 
          maxWidth: '550px', 
          width: '100%', 
          background: '#1E2124', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.06)', 
          padding: '3rem 2.5rem', 
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        <LucideIcons.Anchor size={36} color="var(--color-primary)" style={{ marginBottom: '1.5rem' }} />
        {headline && <h2 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0' }}>{headline}</h2>}
        {subheadline && <p style={{ fontSize: '0.95rem', color: 'var(--color-muted)', margin: '0 0 2rem 0', lineHeight: 1.5 }}>{subheadline}</p>}
        {formContent}
      </div>
    </div>
  );
};


// ──────────────────────────────────────────────────────────────────────────────────────────────────
// FEATURED CMS DETAIL SHOWCASE BLOCK
// ──────────────────────────────────────────────────────────────────────────────────────────────────
export const DynamicDetailBlock = ({ node }: { node: PageNode }) => {
  const {
    contentType = 'adventure',
    itemId = '',
    layout = 'left',
    showImage = true,
    showTitle = true,
    showDescription = true,
    showMetadata = true,
    showButton = true,
    buttonText = 'Discover Details',
    detailBgColor = '#192D3B',
    detailTextColor = 'var(--color-foreground)',
    accentColor = 'var(--color-primary)'
  } = node.props;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }
    setLoading(true);
    getContentItem(itemId).then(fetched => {
      setItem(fetched);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching showcase item:', err);
      setLoading(false);
    });
  }, [itemId]);

  const isEditor = typeof window !== 'undefined' && window.location.pathname.includes('/admin/editor');

  if (!itemId) {
    if (isEditor) {
      return (
        <div style={{
          padding: '4rem 2rem',
          background: '#1E2124',
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: '8px',
          textAlign: 'center',
          color: 'var(--color-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          fontFamily: "'Inter', sans-serif"
        }}>
          <Navigation size={48} color="var(--color-primary)" />
          <div>
            <div style={{ fontWeight: 600, color: 'white', fontSize: '1.1rem' }}>Featured Showcase Block</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Select Content Type and a Specific Showcase Item in the inspector on the right.</div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div style={{
        padding: '6rem 2rem',
        background: detailBgColor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{ width: '100%', maxWidth: '1000px', height: '350px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  if (!item) {
    if (isEditor) {
      return (
        <div style={{ padding: '4rem 2rem', background: '#1E2124', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center', color: '#ef4444' }}>
          Error: Content Item ({itemId}) not found.
        </div>
      );
    }
    return null;
  }

  const price = item.basePrice ? `From $${item.basePrice.toLocaleString()}` : '';
  
  const getUrlPath = (item: ContentItem) => {
    switch (item.contentType) {
      case 'adventure': return `/experiences/${item.slug}`;
      case 'asset': return `/fleet/${item.slug}`;
      case 'staff': return `/crew/${item.slug}`;
      case 'location': return `/locations/${item.slug}`;
      default: return `/${item.slug}`;
    }
  };

  const redirectUrl = getUrlPath(item);

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.4rem 0.8rem',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    color: '#D8C7AF',
    fontSize: '0.8rem',
    fontWeight: 500,
    letterSpacing: '0.02em'
  };

  const renderMetadata = (item: ContentItem) => {
    switch (item.contentType) {
      case 'adventure':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1rem 0' }}>
            {item.location && (
              <span style={badgeStyle}>
                <MapPin size={14} style={{ marginRight: '0.25rem' }} /> {item.location}
              </span>
            )}
            {item.guestDurationMinutes && (
              <span style={badgeStyle}>
                <Clock size={14} style={{ marginRight: '0.25rem' }} /> {Math.round(item.guestDurationMinutes / 60)} Hours
              </span>
            )}
            {item.suitability && (
              <span style={badgeStyle}>
                <Users size={14} style={{ marginRight: '0.25rem' }} /> {item.suitability}
              </span>
            )}
          </div>
        );
      case 'asset':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1rem 0' }}>
            {item.homeLocation && (
              <span style={badgeStyle}>
                <MapPin size={14} style={{ marginRight: '0.25rem' }} /> {item.homeLocation}
              </span>
            )}
            <span style={badgeStyle}>
              <Ship size={14} style={{ marginRight: '0.25rem' }} /> {item.isVessel ? 'Luxury Vessel' : 'Tender / Toy'}
            </span>
            {item.suitability && (
              <span style={badgeStyle}>
                <Users size={14} style={{ marginRight: '0.25rem' }} /> Up to {item.suitability} Guests
              </span>
            )}
          </div>
        );
      case 'staff':
        const rating = typeof item.rating === 'number' ? item.rating : 5;
        const certs = item.certifications || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ffb300' }}>
              {Array.from({ length: 5 }).map((_, starIdx) => (
                <Star 
                  key={starIdx} 
                  size={16} 
                  fill={starIdx < rating ? '#ffb300' : 'transparent'} 
                  strokeWidth={starIdx < rating ? 0 : 1.5} 
                />
              ))}
              <span style={{ marginLeft: '0.5rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
                ({rating.toFixed(1)} Rating)
              </span>
            </div>
            {certs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {certs.map((c: string) => (
                  <span key={c} style={{ ...badgeStyle, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    🏆 {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      case 'location':
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', margin: '1rem 0' }}>
            {item.anchorStatus && (
              <span style={badgeStyle}>
                ⚓ {item.anchorStatus}
              </span>
            )}
            {item.bestTime && (
              <span style={badgeStyle}>
                🌅 Best: {item.bestTime}
              </span>
            )}
            {item.suitability && (
              <span style={badgeStyle}>
                📐 {item.suitability}
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const containerStyle: React.CSSProperties = {
    padding: '6rem 2rem',
    background: detailBgColor,
    color: detailTextColor,
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    fontFamily: "'Inter', sans-serif",
    ...node.props.style
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: '1100px',
    width: '100%',
    display: 'grid',
    gridTemplateColumns: layout === 'card' ? '1fr' : '1fr 1fr',
    gap: '3rem',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '2.5rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.35)'
  };

  const imageContainerStyle: React.CSSProperties = {
    width: '100%',
    height: layout === 'card' ? '450px' : '400px',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    order: layout === 'right' ? 2 : 1
  };

  const contentContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    order: layout === 'right' ? 1 : 2,
    textAlign: layout === 'card' ? 'center' : 'left',
    alignItems: layout === 'card' ? 'center' : 'flex-start'
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        {showImage && item.heroImage && (
          <div style={imageContainerStyle}>
            <img 
              src={item.heroImage} 
              alt={item.title} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
            {price && showMetadata && (
              <div style={{
                position: 'absolute',
                top: '1.25rem',
                left: '1.25rem',
                background: 'rgba(30, 33, 36, 0.85)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${accentColor}`,
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.9rem',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
              }}>
                {price}
              </div>
            )}
          </div>
        )}

        <div style={contentContainerStyle}>
          {item.role && (
            <span style={{ 
              color: accentColor, 
              fontSize: '0.825rem', 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: '0.15em', 
              marginBottom: '0.5rem' 
            }}>
              {item.role}
            </span>
          )}
          
          {showTitle && (
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontFamily: "'Cormorant Garamond', serif", 
              fontWeight: 700, 
              color: 'white', 
              margin: '0 0 1rem 0',
              lineHeight: 1.2
            }}>
              {item.title}
            </h2>
          )}

          {showDescription && (
            <p style={{ 
              fontSize: '1rem', 
              lineHeight: 1.6, 
              color: '#B0BEC5', 
              margin: '0 0 1.5rem 0',
              maxWidth: '600px'
            }}>
              {item.shortDescription}
            </p>
          )}

          {showMetadata && renderMetadata(item)}

          {showButton && (
            <SmartLink 
              href={redirectUrl} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: accentColor,
                color: 'white',
                border: 'none',
                padding: '0.8rem 2rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '1.5rem',
                transition: 'all 0.3s ease',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(185, 120, 59, 0.2)'
              }}
            >
              {buttonText} <LucideIcons.ArrowRight size={16} />
            </SmartLink>
          )}
        </div>
      </div>
    </div>
  );
};





