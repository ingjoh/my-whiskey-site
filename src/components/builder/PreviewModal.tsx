'use client';

import { useState, useEffect } from 'react';
import { useBuilderStore, PageNode } from '@/store/useBuilderStore';
import { X, Monitor, Tablet, Smartphone } from 'lucide-react';
import { SpecsBlock, HeroBlock, DeckPlanBlock, BookingFormBlock } from '@/components/builder/Blocks';
import {
  DividerBlock, IconBlock, VideoBlock, MapBlock, AccordionBlock, AmenitiesBlock,
  PricingBlock, CrewBlock, ItineraryBlock, TestimonialsBlock, VideoHeroBlock, GalleryWithLightbox, HtmlBlock,
  EnhancedHeroBlock, TextMediaBlock, ExperiencesGridBlock, YachtFeatureBlock, TestimonialsGridBlock, CTABlock, ComparisonTableBlock
} from '@/components/builder/NewBlocks';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';

// ─── Renderer ────────────────────────────────────────────────────────────────
function PreviewNodeRenderer({ node, allNodes }: { node: PageNode; allNodes: Record<string, PageNode> }) {
  if (!node) return null;

  let Content: React.ReactNode = null;

  switch (node.type) {
    case 'Section':
      Content = (
        <div style={node.id === 'root' ? { ...node.props.style, padding: 0, gap: 0 } : node.props.style}>
          {node.children?.map(id => (
            <PreviewNodeRenderer key={id} node={allNodes[id]} allNodes={allNodes} />
          ))}
        </div>
      );
      return <>{Content}</>;
    case 'Text':
      Content = <div style={node.props.style}>{node.props.text}</div>;
      break;
    case 'Button':
      Content = (
        <button style={{ ...node.props.style, border: 'none', cursor: 'pointer' }}>
          {node.props.text}
        </button>
      );
      break;
    case 'Image':
      Content = node.props.src
        ? <img src={node.props.src} alt={node.props.alt} style={node.props.style} />
        : <div style={{ ...node.props.style, background: 'var(--color-surface)', border: '2px dashed var(--color-border)' }} />;
      break;
    case 'Specs':      Content = <SpecsBlock node={node} />;           break;
    case 'Hero':       Content = <HeroBlock node={node} />;            break;
    case 'Gallery':    Content = <GalleryWithLightbox node={node} />;  break;
    case 'DeckPlan':   Content = <DeckPlanBlock node={node} />;        break;
    case 'BookingForm':Content = <BookingFormBlock node={node} />;     break;
    case 'Divider':    Content = <DividerBlock node={node} />;         break;
    case 'Icon':       Content = <IconBlock node={node} />;            break;
    case 'Video':      Content = <VideoBlock node={node} />;           break;
    case 'Map':        Content = <MapBlock node={node} />;             break;
    case 'Accordion':  Content = <AccordionBlock node={node} />;       break;
    case 'Amenities':  Content = <AmenitiesBlock node={node} />;       break;
    case 'Pricing':    Content = <PricingBlock node={node} />;         break;
    case 'Crew':       Content = <CrewBlock node={node} />;            break;
    case 'Itinerary':  Content = <ItineraryBlock node={node} />;       break;
    case 'Testimonials':Content = <TestimonialsBlock node={node} />;   break;
    case 'VideoHero':  Content = <VideoHeroBlock node={node} />;       break;
    case 'Html':       Content = <HtmlBlock node={node} />;            break;
    case 'EnhancedHero': Content = <EnhancedHeroBlock node={node} />;      break;
    case 'TextMedia':    Content = <TextMediaBlock node={node} />;         break;
    case 'ExperiencesGrid':Content = <ExperiencesGridBlock node={node} />; break;
    case 'YachtFeature': Content = <YachtFeatureBlock node={node} />;      break;
    case 'TestimonialsGrid':Content = <TestimonialsGridBlock node={node} />;break;
    case 'CTA':          Content = <CTABlock node={node} />;               break;
    default:           return null;
  }

  const isFullWidth = ['Specs','Hero','Gallery','Image','DeckPlan','BookingForm','Video','Map',
    'Accordion','Amenities','Pricing','Crew','Itinerary','Testimonials','VideoHero','Divider','Html',
    'EnhancedHero', 'TextMedia', 'ExperiencesGrid', 'YachtFeature', 'TestimonialsGrid', 'CTA', 'ComparisonTable'
  ].includes(node.type);

  return (
    <div style={{ display: isFullWidth ? 'block' : 'inline-block', width: isFullWidth ? '100%' : 'auto' }}>
      {Content}
    </div>
  );
}

// ─── Viewport Presets ────────────────────────────────────────────────────────
const VIEWPORTS = [
  { id: 'desktop',  label: 'Desktop',  icon: Monitor,    width: '100%' },
  { id: 'tablet',   label: 'Tablet',   icon: Tablet,     width: '768px' },
  { id: 'mobile',   label: 'Mobile',   icon: Smartphone, width: '390px' },
] as const;

type ViewportId = typeof VIEWPORTS[number]['id'];

// ─── Preview Modal ────────────────────────────────────────────────────────────
export function PreviewModal({ onClose }: { onClose: () => void }) {
  const { nodes, theme } = useBuilderStore();
  const [viewport, setViewport] = useState<ViewportId>('desktop');

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const currentViewport = VIEWPORTS.find(v => v.id === viewport)!;
  const rootNode = nodes['root'];

  const themeVars = {
    '--color-background': theme?.backgroundColor || '#1F2326',
    '--color-foreground': theme?.foregroundColor || '#F4F1EA',
    '--color-primary':    theme?.primaryColor    || '#B9783B',
    '--color-surface':    theme?.surfaceColor    || '#1E3A4C',
    '--color-muted':      theme?.mutedColor      || '#D8C7AF',
    '--color-accent':     theme?.accentColor     || '#708C84',
    '--color-border':     'rgba(255, 255, 255, 0.1)',
    '--font-heading':     theme?.typography?.headingFontFamily || "'Cormorant Garamond', serif",
    '--font-sans':        theme?.typography?.bodyFontFamily    || "'Inter', sans-serif",
    '--h1-font-size':     theme?.typography?.h1?.fontSize  || '3.5rem',
    '--h1-font-weight':   theme?.typography?.h1?.fontWeight || '800',
    '--h1-font-size-mobile': theme?.typography?.h1Mobile?.fontSize || theme?.typography?.h1?.fontSize || '2.25rem',
    '--h1-font-weight-mobile': theme?.typography?.h1Mobile?.fontWeight || theme?.typography?.h1?.fontWeight || '800',
    '--h2-font-size':     theme?.typography?.h2?.fontSize  || '2.5rem',
    '--h2-font-weight':   theme?.typography?.h2?.fontWeight || '700',
    '--h2-font-size-mobile': theme?.typography?.h2Mobile?.fontSize || theme?.typography?.h2?.fontSize || '1.75rem',
    '--h2-font-weight-mobile': theme?.typography?.h2Mobile?.fontWeight || theme?.typography?.h2?.fontWeight || '700',
    '--h3-font-size':     theme?.typography?.h3?.fontSize  || '1.5rem',
    '--h3-font-weight':   theme?.typography?.h3?.fontWeight || '600',
    '--h3-font-size-mobile': theme?.typography?.h3Mobile?.fontSize || theme?.typography?.h3?.fontSize || '1.25rem',
    '--h3-font-weight-mobile': theme?.typography?.h3Mobile?.fontWeight || theme?.typography?.h3?.fontWeight || '600',
    '--p-font-size':      theme?.typography?.p?.fontSize   || '1rem',
    '--p-font-weight':    theme?.typography?.p?.fontWeight  || '400',
    '--p-font-size-mobile': theme?.typography?.pMobile?.fontSize || '0.925rem',
    '--p-font-weight-mobile': theme?.typography?.pMobile?.fontWeight || theme?.typography?.p?.fontWeight || '400',
    '--p-large-font-size': theme?.typography?.large?.fontSize || '1.2rem',
    '--p-large-font-weight': theme?.typography?.large?.fontWeight || '400',
    '--p-large-font-size-mobile': theme?.typography?.largeMobile?.fontSize || '1.1rem',
    '--p-large-font-weight-mobile': theme?.typography?.largeMobile?.fontWeight || theme?.typography?.large?.fontWeight || '400',
    '--small-font-size':  theme?.typography?.small?.fontSize || '0.825rem',
    '--small-font-weight':theme?.typography?.small?.fontWeight || '400',
    '--small-font-size-mobile': theme?.typography?.smallMobile?.fontSize || '0.775rem',
    '--small-font-weight-mobile': theme?.typography?.smallMobile?.fontWeight || theme?.typography?.small?.fontWeight || '400',
    '--a-font-size':      theme?.typography?.a?.fontSize   || '0.95rem',
    '--a-font-weight':    theme?.typography?.a?.fontWeight  || '600',
    '--a-font-size-mobile': theme?.typography?.aMobile?.fontSize || '0.875rem',
    '--a-font-weight-mobile': theme?.typography?.aMobile?.fontWeight || theme?.typography?.a?.fontWeight || '600',
    '--base-radius':      theme?.styles?.radius  || '0.5rem',
    '--section-padding':  theme?.styles?.padding || '4rem 2rem',
  } as React.CSSProperties;

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* ── Preview Toolbar ── */}
      <div style={{
        height: '56px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        {/* Left – label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Live Preview
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            — reflects current unsaved state
          </span>
        </div>

        {/* Center – viewport switcher */}
        <div style={{
          display: 'flex', gap: '0.25rem',
          background: 'var(--color-background)',
          padding: '0.25rem',
          borderRadius: '9999px',
          border: '1px solid var(--color-border)',
        }}>
          {VIEWPORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewport(id)}
              title={label}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '9999px',
                border: 'none',
                background: viewport === id ? 'var(--color-primary)' : 'transparent',
                color: viewport === id ? 'white' : 'var(--color-muted)',
                fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Right – close */}
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-foreground)',
            fontSize: '0.875rem', fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--color-background)'; e.currentTarget.style.borderColor = 'var(--color-muted)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
        >
          <X size={16} /> Close Preview
        </button>
      </div>

      {/* ── Viewport Frame ── */}
      <div 
        id="preview-scroll-container"
        style={{
        flex: 1, minHeight: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: viewport === 'desktop' ? '0' : '1.5rem 1rem 1rem',
        overflowY: 'auto',
        background: viewport === 'desktop'
          ? (theme?.backgroundColor || '#1F2326')
          : 'radial-gradient(ellipse at center, #2a2a2a 0%, #111 100%)',
      }}>
        <div style={{
          position: 'relative',
          transform: 'translate3d(0,0,0)',
          width: currentViewport.width,
          maxWidth: '100%',
          minHeight: '100%',
          background: theme?.backgroundColor || '#1F2326',
          // Non-desktop: show a device shadow frame
          ...(viewport !== 'desktop' ? {
            borderRadius: '16px',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            minHeight: '700px',
          } : {}),
          ...themeVars,
          fontFamily: 'var(--font-sans)',
          color: 'var(--color-foreground)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        } as React.CSSProperties}>

          {/* Font loaders */}
          {theme?.typography?.headingFontFamily && theme.typography.headingFontFamily.split(',')[0].replace(/['\"]/g,'').trim() !== 'Inter' && (
            <link href={`https://fonts.googleapis.com/css2?family=${theme.typography.headingFontFamily.split(',')[0].replace(/['\"]/g,'').trim().replace(/ /g,'+')}:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap`} rel="stylesheet" />
          )}

          {/* Header preview */}
          <PublicNavigation theme={theme} isEditorMode={true} />

          {/* Page content */}
          {rootNode && <PreviewNodeRenderer node={rootNode} allNodes={nodes} />}

          {/* Footer preview */}
          {theme?.footer && (
            <PublicFooter theme={theme} />
          )}
        </div>
      </div>
    </div>
  );
}
