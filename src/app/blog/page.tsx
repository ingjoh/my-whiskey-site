'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBlogPosts, getBlogSettings, BlogPost, BlogSettings } from '@/lib/db';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export default function BlogListingPage() {
  const { settings: siteSettings } = useSiteSettings();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [blogSettings, setBlogSettings] = useState<BlogSettings>({ globalTheme: 'dark', updatedAt: '' });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const loadedPosts = await getBlogPosts('published');
        // Filter out future scheduled posts if they haven't been processed yet
        const todayStr = new Date().toISOString().split('T')[0];
        const publishedPosts = loadedPosts.filter(p => p.publishDate <= todayStr);
        
        const loadedSettings = await getBlogSettings();
        setPosts(publishedPosts);
        setBlogSettings(loadedSettings);
      } catch (err) {
        console.error('Error loading blog posts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const theme = siteSettings?.theme;
  const isDark = theme ? (theme.backgroundColor === '#0a0a0a' || theme.backgroundColor === '#121416' || theme.backgroundColor === '#1F2326') : (blogSettings.globalTheme === 'dark');

  const themeStyles = {
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    titleColor: 'var(--color-foreground)',
    subtitleColor: 'var(--color-muted)',
    cardBackground: 'var(--color-surface)',
    cardBorder: 'var(--color-border)',
    cardShadow: isDark 
      ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
      : '0 4px 20px rgba(136, 100, 71, 0.06)',
    mutedText: 'var(--color-muted)',
    primaryColor: 'var(--color-primary)'
  };

  const calculateReadTime = (content: string) => {
    const words = content ? content.split(/\s+/).length : 0;
    const mins = Math.max(1, Math.ceil(words / 225));
    return `${mins} min read`;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: themeStyles.background,
      color: themeStyles.color,
      fontFamily: 'var(--font-sans)',
      transition: 'background 0.3s ease, color 0.3s ease',
      '--color-background': theme?.backgroundColor || (isDark ? '#0a0a0a' : '#fcfbf9'),
      '--color-foreground': theme?.foregroundColor || (isDark ? '#ededed' : '#1a1a1a'),
      '--color-primary': theme?.primaryColor || '#B9783B',
      '--color-surface': theme?.surfaceColor || (isDark ? '#171717' : '#ffffff'),
      '--color-muted': theme?.mutedColor || (isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'),
      '--color-accent': theme?.accentColor || '#708C84',
      '--color-border': isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
      '--font-heading': theme?.typography?.headingFontFamily || "'Cormorant Garamond', serif",
      '--font-sans': theme?.typography?.bodyFontFamily || "'Inter', sans-serif",
    } as React.CSSProperties}>
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
      {/* Renders global navigation bar */}
      <PublicNavigation theme={theme} settings={siteSettings} />

      <main style={{ flex: 1, padding: '5rem 2rem max(6rem, 10vw)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          {/* Header Banner */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span style={{ 
              color: themeStyles.primaryColor, 
              fontSize: '0.8rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.15em',
              display: 'inline-block',
              marginBottom: '0.75rem'
            }}>
              Journal & Insights
            </span>
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
              fontWeight: 800, 
              fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
              color: themeStyles.titleColor,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '1rem'
            }}>
              The Whiskey Logbook
            </h1>
            <p style={{ 
              fontSize: 'clamp(1rem, 2.5vw, 1.2rem)', 
              color: themeStyles.subtitleColor,
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: 1.5,
              fontWeight: 400
            }}>
              Discover exclusive yacht itineraries, local Destin insights, deep-sea fishing advice, and luxury travel guides.
            </p>
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: `3px solid ${themeStyles.cardBorder}`, 
                borderTop: `3px solid ${themeStyles.primaryColor}`, 
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', background: themeStyles.cardBackground, borderRadius: '8px', border: `1px solid ${themeStyles.cardBorder}` }}>
              <span style={{ fontSize: '1.2rem', opacity: 0.6 }}>No published logs found. Please check back later.</span>
            </div>
          ) : (
            /* Responsive Grid */
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
              gap: '2.5rem'
            }}>
              {posts.map((post) => {
                const readTime = calculateReadTime(post.content);
                const publishDateFormatted = new Date(post.publishDate + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });

                return (
                  <article 
                    key={post.id} 
                    style={{ 
                      background: themeStyles.cardBackground, 
                      borderRadius: 'var(--radius-lg, 8px)', 
                      border: `1px solid ${themeStyles.cardBorder}`,
                      boxShadow: themeStyles.cardShadow,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.boxShadow = isDark 
                        ? '0 12px 30px rgba(217, 119, 6, 0.08)' 
                        : '0 12px 30px rgba(136, 100, 71, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = themeStyles.cardShadow;
                    }}
                  >
                    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      {/* Hero Image Container */}
                      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#1e2326', overflow: 'hidden' }}>
                        {post.heroImage ? (
                          <img 
                            src={post.heroImage} 
                            alt={post.title} 
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>M/Y Whiskey</span>
                          </div>
                        )}
                        
                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {post.tags.slice(0, 2).map((t, tIdx) => (
                              <span key={tIdx} style={{ 
                                background: 'rgba(185, 120, 59, 0.9)', 
                                color: 'white', 
                                fontSize: '0.625rem', 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px',
                                letterSpacing: '0.05em'
                              }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          {/* Metadata */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: themeStyles.mutedText, marginBottom: '0.75rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              {publishDateFormatted}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={12} />
                              {readTime}
                            </span>
                          </div>

                          {/* Title */}
                          <h2 style={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 700, 
                            color: themeStyles.titleColor,
                            lineHeight: 1.3,
                            marginBottom: '0.75rem',
                            fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
                            letterSpacing: '-0.01em'
                          }}>
                            {post.title}
                          </h2>

                          {/* Summary */}
                          <p style={{ 
                            fontSize: '0.85rem', 
                            color: themeStyles.mutedText,
                            lineHeight: 1.5,
                            marginBottom: '1.5rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {post.summary}
                          </p>
                        </div>

                        {/* Read More Link */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem', 
                          color: themeStyles.primaryColor, 
                          fontSize: '0.8rem', 
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Read Log
                          <ArrowRight size={14} />
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}

        </div>
      </main>

      {/* Renders global footer */}
      <PublicFooter theme={theme} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
