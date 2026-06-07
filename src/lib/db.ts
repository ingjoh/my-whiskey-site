import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { PageNode, ThemeConfig, NavLink } from '@/store/useBuilderStore';
import { detectProjectId } from './project-env';

const PAGE_COLLECTION = 'pages';
const TEMPLATE_COLLECTION = 'templates';
const SETTINGS_COLLECTION = 'settings';
const ASSETS_COLLECTION = 'assets';
const CONTENT_TYPES_COLLECTION = 'content_types';
const CONTENT_ITEMS_COLLECTION = 'content_items';

const getProjectId = () => {
  return detectProjectId();
};

export interface Asset {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
  isHidden?: boolean;
}

// Recursive parser to convert Firestore REST API formats (stringValue, mapValue, arrayValue, etc.)
// back into standard clean JSON/JS objects.
function parseFirestoreValue(value: any): any {
  if (!value) return null;
  
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return parseFloat(value.doubleValue);
  if ('nullValue' in value) return null;
  
  if ('arrayValue' in value) {
    const values = value.arrayValue.values || [];
    return values.map((v: any) => parseFirestoreValue(v));
  }
  
  if ('mapValue' in value) {
    const fields = value.mapValue.fields || {};
    const result: any = {};
    for (const key in fields) {
      result[key] = parseFirestoreValue(fields[key]);
    }
    return result;
  }
  
  return null;
}

function parseFirestoreFields(fields: any): any {
  const result: any = {};
  if (!fields) return result;
  for (const key in fields) {
    result[key] = parseFirestoreValue(fields[key]);
  }
  return result;
}

export interface SiteSettings {
  general: {
    siteName: string;
    faviconUrl?: string;
    defaultOgImage?: string;
  };
  brand?: {
    colors?: Array<{ name: string; value: string }>;
    faviconUrl?: string;
    logoRectUrl?: string;
    logoSquareUrl?: string;
  };
  seo: {
    defaultTitle: string;
    defaultDescription: string;
  };
  injection: {
    googleAnalyticsId?: string;
    headCode?: string;
    bodyCode?: string;
  };
  navigation?: {
    links: NavLink[];
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
  };
  financial?: {
    depositPercentage?: number;
    depositDeadlineDays?: number;
    enableConvenienceFee?: boolean;
    convenienceFeePercentage?: number;
  };
}

/**
 * Saves the builder nodes to Firestore for a specific page route.
 * @param route The page route (e.g., 'home', 'about')
 * @param nodes The JSON tree of nodes from the builder store
 * @param theme The global theme configuration
 * @param title The human-readable title of the page
 */
export async function savePageData(
  route: string, 
  nodes: Record<string, PageNode>, 
  theme: ThemeConfig, 
  title?: string,
  updateGlobalHeaderFooter: boolean = false
) {
  try {
    const pageRef = doc(db, PAGE_COLLECTION, route);
    const dataToSave: any = {
      nodes,
      theme,
      updatedAt: new Date().toISOString(),
    };
    if (title !== undefined) {
      dataToSave.title = title;
    }
    await setDoc(pageRef, dataToSave, { merge: true });

    if (updateGlobalHeaderFooter && route !== 'home') {
      try {
        const homeRef = doc(db, PAGE_COLLECTION, 'home');
        await setDoc(homeRef, {
          theme: {
            header: theme.header || null,
            footer: theme.footer || null,
          }
        }, { merge: true });
      } catch (homeError) {
        console.error('Error updating home page header/footer config:', homeError);
      }
    }

    return true;
  } catch (error) {
    console.error('Error saving page data:', error);
    throw error;
  }
}

export const DEFAULT_TERMS_PAGE = {
  title: 'Terms & Conditions',
  theme: {
    backgroundColor: '#121416',
    foregroundColor: '#F4F1EA',
    primaryColor: '#B9783B',
    surfaceColor: '#1E2124',
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
        { label: 'Privacy Policy', url: '#' }
      ]
    }
  },
  nodes: {
    'root': {
      id: 'root',
      type: 'Section' as const,
      props: {
        style: {
          minHeight: '100%',
          padding: '0px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          background: '#121416',
        }
      },
      children: ['hero-block', 'content-block']
    },
    'hero-block': {
      id: 'hero-block',
      type: 'EnhancedHero' as const,
      props: {
        eyebrow: 'M/Y WHISKEY',
        headline: 'Terms & Conditions',
        subheadline: 'Bareboat Charter Agreements, Digital Liability Waiver, and Cancellation Policies.',
        bgImage: 'https://images.unsplash.com/photo-1567664724217-105dfbc5ec3a?w=1600&q=80',
        overlayOpacity: 0.7,
        fullWidth: true,
        minHeight: '40vh',
        textAlignment: 'center',
        eyebrowColor: 'var(--color-primary)',
        headlineColor: 'inherit',
        subheadlineColor: '#e0e0e0',
        primaryButtonText: '',
        secondaryButtonText: '',
        locationText: ''
      },
      children: []
    },
    'content-block': {
      id: 'content-block',
      type: 'Section' as const,
      props: {
        style: {
          maxWidth: '800px',
          margin: '0 auto',
          padding: '4rem 2rem',
          color: '#F4F1EA',
          lineHeight: '1.7',
        }
      },
      children: ['terms-text']
    },
    'terms-text': {
      id: 'terms-text',
      type: 'Text' as const,
      props: {
        typographyPreset: 'p',
        text: `### 1. Bareboat Charter Agreement
By booking a charter on M/Y Whiskey, you agree that this agreement constitutes a Bareboat Charter (Demise Charter) in accordance with U.S. Coast Guard regulations. You, the charterer, assume full control, responsibility, and operational command of the vessel during the charter period. You are free to select any qualified captain certified to operate the vessel, or captain the vessel yourself if qualified.

### 2. Payment Terms & Deposit Policy
* **Pay in Full:** If chosen, 100% of the booking total (vessel rental, add-ons, fees, and applicable taxes) is charged at checkout.
* **Deposit Plan:** If selected, a non-refundable deposit is charged at checkout. The remaining balance (including estimated captain fees if contracted) will be automatically charged to the authorized credit card on file exactly **7 days prior** to the scheduled departure date.
* If a booking is made within **7 days** of the departure date, the deposit option is unavailable, and full payment is required immediately.

### 3. Credit Card Authorization & Consent
By selecting the Deposit payment option and checking the terms agreement box, you expressly authorize M/Y Whiskey to store your credit card information securely and automatically charge the remaining balance to the same card on the due date (7 days prior to departure). You consent to this recurring billing cycle.

### 4. Cancellation & Refund Policy
* Cancellations made more than 14 days before the charter date are eligible for a full refund (minus credit card processing fees).
* Cancellations made between 7 and 14 days prior to departure are eligible for a 50% refund.
* Cancellations made within 7 days of departure are non-refundable.
* If you have purchased **Cancellation Insurance**, you may cancel up to 24 hours prior to departure for a full refund (minus the cost of the insurance premium).
* M/Y Whiskey reserves the right to cancel any charter due to unsafe weather conditions (determined solely by the captain). In such cases, you will receive a 100% refund or the option to reschedule.

### 5. Digital Liability Waiver
All passengers boarding M/Y Whiskey must sign the digital liability waiver prior to departure. Failure of any guest to sign the waiver may result in boarding denial without refund. You agree to release M/Y Whiskey, its owners, operators, and crew from any liability for personal injury, property damage, or loss incurred during the charter.`,
        style: {
          fontSize: '1rem',
          color: '#D8C7AF'
        }
      },
      children: []
    }
  }
};

export const DEFAULT_INSURANCE_PAGE = {
  title: 'Cancellation Insurance Policy',
  theme: {
    backgroundColor: '#121416',
    foregroundColor: '#F4F1EA',
    primaryColor: '#B9783B',
    surfaceColor: '#1E2124',
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
        { label: 'Privacy Policy', url: '#' }
      ]
    }
  },
  nodes: {
    'root': {
      id: 'root',
      type: 'Section' as const,
      props: {
        style: {
          minHeight: '100%',
          padding: '0px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          background: '#121416',
        }
      },
      children: ['hero-block', 'content-block']
    },
    'hero-block': {
      id: 'hero-block',
      type: 'EnhancedHero' as const,
      props: {
        eyebrow: 'M/Y WHISKEY',
        headline: 'Cancellation Insurance Policy',
        subheadline: 'Protect your luxury charter with our comprehensive trip cancellation & refund coverage.',
        bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
        overlayOpacity: 0.7,
        fullWidth: true,
        minHeight: '40vh',
        textAlignment: 'center',
        eyebrowColor: 'var(--color-primary)',
        headlineColor: 'inherit',
        subheadlineColor: '#e0e0e0',
        primaryButtonText: '',
        secondaryButtonText: '',
        locationText: ''
      },
      children: []
    },
    'content-block': {
      id: 'content-block',
      type: 'Section' as const,
      props: {
        style: {
          maxWidth: '800px',
          margin: '0 auto',
          padding: '4rem 2rem',
          color: '#F4F1EA',
          lineHeight: '1.7',
        }
      },
      children: ['insurance-text']
    },
    'insurance-text': {
      id: 'insurance-text',
      type: 'Text' as const,
      props: {
        typographyPreset: 'p',
        text: `### 1. Overview of Coverage
The optional Cancellation Insurance (Trip Protection) provides booking security for your private charter on M/Y Whiskey. By purchasing Trip Protection at the time of booking, you are eligible for an upgraded refund policy in the event of unforeseen disruptions.

### 2. Upgraded Refund Rules
* **Standard Policy:** Elective cancellations made within 7 days of departure are 100% non-refundable.
* **With Trip Protection:** You may cancel your booking for any reason up to **24 hours prior** to your scheduled departure time to receive a **100% refund** of the boat rental, gear, and add-ons (excluding the cost of the insurance premium itself).
* Cancellations made less than 24 hours prior to departure are non-refundable.

### 3. Covered Events
Trip Protection covers elective cancellations as well as cancellations due to:
* Sudden severe weather warnings issued by the U.S. Coast Guard or vessel operator.
* Sudden illness, injury, or medical emergencies affecting the charterer or members of the charter party.
* Unforeseen travel disruptions, including flight cancellations or major road closures preventing port access.
* Mechanical issues with the scheduled vessel (if a replacement vessel cannot be arranged).

### 4. Direct Payouts & Claims
* To request a cancellation under this policy, contact the M/Y Whiskey concierge team directly via phone or email at least 24 hours before your departure.
* Refunds are processed back to the original form of payment within 3-5 business days.`,
        style: {
          fontSize: '1rem',
          color: '#D8C7AF'
        }
      },
      children: []
    }
  }
};

/**
 * Loads the builder nodes from Firestore for a specific page route.
 * @param route The page route (e.g., 'home', 'about')
 * @returns The nodes object, or null if not found
 */
export async function loadPageData(route: string): Promise<{ nodes: Record<string, PageNode>, theme: ThemeConfig, title?: string } | null> {
  // On the server side, fetch from the Firestore REST API to avoid connection issues or client offline failures
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${PAGE_COLLECTION}/${route}`;
      const response = await fetch(url, {
        next: { revalidate: 0 } // bypass fetch caching to load fresh edits
      });

      if (response.status === 404) {
        if (route === 'terms') {
          return {
            nodes: DEFAULT_TERMS_PAGE.nodes as Record<string, PageNode>,
            theme: DEFAULT_TERMS_PAGE.theme as ThemeConfig,
            title: DEFAULT_TERMS_PAGE.title
          };
        }
        if (route === 'insurance') {
          return {
            nodes: DEFAULT_INSURANCE_PAGE.nodes as Record<string, PageNode>,
            theme: DEFAULT_INSURANCE_PAGE.theme as ThemeConfig,
            title: DEFAULT_INSURANCE_PAGE.title
          };
        }
        return null;
      }

      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        return {
          nodes: fields.nodes as Record<string, PageNode>,
          theme: fields.theme as ThemeConfig,
          title: fields.title as string | undefined
        };
      }
      console.warn(`Firestore REST API returned status ${response.status} for route ${route}. Falling back to Web SDK.`);
    } catch (restError) {
      console.error('Error fetching page data via Firestore REST API:', restError);
      console.log('Falling back to Firestore Web SDK...');
    }
  }

  // Web SDK fallback (runs on client, and as server fallback)
  try {
    const pageRef = doc(db, PAGE_COLLECTION, route);
    const docSnap = await getDoc(pageRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        nodes: data.nodes as Record<string, PageNode>, 
        theme: data.theme as ThemeConfig,
        title: data.title as string | undefined
      };
    } else {
      if (route === 'terms') {
        return {
          nodes: DEFAULT_TERMS_PAGE.nodes as Record<string, PageNode>,
          theme: DEFAULT_TERMS_PAGE.theme as ThemeConfig,
          title: DEFAULT_TERMS_PAGE.title
        };
      }
      if (route === 'insurance') {
        return {
          nodes: DEFAULT_INSURANCE_PAGE.nodes as Record<string, PageNode>,
          theme: DEFAULT_INSURANCE_PAGE.theme as ThemeConfig,
          title: DEFAULT_INSURANCE_PAGE.title
        };
      }
      return null;
    }
  } catch (error) {
    console.error('Error loading page data:', error);
    if (route === 'terms') {
      return {
        nodes: DEFAULT_TERMS_PAGE.nodes as Record<string, PageNode>,
        theme: DEFAULT_TERMS_PAGE.theme as ThemeConfig,
        title: DEFAULT_TERMS_PAGE.title
      };
    }
    if (route === 'insurance') {
      return {
        nodes: DEFAULT_INSURANCE_PAGE.nodes as Record<string, PageNode>,
        theme: DEFAULT_INSURANCE_PAGE.theme as ThemeConfig,
        title: DEFAULT_INSURANCE_PAGE.title
      };
    }
    return null;
  }
}

/**
 * Deletes the page data from Firestore.
 */
export async function deletePageData(route: string): Promise<boolean> {
  try {
    const pageRef = doc(db, PAGE_COLLECTION, route);
    await deleteDoc(pageRef);
    return true;
  } catch (error) {
    console.error('Error deleting page data:', error);
    throw error;
  }
}

/**
 * Loads all existing page IDs from Firestore.
 * @returns An array of page IDs
 */
export async function getAllPages(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const ids = querySnapshot.docs.map(doc => doc.id);
    if (!ids.includes('terms')) {
      ids.push('terms');
    }
    if (!ids.includes('insurance')) {
      ids.push('insurance');
    }
    return ids;
  } catch (error) {
    console.error('Error fetching all pages:', error);
    return [];
  }
}

export interface PageMetadata {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Loads all page metadata from Firestore.
 */
export async function getAllPagesWithMetadata(): Promise<PageMetadata[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const pages = querySnapshot.docs
      .filter(doc => 
        !doc.id.startsWith('template-') && 
        !doc.id.startsWith('content-item-') &&
        !doc.id.startsWith('booking-') &&
        !doc.id.startsWith('customer-') &&
        !doc.id.startsWith('waiver-')
      )
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || (doc.id.charAt(0).toUpperCase() + doc.id.slice(1).replace(/-/g, ' ')),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });

    // Seed terms page automatically if it doesn't exist in Firestore
    const hasTerms = pages.some(p => p.id === 'terms');
    if (!hasTerms) {
      try {
        console.log('Seeding Terms & Conditions page to Firestore...');
        await savePageData('terms', DEFAULT_TERMS_PAGE.nodes, DEFAULT_TERMS_PAGE.theme, DEFAULT_TERMS_PAGE.title);
        pages.push({
          id: 'terms',
          title: DEFAULT_TERMS_PAGE.title,
          updatedAt: new Date().toISOString()
        });
      } catch (seedError) {
        console.error('Failed to seed terms page:', seedError);
        // Add it to the local pages array anyway so it shows up in dashboard
        pages.push({
          id: 'terms',
          title: DEFAULT_TERMS_PAGE.title,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Seed insurance page automatically if it doesn't exist in Firestore
    const hasInsurance = pages.some(p => p.id === 'insurance');
    if (!hasInsurance) {
      try {
        console.log('Seeding Cancellation Insurance page to Firestore...');
        await savePageData('insurance', DEFAULT_INSURANCE_PAGE.nodes, DEFAULT_INSURANCE_PAGE.theme, DEFAULT_INSURANCE_PAGE.title);
        pages.push({
          id: 'insurance',
          title: DEFAULT_INSURANCE_PAGE.title,
          updatedAt: new Date().toISOString()
        });
      } catch (seedError) {
        console.error('Failed to seed insurance page:', seedError);
        pages.push({
          id: 'insurance',
          title: DEFAULT_INSURANCE_PAGE.title,
          updatedAt: new Date().toISOString()
        });
      }
    }
    return pages;
  } catch (error) {
    console.error('Error fetching all pages with metadata:', error);
    return [];
  }
}

/**
 * Saves a page template to Firestore.
 */
export async function saveTemplateData(templateId: string, title: string, nodes: Record<string, PageNode>, theme: ThemeConfig) {
  try {
    const templateRef = doc(db, PAGE_COLLECTION, `template-${templateId}`);
    await setDoc(templateRef, {
      title,
      nodes,
      theme,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error saving template data:', error);
    throw error;
  }
}

/**
 * Loads a page template from Firestore.
 */
export async function loadTemplateData(templateId: string): Promise<{ title: string, nodes: Record<string, PageNode>, theme: ThemeConfig } | null> {
  try {
    const templateRef = doc(db, PAGE_COLLECTION, `template-${templateId}`);
    const docSnap = await getDoc(templateRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        title: data.title as string,
        nodes: data.nodes as Record<string, PageNode>,
        theme: data.theme as ThemeConfig
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error loading template data:', error);
    return null;
  }
}

export interface TemplateMetadata {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Loads all templates from Firestore.
 */
export async function getAllTemplates(): Promise<TemplateMetadata[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    return querySnapshot.docs
      .filter(doc => doc.id.startsWith('template-'))
      .map(doc => {
        const data = doc.data();
        const actualId = doc.id.replace('template-', '');
        return {
          id: actualId,
          title: data.title || actualId,
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });
  } catch (error) {
    console.error('Error fetching all templates:', error);
    return [];
  }
}

/**
 * Deletes a template from Firestore.
 */
export async function deleteTemplateData(templateId: string): Promise<boolean> {
  try {
    const templateRef = doc(db, PAGE_COLLECTION, `template-${templateId}`);
    await deleteDoc(templateRef);
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Saves the global site settings to Firestore.
 */
export async function saveSiteSettings(settings: SiteSettings) {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'global');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error saving site settings:', error);
    throw error;
  }
}

/**
 * Loads the global site settings from Firestore.
 */
export async function loadSiteSettings(): Promise<SiteSettings | null> {
  // On the server side, fetch from the Firestore REST API to avoid connection issues or client offline failures
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${SETTINGS_COLLECTION}/global`;
      const response = await fetch(url, {
        next: { revalidate: 0 } // bypass fetch caching to load fresh settings
      });

      if (response.status === 404) {
        return null;
      }

      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        return fields as unknown as SiteSettings;
      }
      console.warn(`Firestore REST API returned status ${response.status} for site settings. Falling back to Web SDK.`);
    } catch (restError) {
      console.error('Error fetching site settings via Firestore REST API:', restError);
      console.log('Falling back to Firestore Web SDK...');
    }
  }

  // Web SDK fallback (runs on client, and as server fallback)
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'global');
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      return docSnap.data() as SiteSettings;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error loading site settings:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// ASSETS API
// -----------------------------------------------------------------------------

export async function getAssets(): Promise<Asset[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ASSETS_COLLECTION));
    const assets: Asset[] = [];
    querySnapshot.forEach((doc) => {
      assets.push({ id: doc.id, ...doc.data() } as Asset);
    });
    // Sort by createdAt descending
    return assets.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error loading assets:', error);
    return [];
  }
}

export async function saveAsset(asset: Asset): Promise<void> {
  try {
    const assetRef = doc(db, ASSETS_COLLECTION, asset.id);
    await setDoc(assetRef, asset, { merge: true });
  } catch (error) {
    console.error('Error saving asset:', error);
    throw error;
  }
}

export async function deleteAsset(assetId: string): Promise<void> {
  try {
    const assetRef = doc(db, ASSETS_COLLECTION, assetId);
    await deleteDoc(assetRef);
  } catch (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// CONTENT TYPES ENGINE API
// -----------------------------------------------------------------------------

export interface ContentTypeConfig {
  id: string; // e.g. 'adventure', 'asset', 'staff', 'location', 'owner'
  name: string; // e.g. 'Adventure'
  pluralName: string; // e.g. 'Adventures'
  slugPrefix: string; // e.g. 'experiences', 'fleet', 'crew'
  isEnabled: boolean;
  isPublic?: boolean; // if false, public page catcher returns 404
  updatedAt?: string;
}

export interface ContentItem {
  id: string; // matches slug
  slug: string;
  title: string;
  contentType: string; // 'adventure', 'asset', 'staff', 'location', 'owner'
  shortDescription: string;
  heroImage?: string;
  location?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  description?: string; // markdown detailed description
  gallery?: Array<{ url: string; type: 'image' | 'video' | 'document'; name?: string }>;
  linkedAssets?: string[]; // array of asset slugs
  linkedLocations?: string[]; // array of location slugs
  linkedStaff?: string[]; // array of staff slugs
  rating?: number; // 5-star rating system (1-5) for crew
  guestDurationMinutes?: number; // derived guest duration
  crewDurationMinutes?: number; // derived crew duration
  anchorStatus?: string; // e.g. "Sandbar / Anchor Only", "Marina Slip"
  bestTime?: string; // e.g. "High Tide", "Sunset"
  suitability?: string; // e.g. "All Vessels", "Yachts under 120ft"
  experienceBaseCost?: number; // fixed base cost for fuel/snacks/beverages
  budgetLineItems?: Array<{ category: string; cost: number }>; // custom budget line-items
  email?: string; // contact email for owner
  phone?: string; // contact phone for owner
  revenueShare?: number; // revenue share percentage for owner (0-100)
  paymentDetails?: string; // wire/ACH notes for owner
  ownerId?: string; // associated owner ID for asset
  isVessel?: boolean; // flags whether an asset is a vessel (main asset) or gear (add-on)
  certifiedVessels?: string[]; // array of vessel slugs a captain is certified for
  addonAssetSlugs?: string[]; // array of asset slugs that are optional add-ons
  addons?: Array<{ name: string; price: number; description: string }>; // non-asset addon options (food, drinks, etc.)
  homeLocation?: string;
  quantity?: number;
  relocationSpeed?: number;
  startLocation?: string;
  endLocation?: string;
  [key: string]: any; // type-specific extensions
}

const DEFAULT_CONTENT_TYPES: ContentTypeConfig[] = [
  { id: 'adventure', name: 'Adventure', pluralName: 'Adventures', slugPrefix: 'experiences', isEnabled: true },
  { id: 'asset', name: 'Asset', pluralName: 'Assets', slugPrefix: 'fleet', isEnabled: true },
  { id: 'staff', name: 'Staff Member', pluralName: 'Staff', slugPrefix: 'crew', isEnabled: true },
  { id: 'location', name: 'Location', pluralName: 'Locations', slugPrefix: 'locations', isEnabled: true },
  { id: 'owner', name: 'Owner', pluralName: 'Owners', slugPrefix: 'owners', isEnabled: true, isPublic: false }
];

export async function getContentTypeConfigs(): Promise<ContentTypeConfig[]> {
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${SETTINGS_COLLECTION}/content_types`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        if (fields && fields.configs) {
          const loaded = fields.configs as ContentTypeConfig[];
          const merged = [...loaded];
          DEFAULT_CONTENT_TYPES.forEach(def => {
            if (!merged.some(c => c.id === def.id)) {
              merged.push(def);
            }
          });
          return merged;
        }
      }
    } catch (e) {
      console.error('Error fetching content types via REST:', e);
    }
  }

  // Web SDK / Fallback
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'content_types');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.configs) {
        const loaded = data.configs as ContentTypeConfig[];
        const merged = [...loaded];
        DEFAULT_CONTENT_TYPES.forEach(def => {
          if (!merged.some(c => c.id === def.id)) {
            merged.push(def);
          }
        });
        return merged;
      }
    }
    
    // Seed default configurations
    const configs = [...DEFAULT_CONTENT_TYPES];
    try {
      await setDoc(docRef, { configs, updatedAt: new Date().toISOString() });
    } catch (writeErr) {
      console.warn('Failed to seed default configs (expected if unauthorized):', writeErr);
    }
    return configs;
  } catch (error) {
    console.error('Error loading content type configs:', error);
    return DEFAULT_CONTENT_TYPES;
  }
}

export async function saveContentTypeConfig(config: ContentTypeConfig): Promise<void> {
  try {
    const configs = await getContentTypeConfigs();
    const index = configs.findIndex(c => c.id === config.id);
    if (index > -1) {
      configs[index] = { ...config, updatedAt: new Date().toISOString() };
    } else {
      configs.push({ ...config, updatedAt: new Date().toISOString() });
    }
    
    const docRef = doc(db, SETTINGS_COLLECTION, 'content_types');
    await setDoc(docRef, {
      configs,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving content type config:', error);
    throw error;
  }
}

export function applyMockFallbacks(item: ContentItem): ContentItem {
  if (item.contentType === 'staff') {
    const mock = MOCK_CAPTAINS.find(c => c.id === item.id || c.slug === item.slug);
    if (mock) {
      return {
        ...mock,
        ...item,
        heroImage: item.heroImage || mock.heroImage,
        hourlyRate: item.hourlyRate !== undefined && item.hourlyRate !== null ? item.hourlyRate : mock.hourlyRate,
        dailyRate: item.dailyRate !== undefined && item.dailyRate !== null ? item.dailyRate : mock.dailyRate,
        certifications: item.certifications && item.certifications.length > 0 ? item.certifications : mock.certifications,
        languagesSpoken: item.languagesSpoken && item.languagesSpoken.length > 0 ? item.languagesSpoken : mock.languagesSpoken,
        isCaptain: item.isCaptain !== undefined ? item.isCaptain : mock.isCaptain,
        role: item.role || mock.role,
        rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : (mock.rating || 5),
        certifiedVessels: item.certifiedVessels !== undefined ? item.certifiedVessels : mock.certifiedVessels
      };
    }
  } else if (item.contentType === 'location') {
    const mock = MOCK_LOCATIONS.find(c => c.id === item.id || c.slug === item.slug);
    if (mock) {
      return {
        ...mock,
        ...item,
        heroImage: item.heroImage || mock.heroImage,
        description: item.description || mock.description,
        address: item.address || mock.address,
        latitude: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : mock.latitude,
        longitude: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : mock.longitude,
        anchorStatus: item.anchorStatus || mock.anchorStatus,
        bestTime: item.bestTime || mock.bestTime,
        suitability: item.suitability || mock.suitability
      };
    }
  } else if (item.contentType === 'asset') {
    const mock = MOCK_ASSETS.find(c => c.id === item.id || c.slug === item.slug);
    if (mock) {
      return {
        ...mock,
        ...item,
        heroImage: item.heroImage || mock.heroImage,
        description: item.description || mock.description,
        hourlyRate: item.hourlyRate !== undefined && item.hourlyRate !== null ? Number(item.hourlyRate) : mock.hourlyRate,
        ownerId: item.ownerId || mock.ownerId,
        isVessel: item.isVessel !== undefined ? item.isVessel : mock.isVessel
      };
    }
  } else if (item.contentType === 'owner') {
    const mock = MOCK_OWNERS.find(c => c.id === item.id || c.slug === item.slug);
    if (mock) {
      return {
        ...mock,
        ...item,
        email: item.email || mock.email,
        phone: item.phone || mock.phone,
        revenueShare: item.revenueShare !== undefined && item.revenueShare !== null ? Number(item.revenueShare) : mock.revenueShare,
        paymentDetails: item.paymentDetails || mock.paymentDetails
      };
    }
  }
  return item;
}

export async function getContentItems(contentType?: string): Promise<ContentItem[]> {
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${PAGE_COLLECTION}`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const json = await response.json();
        let docs = (json.documents || [])
          .filter((doc: any) => {
            const docId = doc.name.split('/').pop();
            return docId.startsWith('content-item-');
          })
          .map((doc: any) => {
            const docId = doc.name.split('/').pop();
            const slug = docId.replace('content-item-', '');
            const rawItem = {
              ...parseFirestoreFields(doc.fields),
              id: slug,
              slug
            } as ContentItem;
            return applyMockFallbacks(rawItem);
          });
        if (contentType) {
          docs = docs.filter((item: ContentItem) => item.contentType === contentType);
          if (docs.length === 0) {
            if (contentType === 'location') return MOCK_LOCATIONS.map(applyMockFallbacks);
            if (contentType === 'staff') return MOCK_CAPTAINS.map(applyMockFallbacks);
            if (contentType === 'asset') return MOCK_ASSETS.map(applyMockFallbacks);
          }
        } else {
          if (docs.length === 0) {
            return [...MOCK_LOCATIONS, ...MOCK_CAPTAINS, ...MOCK_ASSETS].map(applyMockFallbacks);
          }
        }
        return docs.sort((a: ContentItem, b: ContentItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.error('Error fetching content items via REST:', e);
    }
  }

  // Web SDK
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    let items: ContentItem[] = [];
    querySnapshot.forEach((doc) => {
      if (doc.id.startsWith('content-item-')) {
        const slug = doc.id.replace('content-item-', '');
        items.push(applyMockFallbacks({ id: slug, slug, ...doc.data() } as ContentItem));
      }
    });

    // Auto-seed mock captains if no staff items exist and we are client-side (in browser)
    if (items.filter(item => item.contentType === 'staff').length === 0 && typeof window !== 'undefined') {
      console.log('No staff items found in database. Seeding 5 mock captains...');
      try {
        for (const captain of MOCK_CAPTAINS) {
          const docId = `content-item-${captain.slug}`;
          const itemRef = doc(db, PAGE_COLLECTION, docId);
          await setDoc(itemRef, {
            ...captain,
            id: captain.slug,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        // Refetch after seeding
        const updatedSnapshot = await getDocs(collection(db, PAGE_COLLECTION));
        items = [];
        updatedSnapshot.forEach((doc) => {
          if (doc.id.startsWith('content-item-')) {
            const slug = doc.id.replace('content-item-', '');
            items.push(applyMockFallbacks({ id: slug, slug, ...doc.data() } as ContentItem));
          }
        });
      } catch (seedErr) {
        console.error('Failed to seed mock captains:', seedErr);
      }
    }

    // Auto-seed mock locations if no location items exist and we are client-side (in browser)
    if (items.filter(item => item.contentType === 'location').length === 0 && typeof window !== 'undefined') {
      console.log('No location items found in database. Seeding 5 mock locations...');
      try {
        for (const location of MOCK_LOCATIONS) {
          const docId = `content-item-${location.slug}`;
          const itemRef = doc(db, PAGE_COLLECTION, docId);
          await setDoc(itemRef, {
            ...location,
            id: location.slug,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        // Refetch after seeding
        const updatedSnapshot = await getDocs(collection(db, PAGE_COLLECTION));
        items = [];
        updatedSnapshot.forEach((doc) => {
          if (doc.id.startsWith('content-item-')) {
            const slug = doc.id.replace('content-item-', '');
            items.push(applyMockFallbacks({ id: slug, slug, ...doc.data() } as ContentItem));
          }
        });
      } catch (seedErr) {
        console.error('Failed to seed mock locations:', seedErr);
      }
    }

    if (contentType) {
      const filtered = items.filter(item => item.contentType === contentType);
      if (filtered.length === 0) {
        if (contentType === 'location') return MOCK_LOCATIONS.map(applyMockFallbacks);
        if (contentType === 'staff') return MOCK_CAPTAINS.map(applyMockFallbacks);
        if (contentType === 'asset') return MOCK_ASSETS.map(applyMockFallbacks);
      }
      items = filtered;
    } else {
      if (items.length === 0) {
        return [...MOCK_LOCATIONS, ...MOCK_CAPTAINS, ...MOCK_ASSETS].map(applyMockFallbacks);
      }
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error loading content items:', error);
    return [];
  }
}

export async function getContentItem(id: string): Promise<ContentItem | null> {
  const docId = `content-item-${id}`;
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${PAGE_COLLECTION}/${docId}`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        return applyMockFallbacks({ id, slug: id, ...fields } as ContentItem);
      }
      if (response.status === 404) {
        const mockItem = [...MOCK_LOCATIONS, ...MOCK_CAPTAINS, ...MOCK_ASSETS].find(m => m.slug === id || m.id === id);
        if (mockItem) {
          return applyMockFallbacks({ ...mockItem, id, slug: id } as ContentItem);
        }
        return null;
      }
    } catch (e) {
      console.error('Error fetching content item via REST:', e);
    }
  }

  try {
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    const docSnap = await getDoc(itemRef);
    if (docSnap.exists()) {
      return applyMockFallbacks({ id, slug: id, ...docSnap.data() } as ContentItem);
    }
    const mockItem = [...MOCK_LOCATIONS, ...MOCK_CAPTAINS, ...MOCK_ASSETS].find(m => m.slug === id || m.id === id);
    if (mockItem) {
      return applyMockFallbacks({ ...mockItem, id, slug: id } as ContentItem);
    }
    return null;
  } catch (error) {
    console.error('Error loading content item:', error);
    return null;
  }
}

export interface IncludedItemConfig {
  id: string;
  name: string;
  iconName: string;
}

export const DEFAULT_INCLUDED_ITEMS: IncludedItemConfig[] = [
  { id: 'fuel-and-ice', name: 'Fuel & Ice', iconName: 'Fuel' },
  { id: 'premium-lunch', name: 'Premium Lunch', iconName: 'Utensils' },
  { id: 'soft-drinks-and-water', name: 'Soft Drinks & Bottled Water', iconName: 'GlassWater' },
  { id: 'licensed-captain', name: 'USCG Licensed Captain', iconName: 'Users' },
  { id: 'snorkeling-gear', name: 'Snorkeling Gear (Masks & Fins)', iconName: 'Compass' },
  { id: 'paddleboards', name: 'Inflatable Paddleboards', iconName: 'Waves' },
  { id: 'beach-towels', name: 'Fresh Beach Towels', iconName: 'Sparkles' },
  { id: 'wifi', name: 'High-speed Starlink WiFi', iconName: 'Wifi' },
  { id: 'premium-sound', name: 'JL Audio Sound System', iconName: 'Music' },
  { id: 'safety-vests', name: 'USCG Safety Gear & Life Vests', iconName: 'Shield' }
];

export async function loadIncludedItems(): Promise<IncludedItemConfig[]> {
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${SETTINGS_COLLECTION}/included_items`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        if (fields && fields.items) {
          return fields.items as IncludedItemConfig[];
        }
      }
    } catch (e) {
      console.error('Error fetching included items via REST:', e);
    }
  }

  // Web SDK / Fallback
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'included_items');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.items) {
        return data.items as IncludedItemConfig[];
      }
    }
    
    // Seed default items
    const items = [...DEFAULT_INCLUDED_ITEMS];
    try {
      await setDoc(docRef, { items, updatedAt: new Date().toISOString() });
    } catch (writeErr) {
      console.warn('Failed to seed default included items:', writeErr);
    }
    return items;
  } catch (error) {
    console.error('Error loading included items config:', error);
    return DEFAULT_INCLUDED_ITEMS;
  }
}

export async function saveIncludedItems(items: IncludedItemConfig[]): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'included_items');
    await setDoc(docRef, {
      items,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving included items config:', error);
    throw error;
  }
}

export interface AddonProduct {
  id: string;
  name: string;
  price: number;
  description: string;
}

export const DEFAULT_ADDON_PRODUCTS: AddonProduct[] = [
  { id: 'whiskey-cigars', name: 'Premium Whiskey & Cigar Selection', price: 150, description: 'Curated flight of 3 rare single malts paired with hand-rolled cigars.' },
  { id: 'sunset-catering', name: 'Sunset Gourmet Catering Platter', price: 200, description: 'Artisanal charcuterie, fresh Gulf seafood bites, and seasonal fruits.' },
  { id: 'snorkeling-pack', name: 'Water Sports Snorkeling Package', price: 75, description: 'Upgraded high-end snorkel sets, paddleboards, and floating island mat.' }
];

export async function loadAddonProducts(): Promise<AddonProduct[]> {
  if (typeof window === 'undefined') {
    try {
      const projectId = getProjectId();
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${SETTINGS_COLLECTION}/addon_products`;
      const response = await fetch(url, { next: { revalidate: 0 } });
      if (response.ok) {
        const json = await response.json();
        const fields = parseFirestoreFields(json.fields);
        if (fields && fields.products) {
          return fields.products as AddonProduct[];
        }
      }
    } catch (e) {
      console.error('Error fetching addon products via REST:', e);
    }
  }

  // Web SDK / Fallback
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'addon_products');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.products) {
        return data.products as AddonProduct[];
      }
    }
    
    // Seed default products
    const products = [...DEFAULT_ADDON_PRODUCTS];
    try {
      await setDoc(docRef, { products, updatedAt: new Date().toISOString() });
    } catch (writeErr) {
      console.warn('Failed to seed default addon products:', writeErr);
    }
    return products;
  } catch (error) {
    console.error('Error loading addon products config:', error);
    return DEFAULT_ADDON_PRODUCTS;
  }
}

export async function saveAddonProducts(products: AddonProduct[]): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'addon_products');
    await setDoc(docRef, {
      products,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error saving addon products config:', error);
    throw error;
  }
}

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
}

export async function saveContentItem(item: ContentItem): Promise<void> {
  try {
    const docId = `content-item-${item.slug}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    const cleanedData = cleanUndefined({
      ...item,
      id: item.slug,
      updatedAt: new Date().toISOString()
    });
    await setDoc(itemRef, cleanedData, { merge: true });
  } catch (error) {
    console.error('Error saving content item:', error);
    throw error;
  }
}


export async function deleteContentItem(id: string): Promise<void> {
  try {
    const docId = `content-item-${id}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting content item:', error);
    throw error;
  }
}

export async function getPublishedCaptains(): Promise<ContentItem[]> {
  const staff = await getContentItems('staff');
  return staff.filter(item => item.isCaptain === true && item.status === 'published');
}

export const MOCK_CAPTAINS: ContentItem[] = [
  {
    id: 'captain-sarah-vance',
    slug: 'captain-sarah-vance',
    title: 'Captain Sarah Vance',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 450,
    hourlyRate: 75,
    rating: 5,
    heroImage: '/images/crew/captain-sarah-vance.png',
    shortDescription: 'USCG 100 Ton Master with over a decade of charter experience in the Destin area.',
    location: 'Destin, FL',
    bio: 'Captain Sarah Vance has been navigating the emerald waters of the Gulf Coast since she was a teenager. Certified with a USCG 100 Ton Master license, she is known for her exceptional safety record and deep knowledge of local sandbars, snorkeling spots, and dolphin habitats.',
    certifications: ['USCG 100 Ton Master', 'First Aid & CPR', 'STCW-95'],
    languagesSpoken: ['English'],
    certifiedVessels: ['my-whiskey-yacht', 'my-barrel-tender'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'captain-marcus-brody',
    slug: 'captain-marcus-brody',
    title: 'Captain Marcus Brody',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 500,
    hourlyRate: 85,
    rating: 4.8,
    heroImage: '/images/crew/captain-marcus-brody.png',
    shortDescription: 'USCG 200 Ton Master and deep-sea fishing specialist with 15+ years of offshore experience.',
    location: 'Destin Harbor, FL',
    bio: 'Captain Marcus Brody is a seasoned offshore captain and tournament-winning angler. He specializes in deep-sea charters and coastal navigation, bringing a wealth of marine mechanical knowledge and local fishing lore to every charter.',
    certifications: ['USCG 200 Ton Master', 'STCW-95', 'Marine Firefighting', 'CPR & AED'],
    languagesSpoken: ['English'],
    certifiedVessels: ['my-whiskey-yacht'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'captain-david-chen',
    slug: 'captain-david-chen',
    title: 'Captain David Chen',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 400,
    hourlyRate: 65,
    rating: 4.9,
    heroImage: '/images/crew/captain-david-chen.png',
    shortDescription: 'USCG 50 Ton Master and professional yacht host. Speaks English and Mandarin.',
    location: 'Destin, FL',
    bio: 'Captain David Chen combines technical maritime skills with hospitality expertise. Prior to private chartering, David worked in luxury guest services, making him the perfect captain for high-end corporate charters and relaxing family days.',
    certifications: ['USCG 50 Ton Master', 'First Aid & CPR'],
    languagesSpoken: ['English', 'Mandarin'],
    certifiedVessels: ['my-barrel-tender'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'captain-elena-rostova',
    slug: 'captain-elena-rostova',
    title: 'Captain Elena Rostova',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 450,
    hourlyRate: 75,
    rating: 5,
    heroImage: '/images/crew/captain-elena-rostova.png',
    shortDescription: 'USCG 100 Ton Master and certified divemaster with a passion for marine conservation.',
    location: 'Destin Marina, FL',
    bio: 'Captain Elena Rostova has sailed across the Atlantic and throughout the Caribbean. As a licensed captain and PADI Divemaster, Elena offers charters that can explore both the surface and the depths of the Gulf Coast.',
    certifications: ['USCG 100 Ton Master', 'PADI Divemaster', 'STCW-95', 'Emergency First Responder'],
    languagesSpoken: ['English', 'Russian', 'Spanish'],
    certifiedVessels: ['my-whiskey-yacht', 'my-barrel-tender'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'captain-robert-miller',
    slug: 'captain-robert-miller',
    title: 'Captain Robert "Red" Miller',
    contentType: 'staff',
    role: 'Captain',
    isCaptain: true,
    dailyRate: 550,
    hourlyRate: 95,
    rating: 5,
    heroImage: '/images/crew/captain-robert-miller.png',
    shortDescription: 'USCG 500 Ton Master with 25+ years of ocean command experience.',
    location: 'Destin, FL',
    bio: 'Captain Robert "Red" Miller is the most senior captain in our network. With over 25 years of command on large yachts and commercial vessels, his experience, professionalism, and calming presence ensure the highest standard of luxury and safety.',
    certifications: ['USCG 500 Ton Master', 'STCW-95', 'GMDSS Radio Operator', 'Radar Observer'],
    languagesSpoken: ['English'],
    certifiedVessels: ['my-whiskey-yacht'],
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const MOCK_LOCATIONS: ContentItem[] = [
  {
    id: 'crab-island',
    slug: 'crab-island',
    title: 'Crab Island',
    contentType: 'location',
    shortDescription: 'Destin\'s famous sandbar and shallow underwater playground.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Destin, FL',
    address: 'Crab Island Sandbar, Destin, FL 32541',
    latitude: 30.3951,
    longitude: -86.5165,
    anchorStatus: 'Sandbar / Anchor Only',
    bestTime: 'High Tide',
    suitability: 'All Vessels & Tenders',
    description: '### Destin\'s Premier Social Sandbar\n\nCrab Island is a waist-deep sandbar located at the entrance of Choctawhatchee Bay, right next to the Destin Bridge. Over the years, it has evolved into a premier destination for boaters and water enthusiasts looking to socialise, swim, and enjoy floating restaurants.\n\n### What to Expect\n\n- **Shallow Clear Waters**: The water depth ranges from 1 to 4 feet, making it perfect for wading, floating, and playing.\n- **Floating Food & Ice Cream**: Barges offer local snacks, boiled peanuts, ice cream, and non-alcoholic drinks.\n- **Tidal Shifts**: The water is clearest and most stunning during high tide when clean saltwater flows in from the Gulf of Mexico.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'destin-harbor',
    slug: 'destin-harbor',
    title: 'Destin Harbor',
    contentType: 'location',
    shortDescription: 'The bustling, scenic waterfront hub of the Destin fleet.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Destin Harbor, FL',
    address: '102 Harbor Blvd, Destin, FL 32541',
    latitude: 30.3916,
    longitude: -86.5085,
    anchorStatus: 'Marina Slip / Dockage',
    bestTime: 'All Day',
    suitability: 'Vessels under 120ft',
    description: '### The Heartbeat of the World\'s Luckiest Fishing Village\n\nDestin Harbor Boardwalk stretches nearly a mile along the harbor, providing access to dozens of charter vessels, waterfront dining spots, shops, and water sports rentals.\n\n### Access Details\n\n- **Departure**: Private charters on M/Y Whiskey normally depart from our designated slip here.\n- **Waterfront Attractions**: Enjoy paddleboarding around the harbor, or dining on the fresh catch of the day at HarborWalk Village.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'baytowne-marina',
    slug: 'baytowne-marina',
    title: 'Baytowne Marina',
    contentType: 'location',
    shortDescription: 'The elegant gateway dock at Sandestin Golf and Beach Resort.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Sandestin Resort, FL',
    address: '9300 Baytowne Wharf Blvd, Miramar Beach, FL 32550',
    latitude: 30.3807,
    longitude: -86.3262,
    anchorStatus: 'Resort Slip / Dockage',
    bestTime: 'Sunset / Evening',
    suitability: 'Vessels under 60ft',
    description: '### Upscale Marina Amenities\n\nBaytowne Marina is a premier full-service dockage situated on the shores of Choctawhatchee Bay inside the Sandestin Resort. It is the perfect starting point for bay adventures, sunset yacht cruises, and light-tackle fishing.\n\n### Experience\n\n- **Resort Vibe**: Provides a tranquil, high-end environment for boarding the yacht.\n- **Post-Charter Dinner**: Direct walking access to the Village of Baytowne Wharf with premium dining and live music.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'norriego-point',
    slug: 'norriego-point',
    title: 'Norriego Point',
    contentType: 'location',
    shortDescription: 'A peaceful, scenic sandy peninsula protecting Destin Harbor.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Destin Harbor Pass, FL',
    address: 'Norriego Rd, Holiday Isle, Destin, FL 32541',
    latitude: 30.3892,
    longitude: -86.5140,
    anchorStatus: 'Anchorage Area',
    bestTime: 'Afternoon',
    suitability: 'Tenders & Jet Skis',
    description: '### Natural Beauty & Tidal Pools\n\nNorriego Point is a sandy peninsula located at the end of Holiday Isle. With harbor waters on one side and East Pass on the other, it features tranquil tide pools and a scenic view of harbor traffic.\n\n### Ideal For\n\n- **Snorkeling**: Sheltered rock jetties protect swimmers and invite local fish species.\n- **Sunset Gazing**: Watch yachts exit to the Gulf under the golden hour sky.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'henderson-beach',
    slug: 'henderson-beach',
    title: 'Henderson Beach State Park',
    contentType: 'location',
    shortDescription: 'Pristine coastal dunes and emerald waters along the Gulf Pass.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Miramar Beach / Destin, FL',
    address: '17000 Emerald Coast Pkwy, Destin, FL 32541',
    latitude: 30.3828,
    longitude: -86.4678,
    anchorStatus: 'Open Gulf Anchorage',
    bestTime: 'Morning / Calm Seas',
    suitability: 'Yachts & Heavy Anchors',
    description: '### Preserved Florida Shoreline\n\nHenderson Beach features majestic white sand dunes, coastal scrub forests, and beautiful Gulf waters. Chartering past Henderson Beach offers spectacular, undeveloped views of the coast.\n\n### Sightseeing Highlights\n\n- **Marine Wildlife**: High chances of spotting dolphins swimming parallel to the coast.\n- **Pristine Beaching**: An excellent anchoring spot for quiet lunches and swimming in the open Gulf.',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const MOCK_ASSETS: ContentItem[] = [
  {
    id: 'my-whiskey-yacht',
    slug: 'my-whiskey-yacht',
    title: 'M/Y Whiskey',
    contentType: 'asset',
    shortDescription: 'Our flagship 55ft luxury cruiser yacht, equipped for ultimate comfort.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Destin Harbor, FL',
    status: 'published',
    category: 'yacht',
    make: 'Custom',
    model: '55 Flybridge',
    year: 2021,
    capacity: 12,
    hourlyRate: 250,
    ownerId: 'emerald-coast-yacht-group',
    isVessel: true,
    specs: [
      { label: 'Length', value: '55 ft' },
      { label: 'Beam', value: '16.5 ft' },
      { label: 'Cabins', value: '3 Luxury Staterooms' },
      { label: 'Cruising Speed', value: '18 knots' }
    ],
    description: '### Unparalleled Luxury on the Gulf Coast\n\nM/Y Whiskey is a custom-built 55-foot luxury flybridge yacht designed for comfort, entertainment, and smooth cruising. Featuring premium leather seating, a spacious climate-controlled salon, and an expansive flybridge deck with 360-degree views, she is the perfect platform for private charters.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'my-barrel-tender',
    slug: 'my-barrel-tender',
    title: 'M/Y Barrel',
    contentType: 'asset',
    shortDescription: 'A nimble 28ft Boston Whaler tender, perfect for sandbars and snorkeling runs.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Destin Harbor, FL',
    status: 'published',
    category: 'tender',
    make: 'Boston Whaler',
    model: '280 Outrage',
    year: 2019,
    capacity: 8,
    hourlyRate: 75,
    ownerId: 'emerald-coast-yacht-group',
    isVessel: true,
    specs: [
      { label: 'Length', value: '28 ft' },
      { label: 'Engines', value: 'Twin Mercury 300hp' },
      { label: 'Draft', value: '22 inches' }
    ],
    description: '### Speed, Safety & Shallow Water Access\n\nM/Y Barrel is a 28-foot Boston Whaler Outrage. Built for stability and speed, it is our primary tender and shallow water boat, ideal for dropping anchor right at Crab Island or taking snorkeling runs along the East Pass rock jetties.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'premium-snorkeling-gear',
    slug: 'premium-snorkeling-gear',
    title: 'Cressi Snorkeling Gear Set',
    contentType: 'asset',
    shortDescription: 'High-quality masks, dry snorkels, and adjustable fins in all sizes.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Onboard M/Y Whiskey',
    status: 'published',
    category: 'gear',
    make: 'Cressi',
    model: 'Palau Combo',
    year: 2023,
    capacity: 12,
    hourlyRate: 25,
    ownerId: 'whiskey-marine-llc',
    isVessel: false,
    specs: [
      { label: 'Masks', value: 'Tempered Glass Panorama' },
      { label: 'Snorkels', value: 'Dry Top Splash Guard' },
      { label: 'Fins', value: 'Open Heel Adjustable' }
    ],
    description: '### Professional Snorkeling Equipment\n\nWe provide complete, sanitized Cressi snorkeling sets for guests of all ages. Each set includes a panoramic view mask, dry snorkel (preventing water entry), and adjustable short fins perfect for exploring local artificial reefs and coastal tide pools.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bote-paddleboards',
    slug: 'bote-paddleboards',
    title: 'BOTE Inflatable Stand-Up Paddleboards',
    contentType: 'asset',
    shortDescription: 'Ultra-stable 11ft stand-up paddleboards for exploring tranquil waters.',
    heroImage: 'https://firebasestorage.googleapis.com/v0/b/mywhiskey-97620.firebasestorage.app/o/library%2F1779993263829_Gemini_Generated_Image_lqcww3lqcww3lqcw.webp?alt=media&token=eb4c577a-989f-4539-9a53-1907623f648c',
    location: 'Onboard M/Y Whiskey',
    status: 'published',
    category: 'water-toys',
    make: 'BOTE',
    model: 'Breeze Aero 11′',
    year: 2022,
    capacity: 2,
    hourlyRate: 20,
    ownerId: 'whiskey-marine-llc',
    isVessel: false,
    specs: [
      { label: 'Length', value: '11 ft' },
      { label: 'Width', value: '33 in' },
      { label: 'Capacity', value: '250 lbs' }
    ],
    description: '### Glide Effortlessly Across the Bay\n\nOur BOTE inflatable paddleboards combine military-grade PVC durability with exceptional stability, making them perfect for paddlers of all skill levels. Explore secluded bayous or cruise alongside the boat in clear gulf water.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const MOCK_OWNERS: ContentItem[] = [
  {
    id: 'emerald-coast-yacht-group',
    slug: 'emerald-coast-yacht-group',
    title: 'Emerald Coast Yacht Group',
    contentType: 'owner',
    shortDescription: 'Owner and management company for our luxury yacht and tender.',
    email: 'info@emeraldcoastboats.com',
    phone: '850-555-0199',
    revenueShare: 65,
    paymentDetails: 'Wire transfer to Wells Fargo Routing #123456789 Acct #987654321',
    bio: 'Primary fleet owner managing the M/Y Whiskey.',
    address: '120 Harbor Blvd, Destin, FL 32541',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'whiskey-marine-llc',
    slug: 'whiskey-marine-llc',
    title: 'Whiskey Marine LLC',
    contentType: 'owner',
    shortDescription: 'Co-op owner providing premium water toys and snorkeling equipment.',
    email: 'finance@whiskeymarine.com',
    phone: '850-555-0144',
    revenueShare: 50,
    paymentDetails: 'Direct ACH to Chase Bank Routing #987654321 Acct #123456789',
    bio: 'Owner of the BOTE paddleboards and snorkeling gear.',
    address: 'Marina Slip 42, Destin Harbor, FL 32541',
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function seedMockData(): Promise<void> {
  console.log('Seeding mock data for Structured Content Engine...');
  
  // Seed Owners
  for (const owner of MOCK_OWNERS) {
    const docId = `content-item-${owner.slug}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(itemRef, {
      ...owner,
      id: owner.slug,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  // Seed Staff
  for (const captain of MOCK_CAPTAINS) {
    const docId = `content-item-${captain.slug}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(itemRef, {
      ...captain,
      id: captain.slug,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  // Seed Locations
  for (const location of MOCK_LOCATIONS) {
    const docId = `content-item-${location.slug}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(itemRef, {
      ...location,
      id: location.slug,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  // Seed Assets
  for (const asset of MOCK_ASSETS) {
    const docId = `content-item-${asset.slug}`;
    const itemRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(itemRef, {
      ...asset,
      id: asset.slug,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
  
  console.log('All mock data seeded successfully!');
}

export interface BookingRecord {
  id: string;
  experienceId: string;
  experienceTitle: string;
  vesselSlug: string;
  vesselTitle: string;
  captainId: string;
  captainTitle: string;
  date: string;
  startTime: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCount: number;
  specialConsiderations?: string;
  subtotal: number;
  salesTax: number;
  grandTotal: number;
  amountPaidToday: number;
  amountDueLater: number;
  paymentPlan: 'full' | 'deposit';
  cancellationInsurance: boolean;
  marketingOptIn: boolean;
  createdAt: string;
  status: 'confirmed' | 'pending' | 'pending waiver' | 'cancelled' | 'pending_funds_verification';
  waiverSigned?: boolean;
  guestTitle?: string;
  guestFirstName?: string;
  guestMiddleInitial?: string;
  guestLastName?: string;
  gearSlugs?: string[];
  startLocation?: string;
  endLocation?: string;
  leadTimeMinutes?: number;
  crewDurationMinutes?: number;
  paymentMethod?: 'card' | 'eft';
  convenienceFeeAmount?: number;
  token?: string;
  messages?: BookingMessage[];
  messageStatus?: 'unread' | 'read' | 'answered';
  amountRefunded?: number;
  refundStatus?: 'none' | 'pending_manual_refund' | 'refunded';
  stripeRefundId?: string;
  stripePaymentIntentId?: string;
  cancellationSource?: 'customer_portal' | 'customer_call' | 'company_operational';
  cancelledBy?: 'guest' | 'admin';
  cancelReason?: string;
  refundEstimate?: number;
  changeHistory?: any[];
}

export interface BookingMessage {
  id: string;
  sender: 'guest' | 'admin';
  text: string;
  timestamp: string;
}

export interface WaiverSignature {
  id: string;
  bookingId: string;
  guestEmail: string;
  name: string;
  address: string;
  signedAt: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  loc: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  screenResolution: string;
  language: string;
  passengers?: Array<{ name: string; relationship: string; addedToMainWaiver: boolean }>;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  bookingIds: string[];
  waiverSignatures: Array<{
    waiverId: string;
    bookingId: string;
    signedAt: string;
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    userAgent?: string;
  }>;
  marketingOptIn: boolean;
  title?: string;
  firstName?: string;
  middleInitial?: string;
  lastName?: string;
  privateNotes?: Array<{
    date: string;
    author: string;
    note: string;
  }>;
}

/**
 * Creates a new booking document and updates/creates the corresponding customer profile.
 */
export async function saveBookingData(booking: Omit<BookingRecord, 'id' | 'createdAt'>): Promise<{ bookingId: string; token: string }> {
  const bookingId = 'BK-' + Math.floor(100000 + Math.random() * 900000);
  const docId = `booking-${bookingId}`;
  
  try {
    // 1. Save Booking Document in `pages` collection
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    const secureToken = 'tkn_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const bookingData: BookingRecord = {
      ...booking,
      id: bookingId,
      createdAt: new Date().toISOString(),
      waiverSigned: false,
      token: booking.token || secureToken
    };
    await setDoc(bookingRef, {
      ...bookingData,
      type: 'booking',
      updatedAt: new Date().toISOString()
    });

    // 2. Create or Update Customer Profile
    const emailSanitized = booking.guestEmail.toLowerCase().trim();
    const customerDocId = `customer-${emailSanitized.replace(/[^a-z0-9]/g, '-')}`;
    const customerRef = doc(db, PAGE_COLLECTION, customerDocId);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      const data = customerSnap.data();
      const currentBookings = data.bookingIds || [];
      await setDoc(customerRef, {
        name: booking.guestName,
        title: booking.guestTitle || '',
        firstName: booking.guestFirstName || '',
        middleInitial: booking.guestMiddleInitial || '',
        lastName: booking.guestLastName || '',
        phone: booking.guestPhone,
        bookingIds: currentBookings.includes(bookingId) ? currentBookings : [...currentBookings, bookingId],
        marketingOptIn: booking.marketingOptIn,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(customerRef, {
        type: 'customer',
        id: customerDocId,
        name: booking.guestName,
        title: booking.guestTitle || '',
        firstName: booking.guestFirstName || '',
        middleInitial: booking.guestMiddleInitial || '',
        lastName: booking.guestLastName || '',
        email: booking.guestEmail,
        phone: booking.guestPhone,
        bookingIds: [bookingId],
        waiverSignatures: [],
        marketingOptIn: booking.marketingOptIn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return { bookingId, token: bookingData.token || secureToken };
  } catch (error) {
    console.error('Error saving booking data:', error);
    throw error;
  }
}

/**
 * Saves a signed waiver, updates the booking status, and updates the customer profile.
 */
export async function saveWaiverSignature(bookingId: string, signature: Omit<WaiverSignature, 'id' | 'signedAt'>): Promise<boolean> {
  const docId = `waiver-${bookingId}`;
  
  try {
    // 1. Save Waiver Signature in `pages` collection
    const waiverRef = doc(db, PAGE_COLLECTION, docId);
    const waiverData: WaiverSignature = {
      ...signature,
      id: docId,
      signedAt: new Date().toISOString()
    };
    await setDoc(waiverRef, {
      ...waiverData,
      type: 'waiver_signature',
      updatedAt: new Date().toISOString()
    });

    // 2. Update Booking Document to indicate waiver signed
    const bookingRef = doc(db, PAGE_COLLECTION, `booking-${bookingId}`);
    const bookingSnap = await getDoc(bookingRef);
    const existingBooking = bookingSnap.exists() ? bookingSnap.data() : null;
    const isEftPending = existingBooking?.paymentMethod === 'eft' || existingBooking?.status === 'pending_funds_verification';

    await setDoc(bookingRef, {
      waiverSigned: true,
      status: isEftPending ? 'pending_funds_verification' : 'confirmed',
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 3. Update Customer Profile with waiver signature audit details and Address
    const emailSanitized = signature.guestEmail.toLowerCase().trim();
    const customerDocId = `customer-${emailSanitized.replace(/[^a-z0-9]/g, '-')}`;
    const customerRef = doc(db, PAGE_COLLECTION, customerDocId);
    const customerSnap = await getDoc(customerRef);

    const newWaiverLink = {
      waiverId: docId,
      bookingId: bookingId,
      signedAt: waiverData.signedAt,
      ip: signature.ip,
      city: signature.city,
      region: signature.region,
      country: signature.country,
      userAgent: signature.userAgent.substring(0, 120)
    };

    if (customerSnap.exists()) {
      const data = customerSnap.data();
      const currentWaivers = data.waiverSignatures || [];
      await setDoc(customerRef, {
        address: signature.address,
        waiverSignatures: [...currentWaivers, newWaiverLink],
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      // Fallback if profile didn't exist
      await setDoc(customerRef, {
        type: 'customer',
        id: customerDocId,
        name: signature.name,
        email: signature.guestEmail,
        address: signature.address,
        bookingIds: [bookingId],
        waiverSignatures: [newWaiverLink],
        marketingOptIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return true;
  } catch (error) {
    console.error('Error saving waiver signature:', error);
    throw error;
  }
}

/**
 * Retrieves a customer profile by email.
 */
export async function getCustomerProfile(email: string): Promise<CustomerProfile | null> {
  const emailSanitized = email.toLowerCase().trim();
  const customerDocId = `customer-${emailSanitized.replace(/[^a-z0-9]/g, '-')}`;
  
  try {
    const customerRef = doc(db, PAGE_COLLECTION, customerDocId);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      return customerSnap.data() as CustomerProfile;
    }
    return null;
  } catch (error) {
    console.error('Error loading customer profile:', error);
    return null;
  }
}

/**
 * Retrieves all bookings.
 */
export async function getAllBookings(): Promise<BookingRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const bookings: BookingRecord[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'booking') {
        bookings.push({
          ...data,
          id: data.id || doc.id.replace('booking-', '')
        } as BookingRecord);
      }
    });
    return bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Error loading all bookings:', error);
    return [];
  }
}

/**
 * Retrieves all customer profiles.
 */
export async function getAllCustomerProfiles(): Promise<CustomerProfile[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const customers: CustomerProfile[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'customer') {
        customers.push(data as CustomerProfile);
      }
    });
    return customers;
  } catch (error) {
    console.error('Error loading customer profiles:', error);
    return [];
  }
}

/**
 * Retrieves all waiver signatures.
 */
export async function getAllWaiverSignatures(): Promise<WaiverSignature[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const waivers: WaiverSignature[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'waiver_signature') {
        waivers.push(data as WaiverSignature);
      }
    });
    return waivers;
  } catch (error) {
    console.error('Error loading waiver signatures:', error);
    return [];
  }
}

/**
 * Updates a booking's operational log fields.
 */
export async function updateBookingOperationalFields(
  bookingId: string, 
  status: 'confirmed' | 'pending' | 'pending waiver', 
  tripStatus: string, 
  notes: string
): Promise<boolean> {
  try {
    const docId = `booking-${bookingId}`;
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(bookingRef, {
      status,
      tripStatus,
      operationalNotes: notes,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating booking fields:', error);
    return false;
  }
}

/**
 * Adds a private internal staff note to a customer profile.
 */
export async function addCustomerPrivateNote(
  email: string,
  noteText: string,
  author: string
): Promise<boolean> {
  try {
    const emailSanitized = email.toLowerCase().trim();
    const customerDocId = `customer-${emailSanitized.replace(/[^a-z0-9]/g, '-')}`;
    const customerRef = doc(db, PAGE_COLLECTION, customerDocId);
    
    const customerSnap = await getDoc(customerRef);
    if (!customerSnap.exists()) return false;
    
    const data = customerSnap.data();
    const currentNotes = data.privateNotes || [];
    
    const newNote = {
      date: new Date().toISOString(),
      author,
      note: noteText
    };
    
    await setDoc(customerRef, {
      privateNotes: [...currentNotes, newNote],
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error adding customer note:', error);
    return false;
  }
}

/**
 * Retrieves a customer profile by document ID.
 */
export async function getCustomerProfileById(id: string): Promise<CustomerProfile | null> {
  try {
    const customerRef = doc(db, PAGE_COLLECTION, id);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      return customerSnap.data() as CustomerProfile;
    }
    return null;
  } catch (error) {
    console.error('Error loading customer profile by ID:', error);
    return null;
  }
}

export interface AssetBlackout {
  id: string;
  vesselSlug: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  createdAt: string;
}

export async function saveAssetBlackout(blackout: Omit<AssetBlackout, 'id' | 'createdAt'>): Promise<string> {
  const blackoutId = 'blackout-' + Math.floor(100000 + Math.random() * 900000);
  const docId = `blackout-${blackoutId}`;
  
  try {
    const docRef = doc(db, PAGE_COLLECTION, docId);
    const data: AssetBlackout = {
      ...blackout,
      id: blackoutId,
      createdAt: new Date().toISOString()
    };
    await setDoc(docRef, {
      ...data,
      type: 'asset_blackout',
      updatedAt: new Date().toISOString()
    });
    return blackoutId;
  } catch (error) {
    console.error('Error saving asset blackout:', error);
    throw error;
  }
}

export async function getAssetBlackouts(vesselSlug?: string): Promise<AssetBlackout[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const blackouts: AssetBlackout[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'asset_blackout') {
        const item = data as AssetBlackout;
        if (!vesselSlug || item.vesselSlug === vesselSlug) {
          blackouts.push(item);
        }
      }
    });
    return blackouts.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  } catch (error) {
    console.error('Error loading asset blackouts:', error);
    return [];
  }
}

export async function deleteAssetBlackout(id: string): Promise<boolean> {
  try {
    const docId = id.startsWith('blackout-') ? id : `blackout-${id}`;
    const docRef = doc(db, PAGE_COLLECTION, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting asset blackout:', error);
    return false;
  }
}

export interface CheckoutLock {
  id: string;
  vesselSlug: string;
  date: string;
  startTime: string;
  holderEmail: string;
  expiresAt: string;
  createdAt: string;
  type: 'lock';
}

export async function acquireCheckoutLock(
  vesselSlug: string,
  date: string,
  startTime: string,
  holderEmail: string
): Promise<{ success: boolean; activeLock?: CheckoutLock }> {
  const docId = `lock-${vesselSlug}-${date}-${startTime.replace(':', '-')}`;
  
  try {
    const docRef = doc(db, PAGE_COLLECTION, docId);
    const docSnap = await getDoc(docRef);
    
    const now = Date.now();
    
    if (docSnap.exists()) {
      const lockData = docSnap.data() as CheckoutLock;
      const isExpired = new Date(lockData.expiresAt).getTime() <= now;
      const isOwnedByMe = lockData.holderEmail.toLowerCase().trim() === holderEmail.toLowerCase().trim();
      
      if (!isExpired && !isOwnedByMe) {
        return { success: false, activeLock: lockData };
      }
    }
    
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString();
    const lock: CheckoutLock = {
      id: docId,
      vesselSlug,
      date,
      startTime,
      holderEmail,
      expiresAt,
      createdAt: new Date().toISOString(),
      type: 'lock'
    };
    
    await setDoc(docRef, lock);
    return { success: true };
  } catch (error) {
    console.error('Error acquiring checkout lock:', error);
    throw error;
  }
}

export async function releaseCheckoutLock(
  vesselSlug: string,
  date: string,
  startTime: string,
  holderEmail: string
): Promise<boolean> {
  const docId = `lock-${vesselSlug}-${date}-${startTime.replace(':', '-')}`;
  
  try {
    const docRef = doc(db, PAGE_COLLECTION, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const lockData = docSnap.data() as CheckoutLock;
      if (!holderEmail || lockData.holderEmail.toLowerCase().trim() === holderEmail.toLowerCase().trim()) {
        await deleteDoc(docRef);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error releasing checkout lock:', error);
    return false;
  }
}

export async function getAllCheckoutLocks(): Promise<CheckoutLock[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PAGE_COLLECTION));
    const locks: CheckoutLock[] = [];
    const now = Date.now();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.type === 'lock') {
        const item = data as CheckoutLock;
        if (new Date(item.expiresAt).getTime() > now) {
          locks.push(item);
        }
      }
    });
    return locks;
  } catch (error) {
    console.error('Error loading checkout locks:', error);
    return [];
  }
}

export interface SelectableLinkOption {
  value: string;
  label: string;
  category: string;
}

/**
 * Retrieves a unified list of all pages, collection indexes, and dynamic detail items
 * grouped by category to be used in point-and-click URL selectors.
 */
export async function getSelectableLinkOptions(): Promise<SelectableLinkOption[]> {
  const options: SelectableLinkOption[] = [
    { value: '/', label: 'Home Page', category: 'Standard Pages' },
    { value: '/terms', label: 'Terms & Conditions', category: 'Standard Pages' },
    { value: '/insurance', label: 'Cancellation Policy', category: 'Standard Pages' },
  ];

  // 1. Fetch custom builder pages
  try {
    const pages = await getAllPagesWithMetadata();
    pages.forEach(p => {
      // Avoid adding terms or insurance twice as they are manually styled standard pages
      if (p.id !== 'terms' && p.id !== 'insurance') {
        options.push({
          value: `/${p.id}`,
          label: p.title,
          category: 'Custom Pages'
        });
      }
    });
  } catch (err) {
    console.error('Error fetching custom pages metadata for options:', err);
  }

  // 2. Fetch active dynamic collection directories and detail items
  try {
    const configs = await getContentTypeConfigs();
    const activeConfigs = configs.filter(c => c.isEnabled && c.isPublic !== false);
    
    // Add Directory paths
    activeConfigs.forEach(c => {
      options.push({
        value: `/${c.slugPrefix}`,
        label: `${c.pluralName} Directory Index`,
        category: 'Directories'
      });
    });

    // Add individual items
    const items = await getContentItems();
    items.forEach(item => {
      const config = activeConfigs.find(c => c.id === item.contentType);
      if (config && item.status === 'published') {
        options.push({
          value: `/${config.slugPrefix}/${item.slug}`,
          label: item.title,
          category: config.pluralName
        });
      }
    });
  } catch (err) {
    console.error('Error fetching content items for options:', err);
  }

  return options;
}

/**
 * Retrieves a booking document by its booking ID (e.g. "BK-123456").
 */
export async function getBookingById(bookingId: string): Promise<BookingRecord | null> {
  try {
    const docId = `booking-${bookingId}`;
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    const bookingSnap = await getDoc(bookingRef);
    if (bookingSnap.exists()) {
      const data = bookingSnap.data();
      if (data.type === 'booking') {
        return {
          ...data,
          id: data.id || bookingId
        } as BookingRecord;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    return null;
  }
}

/**
 * Appends a message to the booking's message history.
 */
export async function sendBookingMessage(bookingId: string, sender: 'guest' | 'admin', text: string): Promise<boolean> {
  try {
    const docId = `booking-${bookingId}`;
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) return false;
    
    const data = bookingSnap.data();
    const currentMessages = data.messages || [];
    
    const newMessage: BookingMessage = {
      id: 'msg_' + Math.floor(100000 + Math.random() * 900000),
      sender,
      text,
      timestamp: new Date().toISOString()
    };
    
    await setDoc(bookingRef, {
      messages: [...currentMessages, newMessage],
      messageStatus: sender === 'guest' ? 'unread' : 'answered',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error sending booking message:', error);
    return false;
  }
}

/**
 * Updates the messageStatus field of a booking (unread, read, answered).
 */
export async function updateBookingMessageStatus(bookingId: string, status: 'unread' | 'read' | 'answered'): Promise<boolean> {
  try {
    const docId = `booking-${bookingId}`;
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    await setDoc(bookingRef, {
      messageStatus: status,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating booking message status:', error);
    return false;
  }
}

/**
 * Normalizes a name by stripping prefixes (Mr., Mrs., Ms., Dr., Capt., Capt, etc.)
 * and removing periods and extra whitespaces.
 */
export function normalizeNameForSignature(name: string): string {
  if (!name) return '';
  let clean = name.trim().toLowerCase();
  
  // Remove common prefixes
  const prefixes = [
    /^mr\.\s+/, /^mr\s+/,
    /^mrs\.\s+/, /^mrs\s+/,
    /^ms\.\s+/, /^ms\s+/,
    /^dr\.\s+/, /^dr\s+/,
    /^capt\.\s+/, /^capt\s+/,
    /^captain\s+/
  ];
  
  for (const regex of prefixes) {
    clean = clean.replace(regex, '');
  }
  
  // Remove any periods (e.g. middle initial "B." becomes "B")
  clean = clean.replace(/\./g, '');
  
  // Replace multiple spaces with a single space
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if signature matches printed name under allowed options:
 * - Direct match (normalized)
 * - Match without middle name/initial
 */
export function checkSignatureMatch(signature: string, printedName: string): boolean {
  const sigNorm = normalizeNameForSignature(signature);
  const printedNorm = normalizeNameForSignature(printedName);
  
  if (!sigNorm || !printedNorm) return false;
  if (sigNorm === printedNorm) return true;
  
  // Try matching without middle names/initials
  // Split printed name into tokens. If it has 3 parts (first, middle, last)
  // we can check if sigNorm matches first + last parts.
  const printedParts = printedNorm.split(' ');
  if (printedParts.length > 2) {
    const firstAndLast = `${printedParts[0]} ${printedParts[printedParts.length - 1]}`;
    if (sigNorm === firstAndLast) {
      return true;
    }
  }
  
  return false;
}

/**
 * Ensures a booking document has a valid secure token. Generates one if missing.
 */
export async function ensureBookingToken(bookingId: string, currentToken?: string): Promise<string> {
  if (currentToken && currentToken !== 'undefined') return currentToken;
  try {
    const docId = `booking-${bookingId}`;
    const bookingRef = doc(db, PAGE_COLLECTION, docId);
    const snap = await getDoc(bookingRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.token && data.token !== 'undefined') {
        return data.token;
      }
      const secureToken = 'tkn_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      await setDoc(bookingRef, {
        token: secureToken,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return secureToken;
    }
  } catch (error) {
    console.error('Error ensuring booking token:', error);
  }
  return '';
}





