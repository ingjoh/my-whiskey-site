import { PageNode, ThemeConfig } from '@/store/useBuilderStore';
import { saveTemplateData } from './db';

export const DEFAULT_THEME: ThemeConfig = {
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
    h1Mobile: { fontSize: '2.25rem', fontWeight: '800' },
    h2: { fontSize: '2.5rem', fontWeight: '700' },
    h2Mobile: { fontSize: '1.75rem', fontWeight: '700' },
    h3: { fontSize: '1.5rem', fontWeight: '600' },
    h3Mobile: { fontSize: '1.25rem', fontWeight: '600' },
    p: { fontSize: '1rem', fontWeight: '400' },
    pMobile: { fontSize: '0.925rem', fontWeight: '400' },
    large: { fontSize: '1.2rem', fontWeight: '400' },
    largeMobile: { fontSize: '1.1rem', fontWeight: '400' },
    small: { fontSize: '0.825rem', fontWeight: '400' },
    smallMobile: { fontSize: '0.775rem', fontWeight: '400' },
    a: { fontSize: '0.95rem', fontWeight: '600' },
    aMobile: { fontSize: '0.875rem', fontWeight: '600' },
  },
  styles: {
    radius: '0.5rem',
    padding: '4rem 2rem',
  },
  header: {
    logoText: 'M/Y Whiskey',
    links: [
      { label: 'Home', url: '/' },
      { label: 'The Fleet', url: '/fleet' },
      { label: 'Contact Us', url: '/contact' }
    ]
  },
  footer: {
    text: '© 2026 M/Y Whiskey. All rights reserved.',
    links: [
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Privacy Policy', url: '/privacy' }
    ]
  }
};

export interface PageTemplate {
  id: string;
  title: string;
  nodes: Record<string, PageNode>;
  theme: ThemeConfig;
}

export const TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    theme: DEFAULT_THEME,
    nodes: {
      'root': {
        id: 'root',
        type: 'Section',
        props: {
          style: {
            minHeight: '100px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--color-background)',
          }
        },
        children: []
      }
    }
  },
  {
    id: 'landing',
    title: 'Landing Page',
    theme: DEFAULT_THEME,
    nodes: {
      'root': {
        id: 'root',
        type: 'Section',
        props: {
          style: {
            minHeight: '100%',
            padding: '0px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            background: 'var(--color-background)',
          }
        },
        children: ['hero-1', 'specs-1', 'testimonials-1']
      },
      'hero-1': {
        id: 'hero-1',
        type: 'Hero',
        props: {
          headline: 'M/Y Whiskey',
          subheadline: 'Experience unparalleled luxury and adventure on the open seas.',
          buttonText: 'Book a Charter',
          bgImage: 'https://images.unsplash.com/photo-1567664724217-105dfbc5ec3a?w=1600&q=80',
          overlayOpacity: 0.6
        },
        children: []
      },
      'specs-1': {
        id: 'specs-1',
        type: 'Specs',
        props: {
          length: '120 ft / 36.5 m',
          cabins: '5 Luxury Staterooms',
          guests: 'Up to 10 Guests',
          speed: 'Cruising 15 knots, Max 22 knots'
        },
        children: []
      },
      'testimonials-1': {
        id: 'testimonials-1',
        type: 'Testimonials',
        props: {
          title: 'Guest Experiences',
          quotes: [
            { text: 'An absolutely unforgettable week. The crew went above and beyond for our family. The vessel is stunning.', author: '— The Harrison Family, UK' },
            { text: 'The attention to detail was extraordinary. From the cuisine to the itinerary, everything was perfect.', author: '— Dr. & Mrs. Chen, Hong Kong' },
            { text: 'We have chartered many yachts, but M/Y Whiskey stands apart. Pure elegance on the water.', author: '— Roberto Ferraro, Italy' },
          ]
        },
        children: []
      }
    }
  },
  {
    id: 'gallery-showcase',
    title: 'Gallery Showcase',
    theme: DEFAULT_THEME,
    nodes: {
      'root': {
        id: 'root',
        type: 'Section',
        props: {
          style: {
            minHeight: '100%',
            padding: '0px',
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            background: 'var(--color-background)',
          }
        },
        children: ['video-hero-1', 'gallery-1', 'amenities-1', 'booking-1']
      },
      'video-hero-1': {
        id: 'video-hero-1',
        type: 'VideoHero',
        props: {
          headline: 'M/Y Whiskey',
          subheadline: 'Life at sea, reimagined.',
          buttonText: 'Enquire Now',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          overlayOpacity: 0.55,
          loop: true,
          startTime: 0,
          endTime: null,
          playbackSpeed: 1.0
        },
        children: []
      },
      'gallery-1': {
        id: 'gallery-1',
        type: 'Gallery',
        props: {
          title: 'Explore the Vessel',
          images: [
            'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
            'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80',
            'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80',
          ]
        },
        children: []
      },
      'amenities-1': {
        id: 'amenities-1',
        type: 'Amenities',
        props: {
          title: 'On Board Amenities',
          features: [
            { icon: 'Wifi', title: 'High-Speed WiFi', description: 'Stay connected anywhere on the water.' },
            { icon: 'Waves', title: 'Water Toys', description: 'Jet skis, paddleboards, and snorkel gear included.' },
            { icon: 'Utensils', title: 'Private Chef', description: 'Gourmet meals prepared fresh on board.' },
            { icon: 'Wind', title: 'Air Conditioning', description: 'Individually controlled in each stateroom.' },
          ]
        },
        children: []
      },
      'booking-1': {
        id: 'booking-1',
        type: 'BookingForm',
        props: {},
        children: []
      }
    }
  }
];

/**
 * Seeds the default templates into Firestore.
 */
export async function seedTemplates() {
  try {
    for (const template of TEMPLATES) {
      await saveTemplateData(template.id, template.title, template.nodes, template.theme);
    }
    console.log('Successfully seeded default templates in Firestore.');
    return true;
  } catch (error) {
    console.error('Error seeding templates:', error);
    return false;
  }
}
