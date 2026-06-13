import { create } from 'zustand';

export interface PrintElement {
  id: string;
  type: 'text' | 'image' | 'qr' | 'divider' | 'dynamic-excursion' | 'dynamic-vessel' | 'dynamic-staff' | 'dynamic-contact' | 'hero' | 'contact-card' | 'logo' | 'dynamic-location';
  props: Record<string, any>;
}

export interface PrintZone {
  id: string;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  elements: PrintElement[];
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlayOpacity?: number;
}

export interface PrintPage {
  id: string;
  zones: PrintZone[];
}

export interface RepeatLayoutConfig {
  enabled: boolean;
  paperPreset: 'letter' | 'a4' | 'custom';
  paperWidth: string; // e.g. "8.5in"
  paperHeight: string; // e.g. "11in"
  rows: number;
  cols: number;
  margins: string; // margin of overall printed sheet
  spacing: string; // gap between repeating elements
}

export const PRINT_PRESETS = {
  'letter-landscape': { name: 'Letter Landscape (Tri-Fold default)', width: '11in', height: '8.5in', gridCols: 3, gridRows: 1 },
  'letter-portrait': { name: 'Letter Portrait', width: '8.5in', height: '11in', gridCols: 2, gridRows: 2 },
  'a4-landscape': { name: 'A4 Landscape', width: '11.69in', height: '8.27in', gridCols: 3, gridRows: 1 },
  'a4-portrait': { name: 'A4 Portrait', width: '8.27in', height: '11.69in', gridCols: 2, gridRows: 2 },
  'business-card': { name: 'Business Card (3.5" x 2")', width: '3.5in', height: '2in', gridCols: 1, gridRows: 1 },
  'custom': { name: 'Custom Layout Size', width: '8.5in', height: '11in', gridCols: 2, gridRows: 2 }
};

export const PAPER_PRESETS = {
  'letter': { name: 'Letter (8.5" x 11")', width: '8.5in', height: '11in' },
  'a4': { name: 'A4 (210mm x 297mm)', width: '8.27in', height: '11.69in' },
  'custom': { name: 'Custom Page Size', width: '8.5in', height: '11in' }
};

interface PrintBuilderState {
  preset: keyof typeof PRINT_PRESETS;
  width: string;
  height: string;
  gridCols: number;
  gridRows: number;
  pages: PrintPage[];
  selectedPageId: string;
  selectedZoneId: string | null;
  selectedElementId: string | null;
  repeatLayout: RepeatLayoutConfig;
  printTheme: 'dark' | 'light';
  hideGuides: boolean;
  
  // Actions
  setPreset: (preset: keyof typeof PRINT_PRESETS) => void;
  setCustomSize: (width: string, height: string) => void;
  setGridDimensions: (cols: number, rows: number) => void;
  setPrintTheme: (theme: 'dark' | 'light') => void;
  setHideGuides: (hide: boolean) => void;
  
  // Page actions
  addPage: () => void;
  removePage: (id: string) => void;
  selectPage: (id: string) => void;
  
  // Zone actions
  addZone: (pageId: string, colStart: number, colSpan: number, rowStart: number, rowSpan: number) => string;
  updateZoneGrid: (pageId: string, zoneId: string, colStart: number, colSpan: number, rowStart: number, rowSpan: number) => void;
  updateZoneProps: (pageId: string, zoneId: string, props: Record<string, any>) => void;
  removeZone: (pageId: string, zoneId: string) => void;
  selectZone: (zoneId: string | null) => void;
  
  // Element actions
  addElement: (pageId: string, zoneId: string, type: PrintElement['type']) => void;
  updateElementProps: (pageId: string, zoneId: string, elementId: string, props: Record<string, any>) => void;
  removeElement: (pageId: string, zoneId: string, elementId: string) => void;
  selectElement: (elementId: string | null) => void;
  reorderElement: (pageId: string, zoneId: string, elementId: string, direction: 'up' | 'down') => void;
  moveElement: (sourcePageId: string, sourceZoneId: string, targetPageId: string, targetZoneId: string, elementId: string) => void;
  
  // Repeat configuration actions
  updateRepeatConfig: (config: Partial<RepeatLayoutConfig>) => void;
  
  // Load full state
  loadDesignState: (design: any) => void;
}

export const usePrintBuilderStore = create<PrintBuilderState>((set, get) => ({
  preset: 'letter-landscape',
  width: PRINT_PRESETS['letter-landscape'].width,
  height: PRINT_PRESETS['letter-landscape'].height,
  gridCols: PRINT_PRESETS['letter-landscape'].gridCols,
  gridRows: PRINT_PRESETS['letter-landscape'].gridRows,
  pages: [
    { id: 'page-1', zones: [] },
    { id: 'page-2', zones: [] }
  ],
  selectedPageId: 'page-1',
  selectedZoneId: null,
  selectedElementId: null,
  repeatLayout: {
    enabled: false,
    paperPreset: 'letter',
    paperWidth: '8.5in',
    paperHeight: '11in',
    rows: 4,
    cols: 2,
    margins: '0.5in',
    spacing: '0.25in'
  },
  printTheme: 'dark',
  hideGuides: false,

  setPreset: (preset) => {
    const config = PRINT_PRESETS[preset];
    if (!config) return;
    
    // Auto-setup defaults based on presets
    let pages: PrintPage[] = [];
    if (preset === 'business-card') {
      pages = [{ id: 'card-front', zones: [] }, { id: 'card-back', zones: [] }];
    } else {
      pages = [{ id: 'page-1', zones: [] }, { id: 'page-2', zones: [] }];
    }

    set({
      preset,
      width: config.width,
      height: config.height,
      gridCols: config.gridCols,
      gridRows: config.gridRows,
      pages,
      selectedPageId: pages[0].id,
      selectedZoneId: null,
      selectedElementId: null,
      repeatLayout: {
        ...get().repeatLayout,
        enabled: preset === 'business-card', // Enable repeats by default for business cards
        rows: preset === 'business-card' ? 5 : 2,
        cols: preset === 'business-card' ? 2 : 1
      }
    });
  },

  setCustomSize: (width, height) => set({ preset: 'custom', width, height }),
  
  setGridDimensions: (gridCols, gridRows) => set({ gridCols, gridRows }),
  
  setPrintTheme: (printTheme) => set({ printTheme }),
  
  setHideGuides: (hideGuides) => set({ hideGuides }),

  addPage: () => {
    const id = `page-${crypto.randomUUID()}`;
    set((state) => ({
      pages: [...state.pages, { id, zones: [] }],
      selectedPageId: id
    }));
  },

  removePage: (id) => set((state) => {
    const pages = state.pages.filter(p => p.id !== id);
    if (pages.length === 0) return state; // Prevent empty pages
    return {
      pages,
      selectedPageId: state.selectedPageId === id ? pages[0].id : state.selectedPageId,
      selectedZoneId: null,
      selectedElementId: null
    };
  }),

  selectPage: (selectedPageId) => set({ selectedPageId, selectedZoneId: null, selectedElementId: null }),

  addZone: (pageId, columnStart, columnSpan, rowStart, rowSpan) => {
    const id = `zone-${crypto.randomUUID()}`;
    set((state) => {
      const pages = state.pages.map(p => {
        if (p.id !== pageId) return p;
        // Check for zone collisions and warn/prevent if overlay exists (handled by UI, but standard append here)
        return {
          ...p,
          zones: [...p.zones, { id, columnStart, columnSpan, rowStart, rowSpan, elements: [] }]
        };
      });
      return { pages, selectedZoneId: id };
    });
    return id;
  },

  updateZoneGrid: (pageId, zoneId, columnStart, columnSpan, rowStart, rowSpan) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => z.id === zoneId ? { ...z, columnStart, columnSpan, rowStart, rowSpan } : z)
      };
    });
    return { pages };
  }),

  updateZoneProps: (pageId, zoneId, props) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => z.id === zoneId ? { ...z, ...props } : z)
      };
    });
    return { pages };
  }),

  removeZone: (pageId, zoneId) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.filter(z => z.id !== zoneId)
      };
    });
    return {
      pages,
      selectedZoneId: state.selectedZoneId === zoneId ? null : state.selectedZoneId,
      selectedElementId: null
    };
  }),

  selectZone: (selectedZoneId) => set({ selectedZoneId, selectedElementId: null }),

  addElement: (pageId, zoneId, type) => set((state) => {
    const elementId = `element-${crypto.randomUUID()}`;
    const defaultProps = getDefaultProps(type);
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== zoneId) return z;
          return {
            ...z,
            elements: [...z.elements, { id: elementId, type, props: defaultProps }]
          };
        })
      };
    });
    return { pages, selectedElementId: elementId };
  }),

  updateElementProps: (pageId, zoneId, elementId, props) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== zoneId) return z;
          return {
            ...z,
            elements: z.elements.map(el => el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el)
          };
        })
      };
    });
    return { pages };
  }),

  removeElement: (pageId, zoneId, elementId) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== zoneId) return z;
          return {
            ...z,
            elements: z.elements.filter(el => el.id !== elementId)
          };
        })
      };
    });
    return {
      pages,
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId
    };
  }),

  selectElement: (selectedElementId) => set({ selectedElementId }),

  reorderElement: (pageId, zoneId, elementId, direction) => set((state) => {
    const pages = state.pages.map(p => {
      if (p.id !== pageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== zoneId) return z;
          const index = z.elements.findIndex(el => el.id === elementId);
          if (index === -1) return z;
          const newElements = [...z.elements];
          if (direction === 'up' && index > 0) {
            const temp = newElements[index];
            newElements[index] = newElements[index - 1];
            newElements[index - 1] = temp;
          } else if (direction === 'down' && index < newElements.length - 1) {
            const temp = newElements[index];
            newElements[index] = newElements[index + 1];
            newElements[index + 1] = temp;
          }
          return { ...z, elements: newElements };
        })
      };
    });
    return { pages };
  }),

  moveElement: (sourcePageId, sourceZoneId, targetPageId, targetZoneId, elementId) => set((state) => {
    let elementToMove: any = null;
    
    // Find and remove element from source zone
    const pagesWithRemoval = state.pages.map(p => {
      if (p.id !== sourcePageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== sourceZoneId) return z;
          const el = z.elements.find(e => e.id === elementId);
          if (el) elementToMove = el;
          return {
            ...z,
            elements: z.elements.filter(e => e.id !== elementId)
          };
        })
      };
    });

    if (!elementToMove) return state;

    // Add element to target zone
    const finalPages = pagesWithRemoval.map(p => {
      if (p.id !== targetPageId) return p;
      return {
        ...p,
        zones: p.zones.map(z => {
          if (z.id !== targetZoneId) return z;
          return {
            ...z,
            elements: [...z.elements, elementToMove]
          };
        })
      };
    });

    return { 
      pages: finalPages, 
      selectedZoneId: targetZoneId, 
      selectedElementId: elementId 
    };
  }),

  updateRepeatConfig: (updates) => set((state) => {
    const repeatLayout = { ...state.repeatLayout, ...updates };
    
    // Auto-update dimensions if page paper size preset changes
    if (updates.paperPreset && updates.paperPreset !== 'custom') {
      const preset = PAPER_PRESETS[updates.paperPreset];
      repeatLayout.paperWidth = preset.width;
      repeatLayout.paperHeight = preset.height;
    }

    return { repeatLayout };
  }),

  loadDesignState: (design) => set({
    preset: design.preset || 'letter-landscape',
    width: design.width || PRINT_PRESETS['letter-landscape'].width,
    height: design.height || PRINT_PRESETS['letter-landscape'].height,
    gridCols: design.gridCols || PRINT_PRESETS['letter-landscape'].gridCols,
    gridRows: design.gridRows || PRINT_PRESETS['letter-landscape'].gridRows,
    pages: design.pages || [],
    selectedPageId: design.pages?.[0]?.id || 'page-1',
    selectedZoneId: null,
    selectedElementId: null,
    repeatLayout: design.repeatLayout || {
      enabled: false,
      paperPreset: 'letter',
      paperWidth: '8.5in',
      paperHeight: '11in',
      rows: 4,
      cols: 2,
      margins: '0.5in',
      spacing: '0.25in'
    },
    printTheme: design.printTheme || 'dark'
  })
}));

function getDefaultProps(type: PrintElement['type']) {
  const baseStyle = {
    color: '',
    backgroundColor: 'transparent',
    padding: '0px',
    margin: '0px',
    borderRadius: '0px',
    borderWidth: '0px',
    borderColor: '#B9783B',
    borderStyle: 'solid',
    fontFamily: "'Inter', sans-serif",
    fontSize: '10pt',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left'
  };

  switch (type) {
    case 'text':
      return {
        text: '### Premium Travel\nType your custom descriptions here. Use standard markdown for text structures.',
        fontSizePreset: 'm',
        style: {
          ...baseStyle,
          color: '#ffffff',
          lineHeight: '1.4'
        }
      };
    case 'image':
      return {
        src: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80',
        widthPreset: 'full',
        style: {
          ...baseStyle,
          width: '100%',
          height: '1.5in',
          borderRadius: '4px',
          objectFit: 'cover'
        }
      };
    case 'qr':
      return {
        url: 'https://mywhiskey.com',
        partnerType: 'none',
        partnerSlug: '',
        campaign: 'collateral_print',
        size: '1.2in',
        style: {
          ...baseStyle,
          backgroundColor: '#ffffff',
          color: '#121416',
          padding: '6px',
          borderRadius: '6px'
        }
      };
    case 'divider':
      return {
        color: '#B9783B',
        thickness: '1px',
        style: 'solid',
        margin: '0.5rem 0',
        styleProps: { ...baseStyle }
      };
    case 'dynamic-excursion':
      return {
        slug: '', // Selected experience slug
        showImage: true,
        showDescription: true,
        showDuration: true,
        showPrice: true,
        showItinerary: true,
        condensedLayout: false,
        fontSizePreset: 'm',
        style: { ...baseStyle }
      };
    case 'dynamic-vessel':
      return {
        slug: '', // Selected vessel slug
        showImage: true,
        showSpecs: true,
        showDescription: true,
        fontSizePreset: 'm',
        style: { ...baseStyle }
      };
    case 'dynamic-staff':
      return {
        slug: '', // Selected staff member
        showAvatar: true,
        showRole: true,
        showBio: true,
        fontSizePreset: 'm',
        style: { ...baseStyle }
      };
    case 'dynamic-contact':
      return {
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showSocials: true,
        fontSizePreset: 'm',
        style: { ...baseStyle }
      };
    case 'hero':
      return {
        eyebrow: 'MOTOR YACHT',
        headline: 'WHISKEY',
        tagline: 'Luxury Private Yacht Charters',
        shortText: 'Destin, Florida',
        backgroundImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1000&q=80',
        fullPageImage: false,
        logoType: 'none',
        logoHeight: '40px',
        overlayOpacity: 50,
        fontSizePreset: 'm',
        eyebrowColor: '',
        headlineColor: '',
        taglineColor: '',
        shortTextColor: '',
        glassOpacity: 20,
        style: {
          ...baseStyle,
          color: '#ffffff',
          backgroundColor: 'transparent',
          padding: '1.5rem',
          textAlign: 'center',
          fontFamily: "'Cormorant Garamond', serif"
        }
      };
    case 'contact-card':
      return {
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showSocials: true,
        showQr: true,
        qrUrl: 'https://mywhiskey.com',
        partnerType: 'none',
        partnerSlug: '',
        campaign: 'collateral_contact',
        tagline: 'Ready for Adventure?',
        ctaText: 'Scan to Book Online',
        fontSizePreset: 'm',
        style: {
          ...baseStyle,
          color: '#ffffff',
          backgroundColor: 'rgba(255,255,255,0.02)',
          padding: '1.0rem',
          borderRadius: '6px',
          fontFamily: "'Inter', sans-serif"
        }
      };
    case 'logo':
      return {
        logoType: 'rect', // 'rect' | 'square'
        style: {
          ...baseStyle,
          width: '120px',
          height: 'auto',
          textAlign: 'left'
        }
      };
    case 'dynamic-location':
      return {
        slug: '',
        showImage: true,
        showShortDescription: true,
        showDescription: true,
        showSpecs: true,
        fontSizePreset: 'm',
        style: { ...baseStyle }
      };
    default:
      return {};
  }
}
