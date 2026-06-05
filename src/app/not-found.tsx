'use client';

import Link from 'next/link';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';

export default function NotFound() {
  const { settings } = useSiteSettings();

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--color-background, #0a0a0a)',
      color: 'var(--color-foreground, #f5f5f5)',
      fontFamily: 'var(--font-sans)'
    }}>
      <PublicNavigation isEditorMode={false} />
      
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '600px' }}>
          <h1 style={{ 
            fontSize: 'clamp(4rem, 10vw, 8rem)', 
            fontWeight: 800, 
            lineHeight: 1, 
            color: 'var(--color-primary, #c05c08)',
            marginBottom: '1rem',
            fontFamily: 'var(--font-heading)'
          }}>
            404
          </h1>
          <h2 style={{ 
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', 
            fontWeight: 600, 
            marginBottom: '2rem',
            fontFamily: 'var(--font-heading)'
          }}>
            Page Not Found
          </h2>
          <p style={{ 
            fontSize: '1.1rem', 
            color: 'var(--color-muted, #a3a3a3)', 
            marginBottom: '3rem',
            lineHeight: 1.6
          }}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '1rem 2.5rem',
              background: 'var(--color-primary, #c05c08)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm, 0.25rem)',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              transition: 'opacity 0.2s'
            }}>
              Return Home
            </button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
