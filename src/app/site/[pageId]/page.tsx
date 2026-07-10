import { loadPageData, getContentTypeConfigs, getContentItems, loadSiteSettings } from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import { PageNode } from '@/store/useBuilderStore';
import { SpecsBlock, HeroBlock, DeckPlanBlock, BookingFormBlock } from '@/components/builder/Blocks';
import { DividerBlock, IconBlock, VideoBlock, MapBlock, AccordionBlock, AmenitiesBlock,
  PricingBlock, CrewBlock, ItineraryBlock, TestimonialsBlock, VideoHeroBlock, GalleryWithLightbox, HtmlBlock,
  EnhancedHeroBlock, TextMediaBlock, ExperiencesGridBlock, YachtFeatureBlock, TestimonialsGridBlock, CTABlock, ComparisonTableBlock, TextBlock, ContentGridBlock,
  DynamicCardBlock, DynamicCarousel, BookingWidget, DynamicDetailBlock, DynamicBlogBlock } from '@/components/builder/NewBlocks';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import { notFound } from 'next/navigation';
import { Compass, Ship, Users, MapPin, Clock, ArrowRight } from 'lucide-react';
import { WorkspaceResolver } from '@/lib/services/workspaceResolver';

export const dynamic = 'force-dynamic';

const PublicNodeRenderer = ({ node, allNodes, theme }: { node: PageNode; allNodes: Record<string, PageNode>; theme?: any }) => {
  if (!node) return null;

  let Content = null;

  switch (node.type) {
    case 'Section':
      return (
        <section style={node.props.style}>
          {node.children.map((childId) => (
            <PublicNodeRenderer key={childId} node={allNodes[childId]} allNodes={allNodes} theme={theme} />
          ))}
        </section>
      );
    case 'Text':
      Content = <TextBlock node={node} theme={theme} />;
      break;
    case 'Image':
      Content = node.props.src ? (
        <img src={node.props.src} alt="Block Content" style={{ ...node.props.style, maxWidth: '100%', height: 'auto', objectFit: 'cover' }} />
      ) : (
        <div style={{ ...node.props.style, backgroundColor: '#222', border: '2px dashed #44' }} />
      );
      break;
    case 'Button':
      Content = <button style={node.props.style}>{node.props.text}</button>;
      break;
    case 'Specs':
      Content = <SpecsBlock node={node} />;
      break;
    case 'Hero':
      Content = <HeroBlock node={node} />;
      break;
    case 'Gallery':
      Content = <GalleryWithLightbox node={node} />;
      break;
    case 'DeckPlan':
      Content = <DeckPlanBlock node={node} />;
      break;
    case 'BookingForm':
      Content = <BookingFormBlock node={node} />;
      break;
    case 'Divider':
      Content = <DividerBlock node={node} />;
      break;
    case 'Icon':
      Content = <IconBlock node={node} />;
      break;
    case 'Video':
      Content = <VideoBlock node={node} />;
      break;
    case 'Map':
      Content = <MapBlock node={node} />;
      break;
    case 'Accordion':
      Content = <AccordionBlock node={node} />;
      break;
    case 'Amenities':
      Content = <AmenitiesBlock node={node} />;
      break;
    case 'Pricing':
      Content = <PricingBlock node={node} />;
      break;
    case 'Crew':
      Content = <CrewBlock node={node} />;
      break;
    case 'Itinerary':
      Content = <ItineraryBlock node={node} />;
      break;
    case 'Testimonials':
      Content = <TestimonialsBlock node={node} />;
      break;
    case 'VideoHero':
      Content = <VideoHeroBlock node={node} />;
      break;
    case 'Html':
      Content = <HtmlBlock node={node} />;
      break;
    case 'EnhancedHero':
      Content = <EnhancedHeroBlock node={node} />;
      break;
    case 'TextMedia':
      Content = <TextMediaBlock node={node} />;
      break;
    case 'ExperiencesGrid':
      Content = <ExperiencesGridBlock node={node} />;
      break;
    case 'YachtFeature':
      Content = <YachtFeatureBlock node={node} />;
      break;
    case 'TestimonialsGrid':
      Content = <TestimonialsGridBlock node={node} />;
      break;
    case 'CTA':
      Content = <CTABlock node={node} />;
      break;
    case 'ComparisonTable':
      Content = <ComparisonTableBlock node={node} />;
      break;
    case 'ContentGrid':
      Content = <ContentGridBlock node={node} />;
      break;
    case 'DynamicCardBlock':
      Content = <DynamicCardBlock node={node} />;
      break;
    case 'DynamicCarousel':
      Content = <DynamicCarousel node={node} />;
      break;
    case 'BookingWidget':
      Content = <BookingWidget node={node} />;
      break;
    case 'DynamicDetailBlock':
      Content = <DynamicDetailBlock node={node} />;
      break;
    case 'DynamicBlogBlock':
      Content = <DynamicBlogBlock node={node} />;
      break;
    case 'DataSource':
      const ds = node.props.source || 'listings';
      const renderer = node.props.renderer || 'grid';
      Content = (
        <div style={{ padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', textAlign: 'center', margin: '2rem 0' }}>
          <h4 style={{ color: 'var(--color-primary)', fontSize: '1.25rem', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
            {ds.replace('-', ' ')} Feed ({renderer})
          </h4>
          <p style={{ color: '#D8C7AF', opacity: 0.6, fontSize: '0.9rem', margin: 0 }}>
            Dynamic Platform Connection Placeholder — Composing {ds} feed from Tuamotu Knowledge Graph.
          </p>
        </div>
      );
      break;
  }

  const isFullWidth = ['Specs','Hero','Gallery','Image','DeckPlan','BookingForm','Video','Map','Accordion','Amenities','Pricing','Crew','Itinerary','Testimonials','VideoHero','Divider','Html','EnhancedHero','TextMedia','ExperiencesGrid','YachtFeature','TestimonialsGrid','CTA','ComparisonTable','ContentGrid','DynamicCardBlock','DynamicCarousel','BookingWidget','DynamicDetailBlock','DynamicBlogBlock','DataSource'].includes(node.type);

  return (
    <div style={{ display: isFullWidth ? 'block' : 'inline-block', width: isFullWidth ? '100%' : 'auto' }}>
      {Content}
    </div>
  );
};

export default async function WorkspacePublicSubPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  if (pageId.startsWith('template-')) {
    notFound();
  }

  let workspaceId = 'ws_whiskey';
  try {
    workspaceId = await WorkspaceResolver.getActiveWorkspaceId();
  } catch (err: any) {
    if (err.message === 'Workspace is suspended') {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', backgroundColor: '#0F1112', color: '#E3E4E6', fontFamily: '"Outfit", sans-serif' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#EF4444', fontWeight: '700' }}>Workspace Suspended</h1>
          <p style={{ color: '#9CA3AF' }}>This workspace is currently suspended and public presence is unavailable.</p>
        </div>
      );
    }
    throw err;
  }

  // Load configuration mapper
  let siteSettings = await WorkspaceResolver.getSiteSettings(workspaceId);
  if (!siteSettings) {
    siteSettings = await loadSiteSettings();
  }

  // Load page matching workspace scope
  const key = workspaceId === 'ws_whiskey' ? pageId : `${workspaceId}_${pageId}`;
  const pageData = await loadPageData(key);

  if (!pageData) {
    // Check custom content type config boundaries
    const configs = await getContentTypeConfigs();
    const matchedConfig = configs.find(c => c.slugPrefix === pageId && c.isEnabled);
    
    if (matchedConfig) {
      const items = await getContentItems(matchedConfig.id, workspaceId);
      const activeItems = items.filter(i => i.status === 'published');
      const theme = siteSettings?.theme || DEFAULT_THEME;

      return (
        <main style={{ minHeight: '100vh', background: theme?.backgroundColor || '#1F2326', color: theme?.foregroundColor || '#F4F1EA', fontFamily: theme?.typography?.bodyFontFamily || "'Inter', sans-serif" }}>
          <PublicNavigation theme={theme} settings={siteSettings} />
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '6rem 2rem' }}>
            <h1 style={{ fontSize: '3rem', fontFamily: theme?.typography?.headingFontFamily || "'Cormorant Garamond', serif", color: 'var(--color-primary)', marginBottom: '2rem' }}>
              {matchedConfig.pluralName}
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
              {activeItems.map((item) => (
                <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {item.meta?.images?.[0] && (
                    <img src={item.meta.images[0]} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>{item.title}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', margin: '0 0 1.5rem' }}>
                        {item.description || item.excerpt || 'Explore details...'}
                      </p>
                    </div>
                    <a href={`/go/${pageId}/${item.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                      View Details <ArrowRight size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <PublicFooter theme={theme} />
        </main>
      );
    }

    notFound();
  }

  const { nodes, theme: loadedTheme } = pageData;
  const rootNode = nodes['root'];

  const homeData = await loadPageData(workspaceId === 'ws_whiskey' ? 'home' : `${workspaceId}_home`);
  const globalTheme = homeData?.theme || DEFAULT_THEME;
  const theme = {
    ...loadedTheme,
    header: globalTheme.header || loadedTheme.header || DEFAULT_THEME.header,
    footer: globalTheme.footer || loadedTheme.footer || DEFAULT_THEME.footer,
  };

  return (
    <main 
      style={{ 
        minHeight: '100vh', 
        width: '100%', 
        background: 'var(--color-background)',
        '--color-background': theme?.backgroundColor || '#1F2326',
        '--color-foreground': theme?.foregroundColor || '#F4F1EA',
        '--color-primary': theme?.primaryColor || '#B9783B',
        '--color-surface': theme?.surfaceColor || '#1E3A4C',
        '--color-muted': theme?.mutedColor || '#D8C7AF',
        '--color-accent': theme?.accentColor || '#708C84',
        '--color-border': 'rgba(255, 255, 255, 0.1)',
        
        '--font-heading': theme?.typography?.headingFontFamily || "'Cormorant Garamond', serif",
        '--font-sans': theme?.typography?.bodyFontFamily || "'Inter', sans-serif",
        
        '--h1-font-size': theme?.typography?.h1?.fontSize || '3.5rem',
        '--h1-font-weight': theme?.typography?.h1?.fontWeight || '800',
        '--h1-font-size-mobile': theme?.typography?.h1Mobile?.fontSize || theme?.typography?.h1?.fontSize || '2.25rem',
        '--h1-font-weight-mobile': theme?.typography?.h1Mobile?.fontWeight || theme?.typography?.h1?.fontWeight || '800',
        '--h2-font-size': theme?.typography?.h2?.fontSize || '2.5rem',
        '--h2-font-weight': theme?.typography?.h2?.fontWeight || '700',
        '--h2-font-size-mobile': theme?.typography?.h2Mobile?.fontSize || theme?.typography?.h2?.fontSize || '1.75rem',
        '--h2-font-weight-mobile': theme?.typography?.h2Mobile?.fontWeight || theme?.typography?.h2?.fontWeight || '700',
        '--h3-font-size': theme?.typography?.h3?.fontSize || '1.5rem',
        '--h3-font-weight': theme?.typography?.h3?.fontWeight || '600',
        '--h3-font-size-mobile': theme?.typography?.h3Mobile?.fontSize || theme?.typography?.h3?.fontSize || '1.25rem',
        '--h3-font-weight-mobile': theme?.typography?.h3Mobile?.fontWeight || theme?.typography?.h3?.fontWeight || '600',
        '--p-font-size': theme?.typography?.p?.fontSize || '1rem',
        '--p-font-weight': theme?.typography?.p?.fontWeight || '400',
        '--p-font-size-mobile': theme?.typography?.pMobile?.fontSize || '0.925rem',
        '--p-font-weight-mobile': theme?.typography?.pMobile?.fontWeight || theme?.typography?.p?.fontWeight || '400',
        
        '--base-radius': theme?.styles?.radius || '0.5rem',
        '--section-padding': theme?.styles?.padding || 'clamp(3rem, 8vw, 6rem) clamp(1.5rem, 4vw, 2rem)',
        
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-foreground)'
      } as React.CSSProperties}
    >
      <PublicNavigation theme={theme} settings={siteSettings} />
      <PublicNodeRenderer node={rootNode} allNodes={nodes} theme={theme} />
      <PublicFooter theme={theme} />
    </main>
  );
}
