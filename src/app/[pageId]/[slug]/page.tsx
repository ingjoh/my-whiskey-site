import { getContentTypeConfigs, getContentItem, getPublishedCaptains, getContentItems, loadIncludedItems, loadPageData, loadSiteSettings } from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import AdventureDetailView from '@/components/public/AdventureDetailView';
import LocationDetailView from '@/components/public/LocationDetailView';
import { SwipeScrollContainer } from '@/components/builder/SwipeScrollContainer';
import ReactMarkdown from 'react-markdown';
import { notFound } from 'next/navigation';
import { 
  MapPin, Clock, Users, Check, Calendar, ArrowRight, 
  Anchor, Ship, Award, Globe, MessageSquare, Info, Shield,
  Compass, Star, ExternalLink
} from 'lucide-react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ pageId: string; slug: string }> }): Promise<Metadata> {
  const { pageId, slug } = await params;
  
  // 1. Resolve content type config by prefix
  const configs = await getContentTypeConfigs();
  const config = configs.find(c => c.slugPrefix === pageId && c.isEnabled);
  if (!config || config.isPublic === false) return { title: 'Page Not Found | M/Y Whiskey' };

  // 2. Resolve content item by slug
  const item = await getContentItem(slug);
  if (!item || item.contentType !== config.id || item.status !== 'published') {
    return { title: 'Page Not Found | M/Y Whiskey' };
  }

  return {
    title: `${item.title} | M/Y Whiskey`,
    description: item.shortDescription,
  };
}

export default async function ContentItemDetailPage({ params }: { params: Promise<{ pageId: string; slug: string }> }) {
  const { pageId, slug } = await params;

  // 1. Resolve content type config by prefix
  const configs = await getContentTypeConfigs();
  const config = configs.find(c => c.slugPrefix === pageId && c.isEnabled);
  if (!config || config.isPublic === false) notFound();

  // 2. Fetch the content item
  const item = await getContentItem(slug);
  if (!item || item.contentType !== config.id || item.status !== 'published') {
    notFound();
  }

  // Fetch published captains for adventures
  const captains = config.id === 'adventure' ? await getPublishedCaptains() : [];

  // Fetch linked entities for adventures
  let linkedAssetsList: any[] = [];
  let linkedLocationsList: any[] = [];
  let linkedStaffList: any[] = [];
  let linkedAdventuresList: any[] = [];
  let globalIncludedItems: any[] = [];

  if (config.id === 'staff') {
    const allAdventures = await getContentItems('adventure');
    linkedAdventuresList = allAdventures.filter(adv => 
      (adv.linkedStaff || []).includes(slug)
    );
  }

  if (config.id === 'location') {
    const allAdventures = await getContentItems('adventure');
    linkedAdventuresList = allAdventures.filter(adv => 
      (adv.linkedLocations || []).includes(slug)
    );
  }

  if (config.id === 'adventure') {
    const assetSlugs = item.linkedAssets || [];
    const locationSlugs = item.linkedLocations || [];
    const staffSlugs = item.linkedStaff || [];

    const [assets, locations, staff, includedItemsLib] = await Promise.all([
      Promise.all(assetSlugs.map((slug: string) => getContentItem(slug))),
      Promise.all(locationSlugs.map((slug: string) => getContentItem(slug))),
      Promise.all(staffSlugs.map((slug: string) => getContentItem(slug))),
      loadIncludedItems()
    ]);

    linkedAssetsList = assets.filter(Boolean);
    linkedLocationsList = locations.filter(Boolean);
    linkedStaffList = staff.filter(Boolean);
    globalIncludedItems = includedItemsLib;
  }

  // Common Theme styles for consistency
  const homeData = await loadPageData('home');
  const siteSettings = await loadSiteSettings();
  const globalTheme = homeData?.theme || DEFAULT_THEME;

  const theme = {
    ...DEFAULT_THEME,
    ...globalTheme,
    backgroundColor: globalTheme.backgroundColor || '#121416',
    foregroundColor: globalTheme.foregroundColor || '#F4F1EA',
    primaryColor: globalTheme.primaryColor || '#B9783B',
    surfaceColor: globalTheme.surfaceColor || '#1E2124',
    mutedColor: globalTheme.mutedColor || '#D8C7AF',
    accentColor: globalTheme.accentColor || '#708C84',
    header: {
      ...DEFAULT_THEME.header,
      ...globalTheme.header,
    },
    footer: {
      ...DEFAULT_THEME.footer,
      ...globalTheme.footer,
    }
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
        '--p-large-font-size': theme?.typography?.large?.fontSize || '1.2rem',
        '--p-large-font-weight': theme?.typography?.large?.fontWeight || '400',
        '--p-large-font-size-mobile': theme?.typography?.largeMobile?.fontSize || '1.1rem',
        '--p-large-font-weight-mobile': theme?.typography?.largeMobile?.fontWeight || theme?.typography?.large?.fontWeight || '400',
        '--small-font-size': theme?.typography?.small?.fontSize || '0.825rem',
        '--small-font-weight': theme?.typography?.small?.fontWeight || '400',
        '--small-font-size-mobile': theme?.typography?.smallMobile?.fontSize || '0.775rem',
        '--small-font-weight-mobile': theme?.typography?.smallMobile?.fontWeight || theme?.typography?.small?.fontWeight || '400',
        '--a-font-size': theme?.typography?.a?.fontSize || '0.95rem',
        '--a-font-weight': theme?.typography?.a?.fontWeight || '600',
        '--a-font-size-mobile': theme?.typography?.aMobile?.fontSize || '0.875rem',
        '--a-font-weight-mobile': theme?.typography?.aMobile?.fontWeight || theme?.typography?.a?.fontWeight || '600',
        
        '--base-radius': theme?.styles?.radius || '0.5rem',
        '--section-padding': theme?.styles?.padding || 'clamp(3rem, 8vw, 6rem) clamp(1.5rem, 4vw, 2rem)',
        
        fontFamily: 'var(--font-sans)',
        color: 'var(--color-foreground)'
      } as React.CSSProperties}
    >
      <PublicNavigation theme={{ ...theme, header: { ...theme.header, sticky: true } }} settings={siteSettings} />

      {/* Render based on Content Type */}
      {config.id === 'adventure' && (
        <AdventureDetailView 
          item={item} 
          captains={captains as any} 
          theme={theme}
          linkedAssets={linkedAssetsList}
          linkedLocations={linkedLocationsList}
          linkedStaff={linkedStaffList}
          globalIncludedItems={globalIncludedItems}
        />
      )}

      {config.id === 'location' && (
        <LocationDetailView item={item} theme={theme} linkedAdventures={linkedAdventuresList} />
      )}

      {config.id === 'asset' && (
        <AssetDetailView item={item} theme={theme} />
      )}

      {config.id === 'staff' && (
        <StaffDetailView item={item} theme={theme} linkedAdventures={linkedAdventuresList} />
      )}

      <PublicFooter theme={theme} />
    </main>
  );
}

// -----------------------------------------------------------------------------
// ASSET DETAIL VIEW
// -----------------------------------------------------------------------------
function AssetDetailView({ item, theme }: { item: any; theme: any }) {
  const category = item.category || 'Luxury Asset';
  const make = item.make || '';
  const model = item.model || '';
  const location = item.location || 'Destin Marina, FL';
  const specs = item.specifications ? Object.entries(item.specifications) : [];

  return (
    <div className="asset-detail-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .asset-detail-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 8rem 2rem 6rem 2rem;
          width: 100%;
        }
        .asset-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 4rem;
          align-items: start;
        }
        @media (max-width: 992px) {
          .asset-detail-container {
            padding: 6rem 1rem 4rem 1rem !important;
          }
          .asset-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 2rem !important;
          }
        }
      ` }} />
      <div className="asset-layout">
        
        {/* Left Image & Title Info */}
        <div>
          {item.heroImage ? (
            <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem', background: '#1E2124' }}>
              <img src={item.heroImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '400px', borderRadius: '12px', background: '#1E2124', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
              <Ship size={64} color="#B9783B" opacity={0.4} />
            </div>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(185, 120, 59, 0.15)', color: '#B9783B', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>
            {category}
          </div>

          <h1 style={{ fontSize: '2.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 1rem 0' }}>
            {item.title}
          </h1>

          {(make || model) && (
            <div style={{ fontSize: '1.1rem', color: '#D8C7AF', marginBottom: '1.5rem', fontWeight: 500 }}>
              {make} {model}
            </div>
          )}

          <p style={{ fontSize: '1.05rem', color: '#D8C7AF', lineHeight: '1.75', margin: 0 }}>
            {item.shortDescription}
          </p>
        </div>

        {/* Right Details / Specs Panel */}
        <div style={{ background: '#1E2124', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '2.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
            Asset Specifications
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={18} color="#B9783B" />
              <div>
                <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.6, display: 'block' }}>Location / Dock</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{location}</span>
              </div>
            </div>

            {specs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                {specs.map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.5rem' }}>
                    <span style={{ color: '#D8C7AF', opacity: 0.8, fontSize: '0.9rem' }}>{key}</span>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', marginTop: '1rem' }}>
                <Info size={16} color="#B9783B" />
                <span style={{ fontSize: '0.85rem', color: '#D8C7AF' }}>Detailed specifications will be updated soon.</span>
              </div>
            )}
          </div>

          <a 
            href="/contact" 
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
              marginTop: '2.5rem',
              transition: 'all 0.2s'
            }}
          >
            Inquire About Booking <MessageSquare size={16} />
          </a>
        </div>

      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// STAFF DETAIL VIEW
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// STAFF DETAIL VIEW
// -----------------------------------------------------------------------------
interface Testimonial {
  text: string;
  author: string;
  relation?: string;
}

const MOCK_TESTIMONIALS: Record<string, Testimonial[]> = {
  'captain-sarah-vance': [
    { text: "Captain Sarah made our family trip absolutely unforgettable! Her safety protocols put us at ease, and her knowledge of dolphin spots was incredible.", author: "The Reynolds Family", relation: "Crab Island Guest" },
    { text: "Sarah was a fantastic host on the Sunset Cruise. Very professional and knew the perfect spot to anchor for the sunset.", author: "David K.", relation: "Sunset Charter Guest" }
  ],
  'captain-marcus-brody': [
    { text: "Marcus is a legendary guide. We booked a deep sea charter and caught our limit within hours. His maritime knowledge is top-notch.", author: "Robert T.", relation: "Fishing Charter Guest" },
    { text: "Incredibly skilled captain. Marcus navigated through rough chop with absolute poise. Will definitely book again.", author: "Captain-in-training Allen", relation: "Private Charter Guest" }
  ],
  'captain-david-chen': [
    { text: "Captain Chen was so accommodating and spoke fluent Mandarin, which made our international business guests feel right at home. The charter was spotless and beautiful.", author: "Lin W.", relation: "Corporate Charter Guest" },
    { text: "David was the perfect host for our sunset cruise. Very polite, helpful, and knows the best spots in Destin.", author: "Emily R.", relation: "Sunset Cruise Guest" }
  ],
  'captain-elena-rostova': [
    { text: "Elena was amazing! Since she is a certified Divemaster, she guided us on a snorkel reef tour that was out of this world. Very passionate about marine life.", author: "Jessica M.", relation: "Snorkeling Charter Guest" },
    { text: "Great energy and incredible competence. Elena is an outstanding captain and conservationist.", author: "Alex S.", relation: "Adventure Guest" }
  ],
  'captain-robert-miller': [
    { text: "Absolute class. Captain Red Miller runs a tight ship. His 25 years of yacht experience shines through in every detail. Truly a luxury command.", author: "Arthur P.", relation: "Yacht Charterer" },
    { text: "Quiet, confident, and highly professional. We felt like royalty under Captain Miller's command.", author: "Charlotte V.", relation: "Weekly Charterer" }
  ]
};

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { text: "Incredibly friendly, attentive, and kept our glasses full the entire charter. The absolute best crew member!", author: "Samantha D.", relation: "Charter Guest" },
  { text: "Professional service that rivaled any five-star resort. Highly recommend sailing with this crew!", author: "James G.", relation: "Private Cruise Guest" }
];

function StaffDetailView({ item, theme, linkedAdventures = [] }: { item: any; theme: any; linkedAdventures?: any[] }) {
  const role = item.role || 'Crew Member';
  const location = item.location || 'Destin, FL';
  const certs = item.certifications || [];
  const languages = item.languagesSpoken || [];
  const hourlyRate = item.hourlyRate || item.dailyRate || 0;
  const isCaptain = item.isCaptain === true;

  // Retrieve testimonials based on slug
  const testimonials = MOCK_TESTIMONIALS[item.slug] || DEFAULT_TESTIMONIALS;

  // Helper to format currency values nicely
  const formatCost = (val: number) => {
    return `$${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Helper to match certification name to an icon
  const getCertIcon = (cert: string) => {
    const c = cert.toLowerCase();
    if (c.includes('uscg') || c.includes('master') || c.includes('license') || c.includes('captain')) {
      return <Award size={18} color="#B9783B" style={{ flexShrink: 0 }} />;
    }
    if (c.includes('aid') || c.includes('cpr') || c.includes('aed') || c.includes('firefighting') || c.includes('responder')) {
      return <Shield size={18} color="#708C84" style={{ flexShrink: 0 }} />;
    }
    if (c.includes('stcw') || c.includes('radio') || c.includes('operator')) {
      return <Anchor size={18} color="#B9783B" style={{ flexShrink: 0 }} />;
    }
    if (c.includes('padi') || c.includes('divemaster') || c.includes('scuba') || c.includes('dive')) {
      return <Compass size={18} color="#708C84" style={{ flexShrink: 0 }} />;
    }
    return <Check size={18} color="#B9783B" style={{ flexShrink: 0 }} />;
  };

  return (
    <div className="staff-detail-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .staff-detail-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 8rem 2rem 6rem 2rem;
          width: 100%;
        }
        .staff-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
          gap: 4rem;
          align-items: start;
        }
        .adventure-hosted-card:hover {
          transform: translateY(-3px);
          border-color: rgba(185, 120, 59, 0.4) !important;
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }
        @media (max-width: 992px) {
          .staff-detail-container {
            padding: 6rem 1rem 4rem 1rem !important;
          }
          .staff-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 2rem !important;
          }
        }
      ` }} />
      <div className="staff-layout">
        
        {/* Left Column: Avatar & Basic Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {item.heroImage ? (
            <div style={{ width: '100%', height: '360px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#1E2124', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <img src={item.heroImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '360px', borderRadius: '12px', background: '#1E2124', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Users size={64} color="#B9783B" opacity={0.4} />
            </div>
          )}

          {/* Quick Specifications Panel */}
          <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#B9783B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Crew Profile
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem' }}>
              <Award size={16} color="#B9783B" />
              <span style={{ color: '#D8C7AF', opacity: 0.8 }}>Position: </span>
              <strong style={{ color: 'white', marginLeft: 'auto' }}>{role}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem' }}>
              <MapPin size={16} color="#B9783B" />
              <span style={{ color: '#D8C7AF', opacity: 0.8 }}>Base Port: </span>
              <strong style={{ color: 'white', marginLeft: 'auto' }}>{location}</strong>
            </div>

            {isCaptain && hourlyRate > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <Anchor size={16} color="#B9783B" />
                <span style={{ color: '#D8C7AF', opacity: 0.8 }}>Hourly Rate: </span>
                <strong style={{ color: '#B9783B', fontSize: '1.05rem', fontWeight: 700, marginLeft: 'auto' }}>
                  {formatCost(hourlyRate)}/hr
                </strong>
              </div>
            )}

            {languages.length > 0 && (
              <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.875rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
                <Globe size={16} color="#B9783B" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <span style={{ color: '#D8C7AF', opacity: 0.8, display: 'block', marginBottom: '0.25rem' }}>Languages Spoken:</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{languages.join(', ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Guest Testimonials inside Left Column */}
          {testimonials.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.4rem' }}>
                Guest Testimonials
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {testimonials.map((t, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid rgba(255,255,255,0.03)', 
                      borderRadius: '8px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} color="#B9783B" fill="#B9783B" />
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#D8C7AF', fontStyle: 'italic', lineHeight: '1.45', opacity: 0.95 }}>
                      "{t.text}"
                    </p>
                    <div style={{ fontSize: '0.75rem', color: '#B9783B', fontWeight: 600 }}>
                      — {t.author} {t.relation && <span style={{ color: '#D8C7AF', opacity: 0.5, fontWeight: 400 }}>({t.relation})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Bio, Certifications, Hosted Experiences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              {isCaptain && (
                <span style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'rgba(185, 120, 59, 0.15)',
                  color: '#B9783B',
                  border: '1px solid rgba(185, 120, 59, 0.3)',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <Anchor size={12} /> Licensed Captain
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: '#D8C7AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6 }}>
                Meet The Crew
              </span>
            </div>
            <h1 style={{ fontSize: '3.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', margin: '0 0 0.5rem 0', lineHeight: '1.1' }}>
              {item.title}
            </h1>
            <div style={{ fontSize: '1.3rem', color: '#D8C7AF', opacity: 0.8, fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic' }}>
              {role} of M/Y Whiskey
            </div>

            {/* Prominent Star Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.85rem' }}>
              {[...Array(5)].map((_, i) => {
                const ratingVal = item.rating !== undefined ? Number(item.rating) : 5;
                const isFilled = i < Math.floor(ratingVal);
                return (
                  <Star 
                    key={i} 
                    size={18} 
                    color="#B9783B"
                    fill={isFilled ? "#B9783B" : "transparent"} 
                    style={{ opacity: isFilled ? 1 : 0.2 }}
                  />
                );
              })}
              <span style={{ fontSize: '0.9rem', color: '#D8C7AF', fontWeight: 600, marginLeft: '0.35rem' }}>
                {Number(item.rating !== undefined ? item.rating : 5).toFixed(1)} / 5.0 Rating
              </span>
            </div>
          </div>

          {/* Biography */}
          <div>
            <h2 style={{ fontSize: '1.65rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
              Biography
            </h2>
            <div style={{ fontSize: '1.05rem', color: '#D8C7AF', lineHeight: '1.8', margin: 0, opacity: 0.9 }}>
              {item.bio ? (
                <ReactMarkdown>{item.bio}</ReactMarkdown>
              ) : (
                <p>Ready to welcome you on board M/Y Whiskey to ensure a safe, dynamic, and unforgettable luxury experience.</p>
              )}
            </div>
          </div>

          {/* Certifications Card Grid */}
          {certs.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.65rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                Licenses & Professional Credentials
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {certs.map((cert: string, idx: number) => (
                  <div 
                    key={idx} 
                    style={{ 
                      background: '#1E2124', 
                      border: '1px solid rgba(255, 255, 255, 0.05)', 
                      borderRadius: '8px', 
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {getCertIcon(cert)}
                    <span style={{ color: '#F4F1EA', fontSize: '0.85rem', fontWeight: 600 }}>
                      {cert}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hosted Experiences / Adventures portfolio */}
          {linkedAdventures.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.65rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem' }}>
                Experiences Hosted by {item.title.split(' ')[1] || item.title}
              </h2>
              <style dangerouslySetInnerHTML={{__html: `
                .adventure-hosted-card:hover {
                  transform: translateY(-3px);
                  border-color: rgba(185, 120, 59, 0.4) !important;
                  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
                }
              `}} />
              <SwipeScrollContainer
                active={true}
                gridTemplateColumns="repeat(auto-fit, minmax(260px, 1fr))"
                gap="1.5rem"
                arrowColor="#B9783B"
              >
                {linkedAdventures.map((adv: any) => (
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
                        Adventure
                      </span>
                      <h4 style={{ fontSize: '1.15rem', color: 'white', fontWeight: 600, margin: '0 0 0.5rem 0', fontFamily: "'Cormorant Garamond', serif", flex: 1 }}>
                        {adv.title}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7 }}>
                          <Clock size={12} color="#B9783B" />
                          <span>{adv.duration || 'Flexible'}</span>
                        </div>
                        {adv.basePrice > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.7, marginLeft: 'auto' }}>
                            <span style={{ color: '#B9783B', fontWeight: 600 }}>From {formatCost(adv.basePrice)}</span>
                          </div>
                        )}
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#B9783B', fontWeight: 600, marginTop: '0.75rem' }}>
                        View Charter Details <ArrowRight size={12} />
                      </span>
                    </div>
                  </a>
                ))}
              </SwipeScrollContainer>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

