'use client';

import Link from 'next/link';
import { SmartLink } from '@/components/SmartLink';
import { usePathname } from 'next/navigation';
import { Anchor, X, ChevronDown, ExternalLink, Menu } from 'lucide-react';
import { ThemeConfig } from '@/store/useBuilderStore';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import WeatherWidget from './WeatherWidget';
import { getContentItems, getContentTypeConfigs } from '@/lib/db';
import NotificationBell from '@/components/admin/NotificationBell';

export default function PublicNavigation({ theme, settings: propSettings, isEditorMode = false }: { theme?: ThemeConfig; settings?: any; isEditorMode?: boolean }) {
  const { settings: contextSettings } = useSiteSettings();
  const settings = propSettings || contextSettings;
  const pathname = usePathname();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const logoText = theme?.header?.logoText || settings?.general?.siteName || 'M/Y Whiskey';
  const defaultLinks = useMemo(() => [
    { label: 'Home', url: '/' },
    { label: 'The Fleet', url: '/fleet' },
    { label: 'Contact Us', url: '/contact' }
  ], []);

  const links = useMemo(() => {
    const rawLinks = settings?.navigation?.links || theme?.header?.links || defaultLinks;
    return rawLinks.map((l: any) => ({
      ...l,
      url: l.url || l.link || '#'
    }));
  }, [settings, theme, defaultLinks]);

  const [dynamicLinks, setDynamicLinks] = useState<any[]>(links);
  const lastLinksStrRef = useRef<string>('');

  useEffect(() => {
    const currentLinksStr = JSON.stringify(links);
    if (lastLinksStrRef.current === currentLinksStr) {
      return;
    }
    lastLinksStrRef.current = currentLinksStr;

    let isMounted = true;
    async function loadDynamic() {
      try {
        const configs = await getContentTypeConfigs();
        const activeConfigs = configs.filter(c => c.isEnabled && c.isPublic !== false);
        
        // Fetch all content items once in a single query
        const allItems = await getContentItems();
        
        if (!isMounted) return;

        const updatedLinks = links.map((link: any) => {
          if (!link.dynamicSublinks) return link;
          
          const matchedConfig = activeConfigs.find(c => c.id === link.dynamicSublinks || c.slugPrefix === link.dynamicSublinks);
          if (!matchedConfig) return link;

          const filteredItems = allItems.filter(
            item => (item.contentType === link.dynamicSublinks || item.contentType === matchedConfig.id) && item.status === 'published'
          );

          const allLink = {
            label: `All ${matchedConfig.pluralName || (matchedConfig.name + 's')}`,
            url: `/${matchedConfig.slugPrefix}`,
            isAllLink: true
          };

          const autoSublinks = [
            allLink,
            ...filteredItems.map(item => ({
              label: item.title,
              url: `/${matchedConfig.slugPrefix}/${item.slug}`,
              heroImage: item.heroImage || null
            }))
          ];

          const existingChildren = link.children || [];
          return {
            ...link,
            url: (link.url && link.url !== '#' && link.url !== '') ? link.url : `/${matchedConfig.slugPrefix}`,
            children: [...existingChildren, ...autoSublinks]
          };
        });

        if (isMounted) {
          setDynamicLinks(updatedLinks);
        }
      } catch (err) {
        console.error('Error fetching dynamic sublinks:', err);
      }
    }

    if (links.some((l: any) => l.dynamicSublinks)) {
      loadDynamic();
    } else {
      setDynamicLinks(links);
    }

    return () => { isMounted = false; };
  }, [links]);

  const isSticky = theme?.header?.sticky;
  const fullWidth = theme?.header?.fullWidth !== false;
  // Use relative to push content down when not sticky, and sticky when it is sticky.
  const positionStyle = isSticky ? 'sticky' : 'relative';

  // Scroll listener for sticky fade effect
  useEffect(() => {
    if (!isSticky) return;

    // In Editor/Preview modes, the scrolling happens on specific container divs instead of window
    const container = document.getElementById('preview-scroll-container') 
                   || document.getElementById('editor-scroll-container') 
                   || window;

    const handleScroll = () => {
      let scrollTop = 0;
      if (container === window) {
        scrollTop = window.scrollY;
      } else {
        scrollTop = (container as HTMLElement).scrollTop;
      }
      setIsScrolled(scrollTop > 20);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isSticky]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .desktop-nav { display: flex; gap: 1.25rem; align-items: center; }
        .mobile-nav-toggle { display: none; align-items: center; justify-content: center; background: transparent; border: none; color: ${theme?.header?.textColor || 'white'}; cursor: pointer; padding: 0.5rem; }
        .mobile-weather-widget { display: none; }
        @media (max-width: 1024px) {
          .desktop-nav { display: none !important; }
          .mobile-nav-toggle { display: flex !important; }
          .mobile-weather-widget { display: block !important; }
        }
      `}} />
      <header style={{
        position: positionStyle as any,
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 1000,
        background: (isSticky && isScrolled)
          ? (theme?.header?.bgColor ? `${theme.header.bgColor}e6` : 'rgba(0,0,0,0.2)')
          : (theme?.header?.bgColor || 'var(--color-surface, #171717)'),
        backdropFilter: (isSticky && isScrolled) ? 'blur(8px)' : 'none',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease'
      }}>
        <nav style={{ 
          width: '100%',
          maxWidth: fullWidth ? 'none' : '1200px',
          margin: '0 auto',
          padding: fullWidth ? '1.5rem 3rem' : '1.5rem 2rem',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
        }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {settings?.brand?.logoRectUrl ? (
            <img 
              src={settings.brand.logoRectUrl} 
              alt={logoText} 
              style={{ height: '42px', width: 'auto', minWidth: '42px', objectFit: 'contain', display: 'block' }} 
            />
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '1.25rem', color: theme?.header?.textColor || 'white' }}>
              <Anchor size={24} color={theme?.header?.accentColor || 'var(--color-primary, #B9783B)'} /> {logoText}
            </span>
          )}
        </Link>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {theme?.header?.showWeather && (
            <div className="mobile-weather-widget">
              <WeatherWidget location={theme.header.weatherLocation || 'Destin, FL, USA'} />
            </div>
          )}
          <button className="mobile-nav-toggle" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={28} />
          </button>
        </div>

        <div className="desktop-nav">
          {dynamicLinks.map((link: any, idx: number) => {
            const hasChildren = (link.children && link.children.length > 0) || !!link.dynamicSublinks;
            const isPrimary = link.linkStyle === 'primary';
            const isSecondary = link.linkStyle === 'secondary';
            const isText = !isPrimary && !isSecondary;

            let linkStyle: any = {
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
              cursor: 'pointer',
              display: 'inline-block'
            };

            if (isText) {
              linkStyle = {
                ...linkStyle,
                color: theme?.header?.textColor || 'white',
                textTransform: 'uppercase',
                borderBottom: pathname === link.url ? `2px solid ${theme?.header?.accentColor || 'var(--color-primary, #c05c08)'}` : '2px solid transparent',
                paddingBottom: '0.25rem',
              };
            } else if (isPrimary) {
              linkStyle = {
                ...linkStyle,
                background: theme?.header?.accentColor || 'var(--color-primary, #c05c08)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm, 0.25rem)',
                border: `1px solid ${theme?.header?.accentColor || 'var(--color-primary, #c05c08)'}`,
              };
            } else if (isSecondary) {
              linkStyle = {
                ...linkStyle,
                background: 'transparent',
                color: theme?.header?.textColor || 'white',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm, 0.25rem)',
                border: `1px solid ${theme?.header?.textColor || 'white'}`,
              };
            }

            if (hasChildren) {
              return (
                <div 
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ position: 'relative', display: 'inline-block' }}
                >
                  <SmartLink 
                    href={isEditorMode ? '#' : link.url}
                    target={link.target}
                    onClick={(e: any) => {
                      if (isEditorMode) {
                        e.preventDefault();
                        if (link.url && link.url !== '#') {
                          window.open(link.url, '_blank');
                        }
                      }
                    }}
                    style={{
                      ...linkStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      paddingBottom: '0.25rem',
                      borderBottom: (hoveredIdx === idx || pathname === link.url) ? `2px solid ${theme?.header?.accentColor || 'var(--color-primary, #c05c08)'}` : '2px solid transparent',
                    }}
                    onMouseOver={(e: any) => { 
                      if (isText) {
                        e.currentTarget.style.borderColor = theme?.header?.accentColor || 'var(--color-primary, #c05c08)';
                        e.currentTarget.style.color = theme?.header?.accentColor || 'var(--color-primary, #c05c08)';
                      }
                      if (isPrimary) e.currentTarget.style.opacity = '0.9';
                      if (isSecondary) { 
                        e.currentTarget.style.background = theme?.header?.textColor || 'white'; 
                        e.currentTarget.style.color = theme?.header?.bgColor || 'black'; 
                      }
                    }}
                    onMouseOut={(e: any) => { 
                      if (isText && pathname !== link.url && hoveredIdx !== idx) {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.color = theme?.header?.textColor || 'white';
                      }
                      if (isPrimary) e.currentTarget.style.opacity = '1';
                      if (isSecondary) { 
                        e.currentTarget.style.background = 'transparent'; 
                        e.currentTarget.style.color = theme?.header?.textColor || 'white'; 
                      }
                    }}
                  >
                    <span>{link.label}</span>
                    <ChevronDown size={14} style={{ 
                      transition: 'transform 0.2s', 
                      transform: hoveredIdx === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      opacity: 0.7 
                    }} />
                  </SmartLink>

                  {/* Dropdown Menu */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: idx < dynamicLinks.length / 2 ? 0 : 'auto',
                    right: idx < dynamicLinks.length / 2 ? 'auto' : 0,
                    transform: 'none',
                    paddingTop: '0.75rem',
                    display: hoveredIdx === idx ? 'block' : 'none',
                    zIndex: 100,
                  }}>
                    <div style={{
                      background: '#1E2124',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                      padding: '0.5rem 0',
                      minWidth: '320px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      {link.children && link.children.length > 0 ? (
                        link.children.map((child: any, cIdx: number) => (
                          <SmartLink
                            key={cIdx}
                            href={isEditorMode ? '#' : child.url}
                            target={child.target}
                            onClick={(e: any) => {
                              if (isEditorMode) {
                                e.preventDefault();
                                if (child.url && child.url !== '#') {
                                  window.open(child.url, '_blank');
                                }
                              }
                            }}
                            style={{
                              padding: '0.6rem 1.25rem',
                              color: theme?.header?.textColor ? `${theme.header.textColor}d9` : 'rgba(244, 241, 234, 0.8)',
                              textDecoration: 'none',
                              fontSize: '0.85rem',
                              fontWeight: child.isAllLink ? 700 : 500,
                              transition: 'all 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                            }}
                            onMouseOver={(e: any) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = theme?.header?.accentColor || 'var(--color-primary, #c05c08)';
                            }}
                            onMouseOut={(e: any) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = theme?.header?.textColor ? `${theme.header.textColor}d9` : 'rgba(244, 241, 234, 0.8)';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                              {!child.isAllLink && child.heroImage ? (
                                <img 
                                  src={child.heroImage} 
                                  alt={child.label} 
                                  style={{ 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '4px', 
                                    objectFit: 'cover', 
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    flexShrink: 0
                                  }} 
                                />
                              ) : (
                                !child.isAllLink && (
                                  <div style={{ 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '4px', 
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    color: 'var(--color-muted)',
                                    flexShrink: 0
                                  }}>
                                    ⚓
                                  </div>
                                )
                              )}
                              <span style={{ 
                                color: child.isAllLink ? (theme?.header?.accentColor || 'var(--color-primary, #B9783B)') : 'inherit',
                                fontWeight: child.isAllLink ? 700 : 'inherit'
                              }}>
                                {child.label}
                              </span>
                            </div>
                            {child.target === '_blank' && <ExternalLink size={12} style={{ opacity: 0.5 }} />}
                          </SmartLink>
                        ))
                      ) : (
                        <div style={{ padding: '0.75rem 1.25rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', textAlign: 'center' }}>
                          ⚓ Loading...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <SmartLink 
                key={idx} 
                href={isEditorMode ? '#' : link.url}
                target={link.target}
                onClick={(e: any) => {
                  if (isEditorMode) {
                    e.preventDefault();
                    if (link.url && link.url !== '#') {
                      window.open(link.url, '_blank');
                    }
                    return;
                  }
                }}
                style={linkStyle}
                onMouseOver={(e: any) => { 
                  if (isText) {
                    e.currentTarget.style.borderColor = theme?.header?.accentColor || 'var(--color-primary, #c05c08)';
                    e.currentTarget.style.color = theme?.header?.accentColor || 'var(--color-primary, #c05c08)';
                  }
                  if (isPrimary) e.currentTarget.style.opacity = '0.9';
                  if (isSecondary) { 
                    e.currentTarget.style.background = theme?.header?.textColor || 'white'; 
                    e.currentTarget.style.color = theme?.header?.bgColor || 'black'; 
                  }
                }}
                onMouseOut={(e: any) => { 
                  if (isText && pathname !== link.url) {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.color = theme?.header?.textColor || 'white';
                  }
                  if (isPrimary) e.currentTarget.style.opacity = '1';
                  if (isSecondary) { 
                    e.currentTarget.style.background = 'transparent'; 
                    e.currentTarget.style.color = theme?.header?.textColor || 'white'; 
                  }
                }}
              >
                {link.label}
              </SmartLink>
            );
          })}
          {theme?.header?.showWeather && (
            <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center' }}>
              <WeatherWidget location={theme.header.weatherLocation || 'Destin, FL, USA'} />
            </div>
          )}
          <NotificationBell />
        </div>
      </nav>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: theme?.header?.bgColor || 'var(--color-surface, #171717)',
          zIndex: 100,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
            <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', color: theme?.header?.textColor || 'white', cursor: 'pointer', padding: '0.5rem' }}>
              <X size={32} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
            {dynamicLinks.map((link: any, idx: number) => {
              const hasChildren = (link.children && link.children.length > 0) || !!link.dynamicSublinks;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <SmartLink 
                    href={isEditorMode ? '#' : link.url}
                    target={link.target}
                    onClick={() => {
                      if (!isEditorMode) setMobileMenuOpen(false);
                    }}
                    style={{
                      color: theme?.header?.textColor || 'white',
                      textDecoration: 'none',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {link.label}
                  </SmartLink>
                  {hasChildren && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingLeft: '1.25rem', borderLeft: '2px solid rgba(255, 255, 255, 0.08)' }}>
                      {link.children && link.children.length > 0 ? (
                        link.children.map((child: any, cIdx: number) => (
                          <SmartLink
                            key={cIdx}
                            href={isEditorMode ? '#' : child.url}
                            target={child.target}
                            onClick={() => {
                              if (!isEditorMode) setMobileMenuOpen(false);
                            }}
                            style={{
                              color: theme?.header?.textColor ? `${theme.header.textColor}b3` : 'rgba(255,255,255,0.7)',
                              textDecoration: 'none',
                              fontSize: '0.95rem',
                              fontWeight: 400,
                              lineHeight: 1.3
                            }}
                          >
                            {child.label}
                          </SmartLink>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>⚓ Loading...</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </>
  );
}
