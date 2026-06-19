import { loadPageData, loadSiteSettings } from '@/lib/db';
import { DEFAULT_THEME } from '@/lib/pageTemplates';
import PublicNavigation from '@/components/public/PublicNavigation';
import PublicFooter from '@/components/public/PublicFooter';
import ContactFormClient from '@/components/public/ContactFormClient';
import React from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact Concierge | M/Y Whiskey',
  description: 'Get in touch with our charter coordinators to plan your voyage aboard M/Y Whiskey.',
};

export default async function ContactPage() {
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
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--color-background)',
        '--color-background': theme.backgroundColor,
        '--color-foreground': theme.foregroundColor,
        '--color-primary': theme.primaryColor,
        '--color-surface': theme.surfaceColor,
        '--color-muted': theme.mutedColor,
        '--color-accent': theme.accentColor,
        '--color-border': 'rgba(255, 255, 255, 0.1)',
        fontFamily: theme.typography?.bodyFontFamily || "'Inter', sans-serif",
        color: 'var(--color-foreground)',
        display: 'flex',
        flexDirection: 'column',
      } as React.CSSProperties}
    >
      <PublicNavigation theme={theme} settings={siteSettings} />
      <ContactFormClient settings={siteSettings} theme={theme} />
      <PublicFooter theme={theme} />
    </main>
  );
}
