'use client';

import Link from 'next/link';
import { SmartLink } from '@/components/SmartLink';
import { ThemeConfig } from '@/store/useBuilderStore';
import { useState, useEffect } from 'react';
import { X, Mail, Phone, MapPin } from 'lucide-react';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import { getContentItems, getContentTypeConfigs } from '@/lib/db';

export default function PublicFooter({ theme }: { theme?: ThemeConfig }) {
  const { settings } = useSiteSettings();
  const text = theme?.footer?.text || `© ${new Date().getFullYear()} ${settings?.general?.siteName || 'M/Y Whiskey'}. All rights reserved.`;
  const footerLinks = theme?.footer?.legalLinks || theme?.footer?.links || [
    { label: 'Terms of Service', url: '/terms' },
    { label: 'Privacy Policy', url: '#' }
  ];

  const navLinks = settings?.navigation?.links;
  const [dynamicNavLinks, setDynamicNavLinks] = useState<any[]>(navLinks || []);

  useEffect(() => {
    let isMounted = true;
    async function loadDynamic() {
      try {
        const configs = await getContentTypeConfigs();
        const activeConfigs = configs.filter(c => c.isEnabled && c.isPublic !== false);
        const allItems = await getContentItems();
        
        if (!isMounted) return;

        const currentLinks = navLinks || [];
        const updatedLinks = currentLinks.map((link: any) => {
          if (!link.dynamicSublinks) return link;
          
          const matchedConfig = activeConfigs.find(c => c.id === link.dynamicSublinks);
          if (!matchedConfig) return link;

          const filteredItems = allItems.filter(
            item => item.contentType === link.dynamicSublinks && item.status === 'published'
          );

          const allLink = {
            label: `All ${matchedConfig.pluralName || (matchedConfig.name + 's')}`,
            url: `/${matchedConfig.slugPrefix}`
          };

          const autoSublinks = [
            allLink,
            ...filteredItems.map(item => ({
              label: item.title,
              url: `/${matchedConfig.slugPrefix}/${item.slug}`
            }))
          ];

          const existingChildren = link.children || [];
          return {
            ...link,
            children: [...existingChildren, ...autoSublinks]
          };
        });

        setDynamicNavLinks(updatedLinks);
      } catch (err) {
        console.error('Error fetching dynamic sublinks for footer:', err);
      }
    }

    const currentLinks = navLinks || [];
    if (currentLinks.some((l: any) => l.dynamicSublinks)) {
      loadDynamic();
    } else {
      setDynamicNavLinks(currentLinks);
    }

    return () => { isMounted = false; };
  }, [navLinks]);

  return (
    <>
      <footer style={{
        background: theme?.footer?.bgColor || '#0B0C0E',
        color: theme?.footer?.textColor || '#F4F1EA',
        borderTop: `1px solid ${theme?.footer?.textColor ? theme.footer.textColor + '15' : 'rgba(255, 255, 255, 0.05)'}`,
        padding: '5rem 3rem 3rem 3rem',
        marginTop: 'auto',
        fontFamily: "'Inter', sans-serif"
      }} className="public-footer-section">
        <style dangerouslySetInnerHTML={{ __html: `
          @media (max-width: 767px) {
            .public-footer-section {
              padding: 3rem 1.5rem !important;
            }
            .public-footer-columns-grid {
              gap: 2rem !important;
            }
            .public-footer-bottom-right {
              align-items: flex-start !important;
              text-align: left !important;
            }
          }
        `}} />
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4rem'
        }}>
          {/* Top Row: Brand Info + Site Map Columns */}
          <div className="public-footer-columns-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '3rem',
            alignItems: 'flex-start'
          }}>
            {/* Brand column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '300px' }}>
              {settings?.brand?.logoSquareUrl ? (
                <img 
                  src={settings.brand.logoSquareUrl} 
                  alt="Branding" 
                  style={{ maxHeight: '50px', width: 'auto', objectFit: 'contain', display: 'block' }} 
                />
              ) : (
                <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em', color: theme?.footer?.accentColor || 'var(--color-primary, #B9783B)', fontFamily: "'Cormorant Garamond', serif" }}>
                  {settings?.general?.siteName || 'M/Y Whiskey'}
                </span>
              )}
              {theme?.footer?.description && (
                <p style={{ color: theme?.footer?.textColor || 'var(--color-muted, #D8C7AF)', fontSize: '0.875rem', lineHeight: '1.6', opacity: 0.8 }}>
                  {theme.footer.description}
                </p>
              )}
            </div>

            {/* Contact column */}
            {((theme?.footer?.contact?.phone || settings?.contact?.phone) || 
              (theme?.footer?.contact?.email || settings?.contact?.email) || 
              (theme?.footer?.contact?.address || settings?.contact?.address)) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <span style={{
                  color: theme?.footer?.textColor || 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Contact Us
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: theme?.footer?.textColor || 'var(--color-muted, #D8C7AF)', fontSize: '0.85rem', opacity: 0.8 }}>
                  {(theme?.footer?.contact?.phone || settings?.contact?.phone) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Phone size={16} style={{ color: theme?.footer?.accentColor || 'var(--color-primary, #B9783B)' }} />
                      <a href={`tel:${theme?.footer?.contact?.phone || settings?.contact?.phone}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}>
                        {theme?.footer?.contact?.phone || settings?.contact?.phone}
                      </a>
                    </div>
                  )}
                  {(theme?.footer?.contact?.email || settings?.contact?.email) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Mail size={16} style={{ color: theme?.footer?.accentColor || 'var(--color-primary, #B9783B)' }} />
                      <a href={`mailto:${theme?.footer?.contact?.email || settings?.contact?.email}`} style={{ color: 'inherit', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'}>
                        {theme?.footer?.contact?.email || settings?.contact?.email}
                      </a>
                    </div>
                  )}
                  {(theme?.footer?.contact?.address || settings?.contact?.address) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <MapPin size={16} style={{ color: theme?.footer?.accentColor || 'var(--color-primary, #B9783B)', flexShrink: 0, marginTop: '0.15rem' }} />
                      <span style={{ whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                        {theme?.footer?.contact?.address || settings?.contact?.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sitemap columns */}
            {dynamicNavLinks.map((link: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <SmartLink
                  href={link.url}
                  target={link.target}
                  style={{
                    textDecoration: 'none',
                    color: theme?.footer?.textColor || 'white',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'color 0.2s'
                  }}
                  onMouseOver={(e: any) => e.currentTarget.style.color = theme?.footer?.accentColor || 'var(--color-primary, #B9783B)'}
                  onMouseOut={(e: any) => e.currentTarget.style.color = theme?.footer?.textColor || 'white'}
                >
                  {link.label}
                </SmartLink>

                {/* Sub-items list */}
                {link.children && link.children.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {link.children.map((child: any, cIdx: number) => (
                      <SmartLink
                        key={cIdx}
                        href={child.url}
                        target={child.target}
                        style={{
                          textDecoration: 'none',
                          color: theme?.footer?.textColor || 'var(--color-muted, #D8C7AF)',
                          fontSize: '0.85rem',
                          opacity: 0.8,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseOver={(e: any) => e.currentTarget.style.opacity = '1'}
                        onMouseOut={(e: any) => e.currentTarget.style.opacity = '0.8'}
                      >
                        {child.label}
                      </SmartLink>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Newsletter Column */}
            {theme?.footer?.showNewsletter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '300px' }}>
                <span style={{
                  color: theme?.footer?.textColor || 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Newsletter
                </span>
                <p style={{ color: theme?.footer?.textColor || 'var(--color-muted, #D8C7AF)', fontSize: '0.85rem', lineHeight: '1.5', opacity: 0.8, margin: 0 }}>
                  Subscribe to receive updates, exclusive offers, and early access to bookings.
                </p>
                <form 
                  onSubmit={(e) => { e.preventDefault(); alert('Subscribed! (Wiring required)'); }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
                >
                  <input 
                    type="email" 
                    placeholder="Email Address" 
                    required 
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${theme?.footer?.textColor ? theme.footer.textColor + '33' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '0.375rem',
                      color: theme?.footer?.textColor || 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                    onFocus={(e) => e.target.style.borderColor = theme?.footer?.accentColor || 'var(--color-primary)'}
                    onBlur={(e) => e.target.style.borderColor = theme?.footer?.textColor ? theme.footer.textColor + '33' : 'rgba(255, 255, 255, 0.1)'}
                  />
                  <button 
                    type="submit" 
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem',
                      background: theme?.footer?.accentColor || 'var(--color-primary, #B9783B)',
                      color: '#fff', // Typically white text on buttons
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: theme?.footer?.textColor ? theme.footer.textColor + '15' : 'rgba(255, 255, 255, 0.05)' }} />

          {/* Bottom Row: Social + Copyright + Legal Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            fontSize: '0.8rem',
            color: theme?.footer?.textColor || 'var(--color-muted, #D8C7AF)',
            opacity: 0.8
          }}>
            {/* Social Icons */}
            {((theme?.footer?.social?.facebook || settings?.social?.facebook) || 
              (theme?.footer?.social?.instagram || settings?.social?.instagram) || 
              (theme?.footer?.social?.twitter || settings?.social?.twitter) || 
              (theme?.footer?.social?.linkedin || settings?.social?.linkedin) || 
              (theme?.footer?.social?.youtube || settings?.social?.youtube)) ? (
              <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                {(theme?.footer?.social?.instagram || settings?.social?.instagram) && (
                  <a href={theme?.footer?.social?.instagram || settings?.social?.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'} aria-label="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                  </a>
                )}
                {(theme?.footer?.social?.facebook || settings?.social?.facebook) && (
                  <a href={theme?.footer?.social?.facebook || settings?.social?.facebook} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'} aria-label="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  </a>
                )}
                {(theme?.footer?.social?.twitter || settings?.social?.twitter) && (
                  <a href={theme?.footer?.social?.twitter || settings?.social?.twitter} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'} aria-label="Twitter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                  </a>
                )}
                {(theme?.footer?.social?.linkedin || settings?.social?.linkedin) && (
                  <a href={theme?.footer?.social?.linkedin || settings?.social?.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'} aria-label="LinkedIn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                  </a>
                )}
                {(theme?.footer?.social?.youtube || settings?.social?.youtube) && (
                  <a href={theme?.footer?.social?.youtube || settings?.social?.youtube} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', transition: 'opacity 0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.8'} aria-label="YouTube">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                  </a>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="public-footer-bottom-right" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', textAlign: 'right' }}>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {footerLinks.map((link: any, idx: number) => (
                  <SmartLink
                    key={idx}
                    href={link.url}
                    target={link.target}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'color 0.2s',
                    }}
                    onMouseOver={(e: any) => e.currentTarget.style.color = theme?.footer?.accentColor || 'white'}
                    onMouseOut={(e: any) => e.currentTarget.style.color = 'inherit'}
                  >
                    {link.label}
                  </SmartLink>
                ))}
              </div>
              <div style={{ fontSize: '0.9em', opacity: 0.8 }}>{text}</div>
            </div>
          </div>
        </div>
      </footer>

    </>
  );
}

