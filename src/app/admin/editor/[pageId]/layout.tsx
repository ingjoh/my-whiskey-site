'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BuilderLeftPanel from '@/components/builder/BuilderLeftPanel';
import BuilderRightPanel from '@/components/builder/BuilderRightPanel';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import { savePageData, loadPageData, loadSiteSettings, saveTemplateData, loadTemplateData, getAllPagesWithMetadata, getAllTemplates } from '@/lib/db';
import { useBuilderStore } from '@/store/useBuilderStore';
import { ArrowLeft, Eye, Edit3, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { PreviewModal } from '@/components/builder/PreviewModal';

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pageId = (params.pageId as string) || 'home';
  const router = useRouter();
  
  const isTemplate = pageId.startsWith('template-');
  const actualId = isTemplate ? pageId.replace('template-', '') : pageId;
  
  const { nodes, theme, setStoreData, selectNode, setBrandColors } = useBuilderStore();
  const [pageTitle, setPageTitle] = useState('');
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'success' | 'error'>('idle');
  const [isHydrating, setIsHydrating] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [availablePages, setAvailablePages] = useState<any[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Load existing data on mount based on dynamic pageId
  useEffect(() => {
    setIsHydrating(true);

    // Hydrate global brand configurations
    loadSiteSettings().then(settings => {
      if (settings?.brand?.colors) {
        setBrandColors(settings.brand.colors);
      }
    });

    getAllPagesWithMetadata().then(setAvailablePages);
    getAllTemplates().then(setAvailableTemplates);

    const dataPromise = isTemplate ? loadTemplateData(actualId) : loadPageData(pageId);
    const homePromise = loadPageData('home');

    Promise.all([dataPromise, homePromise]).then(([data, homeData]) => {
      const homeTheme = homeData?.theme;
      if (data && data.nodes) {
        setPageTitle(data.title || (isTemplate ? actualId : pageId));
        const defaultTheme = {
          backgroundColor: '#1F2326',
          foregroundColor: '#F4F1EA',
          primaryColor: '#B9783B',
          surfaceColor: '#1E3A4C',
          mutedColor: '#D8C7AF',
          accentColor: '#708C84',
          typography: {
            headingFontFamily: "'Cormorant Garamond', serif",
            bodyFontFamily: "'Inter', sans-serif",
            h1: { fontSize: '3.5rem', fontWeight: '800' },
            h2: { fontSize: '2.5rem', fontWeight: '700' },
            h3: { fontSize: '1.5rem', fontWeight: '600' },
            p: { fontSize: '1.1rem', fontWeight: '400' },
            small: { fontSize: '0.875rem', fontWeight: '400' },
            a: { fontSize: '1rem', fontWeight: '600' },
          },
          styles: {
            radius: '0.5rem',
            padding: '4rem 2rem',
          },
          header: { logoText: 'M/Y Whiskey', links: [] },
          footer: { text: 'Footer', links: [] }
        };
        const loadedTheme = data.theme || {};
        const mergedTheme = {
          ...defaultTheme,
          ...loadedTheme,
          typography: loadedTheme.typography || defaultTheme.typography,
          styles: loadedTheme.styles || defaultTheme.styles,
          header: homeTheme?.header || loadedTheme.header || defaultTheme.header,
          footer: homeTheme?.footer || loadedTheme.footer || defaultTheme.footer,
        };
        setStoreData({ nodes: data.nodes, theme: mergedTheme });
      } else {
        // If it's a new page or template, initialize with empty root
        setPageTitle(isTemplate ? actualId : pageId);
        setStoreData({
          nodes: {
            root: { id: 'root', type: 'Section', props: { style: { minHeight: '100px', padding: '2rem' } }, children: [] }
          },
          theme: {
            backgroundColor: '#1F2326',
            foregroundColor: '#F4F1EA',
            primaryColor: '#B9783B',
            surfaceColor: '#1E3A4C',
            mutedColor: '#D8C7AF',
            accentColor: '#708C84',
            typography: {
              headingFontFamily: "'Cormorant Garamond', serif",
              bodyFontFamily: "'Inter', sans-serif",
              h1: { fontSize: '3.5rem', fontWeight: '800' },
              h2: { fontSize: '2.5rem', fontWeight: '700' },
              h3: { fontSize: '1.5rem', fontWeight: '600' },
              p: { fontSize: '1.1rem', fontWeight: '400' },
              small: { fontSize: '0.875rem', fontWeight: '400' },
              a: { fontSize: '1rem', fontWeight: '600' },
            },
            styles: {
              radius: '0.5rem',
              padding: '4rem 2rem',
            },
            header: homeTheme?.header || { logoText: 'M/Y Whiskey', links: [] },
            footer: homeTheme?.footer || { text: 'Footer', links: [] }
          }
        });
      }
      setIsHydrating(false);
    });
  }, [pageId, isTemplate, actualId, setStoreData]);

  if (isHydrating) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#121416', color: '#F4F1EA' }}>
        <p>Loading Editor...</p>
      </div>
    );
  }

  const handlePublish = async () => {
    setPublishStatus('publishing');
    try {
      if (isTemplate) {
        await saveTemplateData(actualId, pageTitle, nodes, theme);
      } else {
        await savePageData(pageId, nodes, theme, pageTitle, true);
      }
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 2500);
    } catch (error) {
      console.error(error);
      setPublishStatus('error');
      setTimeout(() => setPublishStatus('idle'), 3500);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <BuilderLeftPanel />

      {/* Main Builder Canvas Area (Center) */}
      <main style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--color-background)', position: 'relative' }}>
        {/* Admin Header */}
        <header style={{ height: 'var(--builder-header-height)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', background: 'var(--color-surface)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/admin" style={{ color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-foreground)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-muted)'}>
              <ArrowLeft size={16} /> Dashboard
            </Link>
            <div style={{ borderLeft: '1px solid var(--color-border)', height: '20px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                {isTemplate ? 'Template Name:' : 'Page Title:'}
              </span>
              
              {!isEditingTitle ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={pageId}
                      onChange={e => {
                        const selectedId = e.target.value;
                        if (selectedId !== pageId) {
                          router.push(`/admin/editor/${selectedId}`);
                        }
                      }}
                      style={{
                        appearance: 'none',
                        background: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                        color: 'var(--color-foreground)',
                        padding: '0.35rem 2rem 0.35rem 0.6rem',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                        maxWidth: '220px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
                    >
                      <optgroup label="Pages">
                        {availablePages.map(p => (
                          <option key={p.id} value={p.id}>{p.title || p.id}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Templates">
                        {availableTemplates.map(t => (
                          <option key={`template-${t.id}`} value={`template-${t.id}`}>{t.name || t.id}</option>
                        ))}
                      </optgroup>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-muted)' }} />
                  </div>
                  <button 
                    onClick={() => setIsEditingTitle(true)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem', borderRadius: '4px', transition: 'all 0.15s' }}
                    title="Rename Page"
                    onMouseOver={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseOut={e => { e.currentTarget.style.color = 'var(--color-muted)'; e.currentTarget.style.background = 'transparent' }}
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  autoFocus
                  value={pageTitle}
                  onChange={e => setPageTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={e => { if (e.key === 'Enter') setIsEditingTitle(false); }}
                  style={{
                    background: 'var(--color-background)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: '4px',
                    color: 'var(--color-foreground)',
                    padding: '0.35rem 0.6rem',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    outline: 'none',
                    width: '200px',
                    transition: 'border-color 0.15s'
                  }}
                />
              )}

              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', opacity: 0.8, fontFamily: 'monospace', marginLeft: '0.25rem' }}>
                ({isTemplate ? `template-${actualId}` : `/${pageId}`})
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => setIsPreviewOpen(true)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--color-foreground)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--color-background)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-foreground)'; }}
            >
              <Eye size={16} /> Preview
            </button>
            <button 
              onClick={handlePublish}
              disabled={publishStatus === 'publishing' || publishStatus === 'success'}
              style={{ 
                padding: '0.5rem 1rem', 
                background: publishStatus === 'success' ? '#10b981' : publishStatus === 'error' ? '#ef4444' : publishStatus === 'publishing' ? 'var(--color-muted)' : 'var(--color-primary)', 
                color: 'white', 
                borderRadius: 'var(--radius-md)',
                cursor: (publishStatus === 'publishing' || publishStatus === 'success') ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: '110px',
                justifyContent: 'center',
                border: 'none'
              }}
            >
              {publishStatus === 'publishing' && 'Publishing...'}
              {publishStatus === 'success' && 'Published!'}
              {publishStatus === 'error' && 'Error'}
              {publishStatus === 'idle' && 'Publish'}
            </button>
          </div>
        </header>

        {/* Builder Content Context */}
        <div 
          id="editor-scroll-container"
          style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '2rem' }}
          onClick={() => selectNode(null)}
        >
          <div 
            style={{ 
              position: 'relative', // Necessary for PublicNavigation absolute positioning
              width: '100%', 
              maxWidth: '1200px', 
              margin: '0 auto',
              background: 'var(--color-background)', 
              minHeight: '100%', 
              boxShadow: 'var(--shadow-xl)', 
              borderRadius: 'var(--radius-md)', 
              display: 'flex',
              flexDirection: 'column',
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
              
              fontFamily: 'var(--font-sans)'
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
            <PublicNavigation theme={theme} isEditorMode={true} />
            <div style={{ flex: 1 }}>
              {children}
            </div>
            <PublicFooter theme={theme} />
          </div>
        </div>
      </main>

      <BuilderRightPanel />

      {/* Live Preview Modal */}
      {isPreviewOpen && <PreviewModal onClose={() => setIsPreviewOpen(false)} />}
    </div>
  );
}
