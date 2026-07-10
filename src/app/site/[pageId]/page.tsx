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
  const globalSettings = await loadSiteSettings();
  const wsSettings = await WorkspaceResolver.getSiteSettings(workspaceId);
  const siteSettings = {
    ...globalSettings,
    ...wsSettings,
    brand: {
      ...globalSettings?.brand,
      ...wsSettings?.brand
    },
    navigation: globalSettings?.navigation || wsSettings?.navigation
  };

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
        <main 
          style={{ 
            minHeight: '100vh', 
            width: '100%', 
            background: theme.backgroundColor || '#0F1112',
            color: theme.foregroundColor || '#F4F1EA',
            fontFamily: 'var(--font-sans)',
            display: 'flex',
            flexDirection: 'column',
            '--color-background': theme?.backgroundColor || '#0F1112',
            '--color-foreground': theme?.foregroundColor || '#F4F1EA',
            '--color-primary': theme?.primaryColor || '#B9783B',
            '--color-surface': theme?.surfaceColor || '#1E2124',
            '--color-muted': theme?.mutedColor || '#D8C7AF',
            '--color-accent': theme?.accentColor || '#708C84',
            '--font-heading': theme?.typography?.headingFontFamily || "'Cormorant Garamond', serif",
            '--font-sans': theme?.typography?.bodyFontFamily || "'Inter', sans-serif",
          } as React.CSSProperties}
        >
          <PublicNavigation theme={theme} settings={siteSettings} />
          
          <div style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '8rem 2rem 6rem 2rem' }}>
            <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.5rem' }}>
                M/Y Whiskey Collections
              </span>
              <h1 style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'white', margin: '0 0 1rem 0' }}>
                {matchedConfig.pluralName}
              </h1>
              <p style={{ color: '#D8C7AF', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto', opacity: 0.8, lineHeight: '1.6' }}>
                Explore our fully-equipped, curated selection of premium {matchedConfig.pluralName.toLowerCase()} designed to elevate your time on board.
              </p>
            </div>

            {activeItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#1E2124', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ color: '#D8C7AF', fontSize: '1.1rem', margin: 0 }}>No {matchedConfig.pluralName.toLowerCase()} are currently available. Please check back later.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                {activeItems.map((item) => (
                  <a 
                    key={item.id}
                    href={`/${matchedConfig.slugPrefix}/${item.slug}`}
                    style={{
                      textDecoration: 'none',
                      background: '#1E2124',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      height: '100%',
                      transition: 'all 0.25s ease'
                    }}
                    className="collection-card"
                  >
                    <style dangerouslySetInnerHTML={{__html: `
                      .collection-card:hover {
                        transform: translateY(-4px);
                        border-color: rgba(185, 120, 59, 0.4) !important;
                        box-shadow: 0 12px 24px rgba(0,0,0,0.3);
                      }
                    `}} />
                    
                    {item.heroImage ? (
                      <div style={{ width: '100%', height: '220px', overflow: 'hidden', position: 'relative' }}>
                        <img 
                          src={item.heroImage} 
                          alt={item.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '220px', background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {matchedConfig.id === 'adventure' && <Compass size={40} color="#B9783B" opacity={0.4} />}
                        {matchedConfig.id === 'asset' && <Ship size={40} color="#B9783B" opacity={0.4} />}
                        {matchedConfig.id === 'staff' && <Users size={40} color="#B9783B" opacity={0.4} />}
                      </div>
                    )}

                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyItems: 'space-between', flex: 1 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {matchedConfig.id === 'adventure' ? `${item.duration || 'Flexible'}` : matchedConfig.id === 'asset' ? `${item.category || 'Asset'}` : `${item.role || 'Crew'}`}
                          </span>
                          {matchedConfig.id === 'adventure' && item.basePrice > 0 && (
                            <span style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600 }}>
                              From ${item.basePrice.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0' }}>
                          {item.title}
                        </h3>

                        {item.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.75rem' }}>
                            <MapPin size={14} color="#B9783B" />
                            <span>{item.location}</span>
                          </div>
                        )}

                        <p style={{ fontSize: '0.9rem', color: '#D8C7AF', opacity: 0.7, margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4', height: '2.8rem' }}>
                          {item.shortDescription}
                        </p>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#B9783B', fontWeight: 600 }}>Explore Details</span>
                        <ArrowRight size={16} color="#B9783B" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
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
