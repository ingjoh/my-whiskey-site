import { loadPageData } from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import { PageNode } from '@/store/useBuilderStore';
import { SpecsBlock, HeroBlock, DeckPlanBlock, BookingFormBlock } from '@/components/builder/Blocks';
import { DividerBlock, IconBlock, VideoBlock, MapBlock, AccordionBlock, AmenitiesBlock,
  PricingBlock, CrewBlock, ItineraryBlock, TestimonialsBlock, VideoHeroBlock, GalleryWithLightbox, HtmlBlock,
  EnhancedHeroBlock, TextMediaBlock, ExperiencesGridBlock, YachtFeatureBlock, TestimonialsGridBlock, CTABlock, ComparisonTableBlock, TextBlock, ContentGridBlock } from '@/components/builder/NewBlocks';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';

// We disable caching for now so you can see changes instantly when you publish
export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const pageData = await loadPageData('home');
  if (!pageData) return { title: 'M/Y Whiskey' };
  return {
    title: pageData.title ? `${pageData.title} | M/Y Whiskey` : 'M/Y Whiskey',
  };
}

function PublicNodeRenderer({ node, allNodes, theme }: { node: PageNode; allNodes: Record<string, PageNode>; theme?: any }) {
  if (!node) return null;

  let Content = null;
  switch (node.type) {
    case 'Text':
      Content = <TextBlock node={node} theme={theme} />;
      break;
    case 'Button':
      Content = <button style={node.props.style}>{node.props.text}</button>;
      break;
    case 'Image':
      Content = node.props.src ? (
        <img src={node.props.src} alt={node.props.alt} style={node.props.style} />
      ) : (
        <div style={{ ...node.props.style, backgroundColor: 'var(--color-background)', border: '2px dashed var(--color-border)' }} />
      );
      break;
    case 'Section':
      Content = (
        <>
          {node.children.map(childId => (
            <PublicNodeRenderer key={childId} node={allNodes[childId]} allNodes={allNodes} theme={theme} />
          ))}
        </>
      );
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
  }

  if (node.type === 'Section') {
    return <div style={node.props.style}>{Content}</div>;
  }
  const isFullWidth = ['Specs','Hero','Gallery','Image','DeckPlan','BookingForm','Video','Map','Accordion','Amenities','Pricing','Crew','Itinerary','Testimonials','VideoHero','Divider','Html','EnhancedHero','TextMedia','ExperiencesGrid','YachtFeature','TestimonialsGrid','CTA','ComparisonTable','ContentGrid'].includes(node.type);
  return (
    <div style={{ display: isFullWidth ? 'block' : 'inline-block', width: isFullWidth ? '100%' : 'auto' }}>
      {Content}
    </div>
  );
}

export default async function PublicHomePage() {
  const pageData = await loadPageData('home');

  if (!pageData) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>Site Not Published Yet</h1>
        <p>Go to /admin to build and publish your first page.</p>
      </div>
    );
  }

  const { nodes, theme: loadedTheme } = pageData;
  const theme = {
    ...DEFAULT_THEME,
    ...loadedTheme,
    header: {
      ...DEFAULT_THEME.header,
      ...loadedTheme?.header
    },
    footer: {
      ...DEFAULT_THEME.footer,
      ...loadedTheme?.footer
    }
  };
  const rootNode = nodes['root'];

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
        
        '--h1-font-size': theme?.typography?.h1?.fontSize || 'clamp(2rem, 5vw, 3.5rem)',
        '--h1-font-weight': theme?.typography?.h1?.fontWeight || '800',
        '--h2-font-size': theme?.typography?.h2?.fontSize || 'clamp(1.75rem, 4vw, 2.5rem)',
        '--h2-font-weight': theme?.typography?.h2?.fontWeight || '700',
        '--h3-font-size': theme?.typography?.h3?.fontSize || 'clamp(1.25rem, 3vw, 1.5rem)',
        '--h3-font-weight': theme?.typography?.h3?.fontWeight || '600',
        '--p-font-size': theme?.typography?.p?.fontSize || '1.1rem',
        '--p-font-weight': theme?.typography?.p?.fontWeight || '400',
        '--p-large-font-size': theme?.typography?.large?.fontSize || 'clamp(1.1rem, 2vw, 1.3rem)',
        '--p-large-font-weight': theme?.typography?.large?.fontWeight || '400',
        '--small-font-size': theme?.typography?.small?.fontSize || '0.875rem',
        '--small-font-weight': theme?.typography?.small?.fontWeight || '400',
        '--a-font-size': theme?.typography?.a?.fontSize || '1rem',
        '--a-font-weight': theme?.typography?.a?.fontWeight || '600',
        
        '--base-radius': theme?.styles?.radius || '0.5rem',
        '--section-padding': theme?.styles?.padding || 'clamp(3rem, 8vw, 6rem) clamp(1.5rem, 4vw, 2rem)',
        
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-foreground)'
      } as React.CSSProperties}
    >
      {theme?.typography?.headingFontFamily && theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '').trim() !== 'Inter' && (
        <link 
          href={`https://fonts.googleapis.com/css2?family=${theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '').trim().replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap`} 
          rel="stylesheet" 
        />
      )}
      {theme?.typography?.bodyFontFamily && theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '').trim() !== 'Inter' && (
        <link 
          href={`https://fonts.googleapis.com/css2?family=${theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '').trim().replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap`} 
          rel="stylesheet" 
        />
      )}
      <PublicNavigation theme={theme} />
      <PublicNodeRenderer node={rootNode} allNodes={nodes} theme={theme} />
      <PublicFooter theme={theme} />
    </main>
  );
}
