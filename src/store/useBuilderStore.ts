import { create } from 'zustand';

export type ComponentType =
  // Elements
  | 'Text' | 'Button' | 'Image' | 'Section'
  | 'Divider' | 'Icon' | 'Video' | 'Map' | 'Html'
  // Blocks
  | 'Hero' | 'VideoHero' | 'Specs' | 'Gallery' | 'DeckPlan' | 'BookingForm'
  | 'Accordion' | 'Amenities' | 'Pricing' | 'Crew' | 'Itinerary' | 'Testimonials'
  | 'EnhancedHero' | 'TextMedia' | 'ExperiencesGrid' | 'YachtFeature' | 'TestimonialsGrid' | 'CTA' | 'ComparisonTable' | 'ContentGrid'
  | 'DynamicCardBlock' | 'DynamicCarousel' | 'BookingWidget' | 'DynamicDetailBlock' | 'DynamicBlogBlock';

export interface PageNode {
  id: string;
  type: ComponentType;
  props: Record<string, any>;
  children: string[]; 
}

export interface NavLink {
  label: string;
  url: string;
  target?: '_self' | '_blank' | 'overlay' | string;
  linkStyle?: 'text' | 'primary' | 'secondary' | string;
  dynamicSublinks?: string | null;
  children?: NavLink[];
}

export interface HeaderConfig {
  logoText: string;
  links: NavLink[];
  sticky?: boolean;
  fullWidth?: boolean;
  showWeather?: boolean;
  weatherLocation?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface FooterConfig {
  text: string;
  links: NavLink[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  description?: string;
  showNewsletter?: boolean;
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  social?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  legalLinks?: { label: string; url: string; target?: '_self' | '_blank' | 'overlay' }[];
}

export interface TypographySettings {
  fontSize: string;
  fontWeight: string;
}

export interface ThemeConfig {
  backgroundColor: string;
  foregroundColor: string;
  primaryColor: string;
  surfaceColor: string;
  mutedColor: string;
  accentColor: string;
  
  typography: {
    headingFontFamily: string;
    bodyFontFamily: string;
    h1: TypographySettings;
    h1Mobile?: TypographySettings;
    h2: TypographySettings;
    h2Mobile?: TypographySettings;
    h3: TypographySettings;
    h3Mobile?: TypographySettings;
    p: TypographySettings;
    pMobile?: TypographySettings;
    large?: TypographySettings;
    largeMobile?: TypographySettings;
    small: TypographySettings;
    smallMobile?: TypographySettings;
    a: TypographySettings;
    aMobile?: TypographySettings;
  };

  styles: {
    radius: string;
    padding: string;
  };

  header: HeaderConfig;
  footer: FooterConfig;
}

interface BuilderState {
  nodes: Record<string, PageNode>;
  rootNodeId: string;
  selectedNodeId: string | null;
  theme: ThemeConfig;
  brandColors: Array<{ name: string; value: string }>;
  addNode: (type: ComponentType, parentId?: string) => void;
  selectNode: (id: string | null) => void;
  updateNodeProps: (id: string, props: Record<string, any>) => void;
  removeNode: (id: string) => void;
  moveNode: (activeId: string, overId: string) => void;
  updateTheme: (themeUpdates: Partial<ThemeConfig>) => void;
  setStoreData: (data: { nodes: Record<string, PageNode>; theme: ThemeConfig }) => void;
  setBrandColors: (colors: Array<{ name: string; value: string }>) => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  nodes: {
    'root': {
      id: 'root',
      type: 'Section',
      props: {
        style: {
          minHeight: '100%',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--color-background)',
        }
      },
      children: [],
    }
  },
  rootNodeId: 'root',
  selectedNodeId: null,
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
      sticky: false,
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
      ],
      bgColor: '#0B0C0E',
      textColor: '#F4F1EA',
      accentColor: '#B9783B',
      description: 'Experience bespoke chartering on the world\'s most luxurious yacht. Crafted for ultimate comfort and elegance.',
      showNewsletter: false,
    }
  },
  brandColors: [
    { name: 'Deep Charcoal', value: '#1F2326' },
    { name: 'Warm Off-White', value: '#F4F1EA' },
    { name: 'Whiskey Amber', value: '#B9783B' },
    { name: 'Deep Navy', value: '#1E3A4C' },
    { name: 'Muted Sand', value: '#D8C7AF' },
    { name: 'Sea Glass', value: '#708C84' },
  ],
  setBrandColors: (colors) => set({ brandColors: colors }),

  addNode: (type, parentId = 'root') => set((state) => {
    const id = crypto.randomUUID();
    const newNode: PageNode = {
      id,
      type,
      props: getDefaultProps(type),
      children: [],
    };

    const parent = state.nodes[parentId];
    if (!parent) return state;

    return {
      nodes: {
        ...state.nodes,
        [id]: newNode,
        [parentId]: {
          ...parent,
          children: [...parent.children, id],
        }
      },
      selectedNodeId: id, // Auto-select new node
    };
  }),

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeProps: (id, props) => set((state) => {
    const node = state.nodes[id];
    if (!node) return state;
    return {
      nodes: {
        ...state.nodes,
        [id]: {
          ...node,
          props: { ...node.props, ...props }
        }
      }
    };
  }),

  removeNode: (id) => set((state) => {
    if (id === 'root') return state; // Cannot remove root

    const newNodes = { ...state.nodes };
    delete newNodes[id];

    // Remove reference from parent
    for (const key in newNodes) {
      if (newNodes[key].children.includes(id)) {
        newNodes[key] = {
          ...newNodes[key],
          children: newNodes[key].children.filter(childId => childId !== id)
        };
      }
    }

    return { nodes: newNodes, selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId };
  }),

  moveNode: (activeId, overId) => set((state) => {
    if (activeId === overId) return state;

    const newNodes = { ...state.nodes };
    let parentId = null;

    // Find the parent of these nodes (assuming they are siblings in the same section for MVP)
    for (const [id, node] of Object.entries(newNodes)) {
      if (node.children.includes(activeId) && node.children.includes(overId)) {
        parentId = id;
        break;
      }
    }

    if (!parentId) return state;

    const parentNode = { ...newNodes[parentId] };
    const oldIndex = parentNode.children.indexOf(activeId);
    const newIndex = parentNode.children.indexOf(overId);

    const newChildren = [...parentNode.children];
    newChildren.splice(oldIndex, 1);
    newChildren.splice(newIndex, 0, activeId);

    parentNode.children = newChildren;
    newNodes[parentId] = parentNode;

    return { nodes: newNodes };
  }),

  updateTheme: (themeUpdates) => set((state) => ({
    theme: { ...state.theme, ...themeUpdates }
  })),

  setStoreData: (data) => set((state) => ({ 
    nodes: data.nodes || {
      'root': {
        id: 'root',
        type: 'Section',
        props: {
          style: {
            minHeight: '100%',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--color-background)',
          }
        },
        children: [],
      }
    }, 
    theme: {
      ...state.theme,
      ...data.theme,
      typography: {
        ...state.theme.typography,
        ...data.theme?.typography
      }
    } 
  }))
}));

function getDefaultProps(type: ComponentType) {
  switch(type) {
    case 'Text': return { text: 'New Text Block', style: { color: 'var(--color-foreground)' } };
    case 'Button': return { text: 'Click Me', style: { padding: '1rem 2rem', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--base-radius)', border: 'none', cursor: 'pointer' } };
    case 'Image': return { src: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800&q=80', alt: 'Placeholder', style: { width: '100%', borderRadius: 'var(--base-radius)', objectFit: 'cover' } };
    case 'Section': return { style: { padding: 'var(--section-padding)', background: 'var(--color-surface)', borderRadius: 'var(--base-radius)', border: '1px solid var(--color-border)', minHeight: '100px' } };
    case 'Divider': return { thickness: '1px', color: 'var(--color-border)', style: 'solid', margin: '2rem 0' };
    case 'Icon': return { iconName: 'Anchor', size: 48, color: 'var(--color-primary)' };
    case 'Video': return { videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', autoPlay: false, muted: true, loop: false, startTime: 0, endTime: null, playbackSpeed: 1.0 };
    case 'Map': return { title: 'Our Location', subtitle: 'Find us at the port', locationQuery: 'Monaco Port, Monaco', zoomLevel: 14, mapTheme: 'standard' };
    case 'Html': return { htmlCode: '<div style="padding: 2rem; background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: var(--base-radius); text-align: center; color: var(--color-muted);">\n  <h3 style="margin: 0; color: var(--color-foreground);">🔧 HTML Embed Block</h3>\n  <p style="margin: 0.5rem 0 0; font-size: 0.875rem;">Select this block and paste your custom HTML, iframe widgets, or scripts in the right sidebar editor.</p>\n</div>' };
    case 'Hero': return {
      headline: 'M/Y Whiskey',
      subheadline: 'Experience unparalleled luxury and adventure on the open seas.',
      buttonText: 'Book a Charter',
      bgImage: 'https://images.unsplash.com/photo-1567664724217-105dfbc5ec3a?w=1600&q=80',
      overlayOpacity: 0.6
    };
    case 'VideoHero': return {
      headline: 'M/Y Whiskey',
      subheadline: 'Life at sea, reimagined.',
      buttonText: 'Enquire Now',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      overlayOpacity: 0.55,
      loop: true,
      startTime: 0,
      endTime: null,
      playbackSpeed: 1.0
    };
    case 'Specs': return {
      length: '120 ft / 36.5 m',
      cabins: '5 Luxury Staterooms',
      guests: 'Up to 10 Guests',
      speed: 'Cruising 15 knots, Max 22 knots'
    };
    case 'Gallery': return {
      title: 'Explore the Vessel',
      images: [
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
        'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80',
        'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80',
      ]
    };
    case 'Accordion': return {
      title: 'Frequently Asked Questions',
      items: [
        { question: 'What is included in a charter?', answer: 'All charters include the vessel, captain, crew, fuel, and standard provisions.' },
        { question: 'What is the minimum charter duration?', answer: 'We offer day charters starting from 6 hours, and overnight/extended charters by the week.' },
      ]
    };
    case 'Amenities': return {
      title: 'On Board Amenities',
      features: [
        { icon: 'Wifi', title: 'High-Speed WiFi', description: 'Stay connected anywhere on the water.' },
        { icon: 'Waves', title: 'Water Toys', description: 'Jet skis, paddleboards, and snorkel gear included.' },
        { icon: 'Utensils', title: 'Private Chef', description: 'Gourmet meals prepared fresh on board.' },
        { icon: 'Wind', title: 'Air Conditioning', description: 'Individually controlled in each stateroom.' },
      ]
    };
    case 'Pricing': return {
      title: 'Charter Rates',
      specs: [
        { label: 'Length', value: '120 ft / 36.5 m' },
        { label: 'Max Guests', value: '10' },
        { label: 'Cabins', value: '5 Staterooms' },
      ],
      pricing: [
        { season: 'High Season (Jun–Aug)', rate: 'From €85,000 / week' },
        { season: 'Shoulder (Apr–May, Sep–Oct)', rate: 'From €65,000 / week' },
        { season: 'Day Charter', rate: 'From €12,000 / day' },
      ]
    };
    case 'Crew': return {
      title: 'Meet the Crew',
      crew: [
        { image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', name: 'Captain James Walker', role: 'Captain', bio: '25 years at sea with extensive experience in the Mediterranean and Caribbean.' },
        { image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80', name: 'Sofia Laurent', role: 'Chief Stewardess', bio: 'Dedicated to delivering an impeccable and personalized guest experience.' },
      ]
    };
    case 'Itinerary': return {
      title: 'Sample Itinerary',
      days: [
        { dayNumber: 1, location: 'Monaco', description: 'Depart from the glamorous Port Hercule. Explore the principality.', image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80' },
        { dayNumber: 2, location: 'Portofino, Italy', description: 'Sail along the Italian Riviera to the iconic harbor village of Portofino.', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=800&q=80' },
        { dayNumber: 3, location: 'Cinque Terre', description: 'Anchor off the UNESCO World Heritage Site for swimming and hiking.', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80' },
      ]
    };
    case 'Testimonials': return {
      title: 'Guest Experiences',
      quotes: [
        { text: 'An absolutely unforgettable week. The crew went above and beyond for our family. The vessel is stunning.', author: '— The Harrison Family, UK' },
        { text: 'The attention to detail was extraordinary. From the cuisine to the itinerary, everything was perfect.', author: '— Dr. & Mrs. Chen, Hong Kong' },
        { text: 'We have chartered many yachts, but M/Y Whiskey stands apart. Pure elegance on the water.', author: '— Roberto Ferraro, Italy' },
      ]
    };
    case 'EnhancedHero': return {
      eyebrow: 'PRIVATE COASTAL ADVENTURES',
      headline: 'Private Coastal Adventures',
      subheadline: 'Understated luxury. Open water. Curated experiences designed for unforgettable days along Florida\'s Emerald Coast.',
      primaryButtonText: 'Explore Experiences',
      secondaryButtonText: 'Plan Your Charter',
      locationText: 'Departing from Baytowne Marina, Sandestin, Florida',
      bgImage: 'https://images.unsplash.com/photo-1567664724217-105dfbc5ec3a?w=1600&q=80',
      overlayOpacity: 0.5,
      fullWidth: true
    };
    case 'TextMedia': return {
      eyebrow: 'WELCOME ABOARD',
      headline: 'More than a charter.\nIt\'s your day on the water.',
      description: 'M/Y Whiskey is a 40\' Ocean Yachts Super Sport built for comfort, adventure, and memorable moments. From hidden sandbars to open Gulf waters, every charter is private, customized, and tailored to you.',
      linkText: 'Learn more about M/Y Whiskey',
      imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
      imagePosition: 'right'
    };
    case 'ExperiencesGrid': return {
      eyebrow: 'EXPERIENCES',
      headline: 'Three ways to explore.',
      cards: [
        { image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=800&q=80', icon: 'Anchor', title: 'COASTAL ADVENTURE', subtitle: '7-8 HOUR DAY CHARTER', description: 'Explore Choctawhatchee Bay, Crab Island, Destin Harbor and HarborWalk, then venture into the Gulf for the ultimate day on the water.', linkText: 'Explore Coastal Adventure' },
        { image: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=800&q=80', icon: 'Sun', title: 'SUNSET CRUISE', subtitle: '2.5-3 HOUR CRUISE', description: 'Relax and unwind on an evening cruise around the bay. Take in the golden hour, calm waters, and unforgettable views.', linkText: 'Explore Sunset Cruise' },
        { image: 'https://images.unsplash.com/photo-1504609774571-067ef4018274?w=800&q=80', icon: 'Fish', title: 'FISHING EXPEDITIONS', subtitle: '6, 12 OR 24 HOUR TRIPS', description: 'Coastal or deep-water trips tailored to your goals. Target your favorites with an experienced crew and top-quality gear.', linkText: 'Explore Fishing Trips' }
      ],
      bottomText: 'ALL EXPERIENCES ARE CUSTOMIZABLE'
    };
    case 'YachtFeature': return {
      eyebrow: 'THE YACHT',
      headline: 'Built for comfort. Made for adventure.',
      description: 'M/Y Whiskey is a 40\' Ocean Yachts Super Sport offering the perfect blend of performance, space, and style. Designed for smooth cruising and all-day comfort.',
      images: [
        'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80',
        'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80',
        'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'
      ],
      amenities: [
        { icon: 'Users', text: 'Spacious cockpit & seating' },
        { icon: 'Wind', text: 'Climate-controlled cabin' },
        { icon: 'Utensils', text: 'Full galley & premium amenities' },
        { icon: 'Droplets', text: 'Private head' },
        { icon: 'Binoculars', text: 'Flybridge with panoramic views' },
        { icon: 'Shield', text: 'Top-tier safety & navigation' }
      ],
      linkText: 'View The Yacht'
    };
    case 'TestimonialsGrid': return {
      eyebrow: 'GUESTS SAY IT BEST',
      headline: 'Loved by our guests',
      description: 'See why M/Y Whiskey is the top-rated luxury charter experience in the bay.',
      overallRating: 4.9,
      ratingText: 'Based on 120+ verified charters',
      linkText: 'Read All Reviews',
      quotes: [
        { text: 'The best day on the water we\'ve ever had. Crab Island, dolphins, and the sunset cruise home was perfect.', author: 'THE ANDERSON FAMILY', subtitle: 'Family Charter', stars: 5, avatar: '' },
        { text: 'Incredible experience from start to finish. Professional crew, beautiful boat, and memories that will last a lifetime.', author: 'JESSICA T.', subtitle: 'Sunset Cruise', stars: 5, avatar: '' },
        { text: 'If you want a private charter that feels personal and truly customized, this is it.', author: 'MATTHEW R.', subtitle: 'Corporate Event', stars: 5, avatar: '' }
      ]
    };
    case 'ComparisonTable': return { title: 'Compare Experiences', subheadline: '', description: '', items: [], rows: [] };
      case 'CTA': return {
      headline: 'Your next favorite day is waiting.',
      subheadline: 'Let\'s plan your private coastal adventure.',
      buttonText: 'Book Your Charter',
      bgImage: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=1600&q=80',
      overlayOpacity: 0.6
    };
    case 'ComparisonTable': return {
      title: 'Compare Experiences',
      subheadline: 'Which charter is right for you?',
      description: 'See the differences side-by-side to find the perfect day on the water.',
      items: [
        { name: 'M/Y Whiskey', showIcon: true, showText: true },
        { name: 'Standard Charter', showIcon: true, showText: true }
      ],
      rows: [
        {
          feature: 'Max Guests',
          values: [
            { text: '10', icon: 'Users' },
            { text: '6', icon: 'Users' }
          ]
        },
        {
          feature: 'Private Chef',
          values: [
            { text: 'Included', icon: 'Check' },
            { text: 'Add-on', icon: 'X' }
          ]
        },
        {
          feature: 'Water Toys',
          values: [
            { text: 'Included (Jet Skis, Paddleboards)', icon: 'Check' },
            { text: 'Limited', icon: 'AlertCircle' }
          ]
        }
      ]
    };
    case 'ContentGrid': return {
      contentType: 'adventure',
      eyebrow: 'FEATURED EXPERIENCES',
      headline: 'Curated Adventures',
      limit: 6,
      columns: 3,
      style: {
        padding: '6rem 2rem',
        background: 'var(--color-surface)'
      }
    };
    case 'DynamicCardBlock': return {
      contentType: 'adventure',
      filterSubtype: 'all',
      eyebrow: 'DYNAMIC COLLECTION',
      headline: 'Featured Items',
      limit: 6,
      columns: 3,
      showImage: true,
      showTitle: true,
      showDescription: true,
      showLocation: true,
      showDuration: true,
      showPrice: true,
      showRating: true,
      showCerts: true,
      showButton: true
    };
    case 'DynamicCarousel': return {
      contentType: 'adventure',
      filterSubtype: 'all',
      eyebrow: 'FEATURED SELECTIONS',
      headline: 'Curated Experiences',
      limit: 10,
      autoScroll: false,
      showImage: true,
      showTitle: true,
      showDescription: true,
      showPrice: true,
      showButton: true
    };
    case 'BookingWidget': return {
      headline: 'Ready for Adventure?',
      subheadline: 'Book a bespoke luxury yacht charter tailored exactly to your desires.',
      layout: 'card',
      showAdventuresList: true
    };
    case 'DynamicDetailBlock': return {
      contentType: 'adventure',
      itemId: '',
      layout: 'left',
      showImage: true,
      showTitle: true,
      showDescription: true,
      showMetadata: true,
      showButton: true,
      buttonText: 'Discover Details',
      detailBgColor: '#192D3B',
      detailTextColor: 'var(--color-foreground)',
      accentColor: 'var(--color-primary)'
    };
    case 'DynamicBlogBlock': return {
      eyebrow: 'LATEST INSIGHTS',
      headline: 'From the Captain\'s Log',
      layout: 'grid',
      limit: 3,
      columns: 3,
      showImage: true,
      showSummary: true,
      showDate: true,
      showAuthor: true,
      showTags: true,
      showButton: true,
      buttonText: 'Read Article',
      cardBgColor: '#192D3B',
      cardTextColor: 'var(--color-foreground)',
      cardBorderRadius: '4px',
      style: {
        padding: '6rem 2rem',
        background: 'var(--color-surface)'
      }
    };
    default: return {};
  }
}
