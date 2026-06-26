'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { getBlogPostBySlug, getBlogSettings, getBlogPosts, getContentItems, getContentTypeConfigs, BlogPost, BlogSettings } from '@/lib/db';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import ReactMarkdown from 'react-markdown';
import { Calendar, Clock, ChevronLeft, Anchor } from 'lucide-react';
import { DynamicCardBlock, DynamicBlogBlock } from '@/components/builder/NewBlocks';

export default function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const { slug } = resolvedParams;
  const { settings: siteSettings } = useSiteSettings();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [blogSettings, setBlogSettings] = useState<BlogSettings>({ globalTheme: 'dark', updatedAt: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [relatedAdventures, setRelatedAdventures] = useState<any[]>([]);
  const [allPublishedPosts, setAllPublishedPosts] = useState<BlogPost[]>([]);
  const [experiencesPath, setExperiencesPath] = useState('experiences');

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const loadedPost = await getBlogPostBySlug(slug);
        const loadedSettings = await getBlogSettings();
        
        // Load content type configurations to resolve experiences path dynamically
        try {
          const configs = await getContentTypeConfigs();
          const advConfig = configs.find(c => c.id === 'adventure');
          if (advConfig && advConfig.slugPrefix) {
            setExperiencesPath(advConfig.slugPrefix);
          }
        } catch (configErr) {
          console.warn('Failed to load content type configs on blog detail page:', configErr);
        }
        
        // Hide future scheduled posts or drafts for public users
        const todayStr = new Date().toISOString().split('T')[0];
        let activePost: BlogPost | null = null;
        if (loadedPost && (loadedPost.status === 'published' && loadedPost.publishDate <= todayStr)) {
          activePost = loadedPost;
          setPost(loadedPost);
        } else {
          setPost(null);
        }
        
        setBlogSettings(loadedSettings);

        if (activePost) {
          // Load adventures/experiences
          const allAdventures = await getContentItems('adventure');
          const publishedAdventures = allAdventures.filter(item => item.status === 'published');
          
          let matched = publishedAdventures;
          if (activePost.tags && activePost.tags.length > 0) {
            const postTags = activePost.tags.map(t => t.toLowerCase().trim());
            matched = publishedAdventures.filter(adv => {
              const titleLower = adv.title.toLowerCase();
              const descLower = (adv.shortDescription || '').toLowerCase();
              return postTags.some(tag => titleLower.includes(tag) || descLower.includes(tag));
            });
            if (matched.length === 0) {
              matched = publishedAdventures;
            }
          }
          setRelatedAdventures(matched);

          // Load other blog posts
          const allPosts = await getBlogPosts('published');
          const otherPosts = allPosts.filter(p => p.slug !== slug);
          setAllPublishedPosts(otherPosts);
        }
      } catch (err) {
        console.error('Error loading blog post details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [slug]);

  const theme = siteSettings?.theme;
  const isDark = theme ? (theme.backgroundColor === '#0a0a0a' || theme.backgroundColor === '#121416' || theme.backgroundColor === '#1F2326') : (blogSettings.globalTheme === 'dark');

  const themeStyles = {
    background: 'var(--color-background)',
    color: 'var(--color-foreground)',
    titleColor: 'var(--color-foreground)',
    subtitleColor: 'var(--color-muted)',
    cardBackground: 'var(--color-surface)',
    cardBorder: 'var(--color-border)',
    mutedText: 'var(--color-muted)',
    primaryColor: 'var(--color-primary)'
  };

  const calculateReadTime = (content: string) => {
    const words = content ? content.split(/\s+/).length : 0;
    const mins = Math.max(1, Math.ceil(words / 225));
    return `${mins} min read`;
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: themeStyles.background, color: themeStyles.color }}>
        <PublicNavigation settings={siteSettings} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: `3px solid ${themeStyles.cardBorder}`, 
            borderTop: `3px solid ${themeStyles.primaryColor}`, 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <PublicFooter />
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: themeStyles.background, color: themeStyles.color }}>
        <PublicNavigation settings={siteSettings} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ fontSize: '2rem', fontFamily: "var(--font-heading)" }}>Logbook Entry Not Found</h2>
          <p style={{ opacity: 0.6, margin: '1rem 0 2rem' }}>The article you are looking for does not exist or has not been published.</p>
          <Link href="/blog" style={{ textDecoration: 'none' }}>
            <button style={{ background: themeStyles.primaryColor, color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              Return to Logbook
            </button>
          </Link>
        </div>
        <PublicFooter />
      </div>
    );
  }

  const readTime = calculateReadTime(post.content);
  const publishDateFormatted = new Date(post.publishDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

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
      '--color-foreground': theme?.foregroundColor || (isDark ? '#ededed' : '#2b2d31'),
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
      {/* Navigation */}
      <PublicNavigation theme={theme} settings={siteSettings} />

      <main style={{ flex: 1, padding: '4rem 0 6rem' }}>
        <article style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1.5rem' }}>
          {/* Back button */}
          <Link href="/blog" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            textDecoration: 'none', 
            color: themeStyles.primaryColor, 
            fontSize: '0.85rem', 
            fontWeight: 600,
            marginBottom: '2rem',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <ChevronLeft size={16} />
            Back to Journal
          </Link>

          {/* Article Header */}
          <header style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ 
              fontSize: 'clamp(2rem, 5vw, 3rem)', 
              fontWeight: 800, 
              fontFamily: "var(--font-heading, 'Outfit', sans-serif)",
              color: themeStyles.titleColor,
              lineHeight: 1.15,
              marginBottom: '1rem',
              letterSpacing: '-0.02em'
            }}>
              {post.title}
            </h1>
            
            {post.summary && (
              <p style={{ 
                fontSize: '1.1rem', 
                color: themeStyles.subtitleColor, 
                lineHeight: 1.5,
                marginBottom: '1.5rem',
                fontStyle: 'italic'
              }}>
                {post.summary}
              </p>
            )}

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '1.5rem', 
              fontSize: '0.8rem', 
              color: themeStyles.mutedText,
              borderTop: `1px solid ${themeStyles.cardBorder}`,
              borderBottom: `1px solid ${themeStyles.cardBorder}`,
              padding: '1rem 0'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Calendar size={14} />
                {publishDateFormatted}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={14} />
                {readTime}
              </span>
              {post.authorName && (
                <span>
                  By <strong>{post.authorName}</strong>
                </span>
              )}
            </div>
          </header>

          {/* Hero Banner */}
          {post.heroImage && (
            <div style={{ 
              borderRadius: 'var(--radius-lg, 8px)', 
              overflow: 'hidden', 
              marginBottom: '3rem',
              border: `1px solid ${themeStyles.cardBorder}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}>
              <img 
                src={post.heroImage} 
                alt={post.title} 
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '480px', objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Markdown Content */}
          <div style={{ 
            lineHeight: 1.7, 
            fontSize: '1.05rem', 
            color: themeStyles.color
          }} className="blog-content">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '3rem', borderTop: `1px solid ${themeStyles.cardBorder}`, paddingTop: '1.5rem' }}>
              {post.tags.map((t, idx) => (
                <span key={idx} style={{ 
                  background: 'rgba(185, 120, 59, 0.1)', 
                  border: '1px solid rgba(185, 120, 59, 0.25)',
                  color: themeStyles.primaryColor, 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  textTransform: 'uppercase', 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: '4px',
                  letterSpacing: '0.04em'
                }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Refined Inline booking CTA bar */}
          <div style={{ 
            borderTop: `1px solid ${themeStyles.cardBorder}`, 
            paddingTop: '2.5rem',
            marginTop: '4rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1rem'
          }}>
            <h4 style={{ 
              fontSize: '1.25rem', 
              fontFamily: "var(--font-heading, 'Outfit', sans-serif)", 
              fontWeight: 700, 
              margin: 0,
              letterSpacing: '-0.01em'
            }}>
              Ready to Plan Your Yacht Adventure?
            </h4>
            <p style={{ color: themeStyles.mutedText, fontSize: '0.875rem', maxWidth: '480px', margin: 0, lineHeight: 1.4 }}>
              Contact our charter specialists today to customize your bespoke itinerary aboard M/Y Whiskey.
            </p>
            <Link href={`/${experiencesPath}`} style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
              <button style={{
                background: 'var(--color-primary, #d97706)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.65rem 2rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Inquire & Book Now
              </button>
            </Link>
          </div>
        </article>

        {/* Dynamic Related Experiences Grid */}
        <div style={{ width: '100%', marginTop: '4rem', borderTop: `1px solid ${themeStyles.cardBorder}`, paddingTop: '1rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <DynamicCardBlock 
              node={{
                id: 'related-experiences',
                type: 'dynamic_cards',
                props: {
                  contentType: 'adventure',
                  eyebrow: 'Private Coastal Charters',
                  headline: 'Related Experiences',
                  limit: 3,
                  columns: 3,
                  showImage: true,
                  showTitle: true,
                  showDescription: true,
                  showLocation: true,
                  showDuration: true,
                  showPrice: true,
                  showButton: true,
                  mobileLayout: 'swipe',
                  cardBgColor: themeStyles.cardBackground,
                  cardTextColor: themeStyles.color,
                  eyebrowColor: themeStyles.primaryColor,
                  headlineColor: themeStyles.titleColor,
                  headlineFontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  style: { padding: '3rem 2rem 1rem' }
                }
              } as any} 
              preFetchedItems={relatedAdventures} 
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '3rem' }}>
              <Link href={`/${experiencesPath}`} style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  border: `1px solid ${themeStyles.primaryColor}`,
                  color: themeStyles.primaryColor,
                  borderRadius: '4px',
                  padding: '0.6rem 1.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = themeStyles.primaryColor;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = themeStyles.primaryColor;
                }}
                >
                  View All Experiences
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Dynamic Latest Journal Entries Grid */}
        <div style={{ width: '100%', borderTop: `1px solid ${themeStyles.cardBorder}`, paddingTop: '1rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <DynamicBlogBlock 
              node={{
                id: 'latest-blogs',
                type: 'dynamic_blog',
                props: {
                  layout: 'grid',
                  eyebrow: 'From the Captain\'s Log',
                  headline: 'Latest Journal Entries',
                  limit: 3,
                  columns: 3,
                  showImage: true,
                  showSummary: true,
                  showDate: true,
                  showAuthor: true,
                  showTags: false,
                  showButton: true,
                  mobileLayout: 'swipe',
                  cardBgColor: themeStyles.cardBackground,
                  cardTextColor: themeStyles.color,
                  eyebrowColor: themeStyles.primaryColor,
                  headlineColor: themeStyles.titleColor,
                  buttonText: 'Read Entry',
                  style: { padding: '3rem 2rem 1rem' }
                }
              } as any} 
              preFetchedPosts={allPublishedPosts} 
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
              <Link href="/blog" style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'transparent',
                  border: `1px solid ${themeStyles.primaryColor}`,
                  color: themeStyles.primaryColor,
                  borderRadius: '4px',
                  padding: '0.6rem 1.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = themeStyles.primaryColor;
                  e.currentTarget.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = themeStyles.primaryColor;
                }}
                >
                  View All Journal Entries
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <PublicFooter theme={theme} />

      {/* Inject custom styling to format markdown typography */}
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content h2 {
          font-family: var(--font-heading, 'Outfit', sans-serif);
          font-size: 1.6rem;
          font-weight: 700;
          margin: 2rem 0 1rem;
          color: ${themeStyles.titleColor};
          letter-spacing: -0.01em;
        }
        .blog-content h3 {
          font-family: var(--font-heading, 'Outfit', sans-serif);
          font-size: 1.3rem;
          font-weight: 700;
          margin: 1.75rem 0 0.75rem;
          color: ${themeStyles.titleColor};
          letter-spacing: -0.01em;
        }
        .blog-content p {
          margin-bottom: 1.5rem;
          line-height: 1.75;
          letter-spacing: 0.01em;
        }
        .blog-content ul, .blog-content ol {
          margin: 0 0 1.5rem 1.5rem;
          line-height: 1.7;
        }
        .blog-content li {
          margin-bottom: 0.5rem;
        }
        .blog-content blockquote {
          border-left: 4px solid ${themeStyles.primaryColor};
          padding-left: 1.25rem;
          font-style: italic;
          color: ${themeStyles.color};
          opacity: 0.85;
          margin: 2rem 0;
          font-size: 1.1rem;
        }
        .blog-content strong {
          color: ${themeStyles.titleColor};
        }
      `}} />
    </div>
  );
}
