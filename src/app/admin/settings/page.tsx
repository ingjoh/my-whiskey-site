'use client';

import { useState, useEffect } from 'react';
import { loadSiteSettings, saveSiteSettings, SiteSettings, getAllPagesWithMetadata, getSelectableLinkOptions, SelectableLinkOption } from '@/lib/db';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Globe, Code, FileText, UploadCloud, Palette, 
  Plus, Trash2, Menu, ArrowUp, ArrowDown, ExternalLink, ChevronRight, HelpCircle, Phone, Share2, Image as ImageIcon, DollarSign
} from 'lucide-react';
import { uploadFile } from '@/lib/storage';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';

const SettingsImageUploader = ({ value, onChange, placeholder, inputStyle }: { value: string | undefined, onChange: (val: string) => void, placeholder: string, inputStyle: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset error status when value is altered
  useEffect(() => {
    setImageError(false);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ ...inputStyle, flex: 1, minWidth: 0 }} 
          placeholder={placeholder}
        />
        <button 
          onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
          style={{ 
            background: 'var(--color-surface)', 
            border: '1px solid var(--color-border)', 
            padding: '0 0.75rem', 
            borderRadius: 'var(--base-radius)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            color: 'var(--color-muted)'
          }} 
          title="Open Media Library"
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
        >
          <ImageIcon size={16} />
        </button>
      </div>
      {value && value.trim() !== '' && (
        <div style={{ 
          width: 'fit-content', 
          background: 'rgba(0,0,0,0.2)', 
          padding: '0.5rem', 
          borderRadius: 'var(--base-radius)', 
          border: '1px dashed var(--color-border)',
          marginTop: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {imageError ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem', color: '#f87171', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center' }}>⚠️ Error Loading Preview</span>
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: 'var(--color-primary)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Open Link
              </a>
            </div>
          ) : (
            <img 
              src={value} 
              alt="Preview" 
              style={{ maxHeight: '80px', width: 'auto', minHeight: '40px', minWidth: '40px', objectFit: 'contain', display: 'block', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)' }} 
              onError={() => setImageError(true)}
            />
          )}
        </div>
      )}
      <AssetLibraryModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(url) => onChange(url)}
      />
    </div>
  );
};

const DEFAULT_SETTINGS: SiteSettings = {
  general: {
    siteName: 'M/Y Whiskey',
    faviconUrl: '',
    defaultOgImage: ''
  },
  brand: {
    colors: [
      { name: 'Deep Charcoal', value: '#1F2326' },
      { name: 'Warm Off-White', value: '#F4F1EA' },
      { name: 'Whiskey Amber', value: '#B9783B' },
      { name: 'Deep Navy', value: '#1E3A4C' },
      { name: 'Muted Sand', value: '#D8C7AF' },
      { name: 'Sea Glass', value: '#708C84' },
    ]
  },
  seo: {
    defaultTitle: 'M/Y Whiskey - Luxury Yacht Charter',
    defaultDescription: 'Experience unparalleled luxury and adventure on the open seas.'
  },
  injection: {
    googleAnalyticsId: '',
    headCode: '',
    bodyCode: ''
  },
  navigation: {
    links: [
      { label: 'Home', url: '/' },
      { label: 'The Fleet', url: '/fleet' },
      { label: 'Contact Us', url: '/contact' }
    ]
  },
  contact: {
    phone: '',
    email: '',
    address: ''
  },
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    youtube: '',
    linkedin: ''
  },
  financial: {
    depositPercentage: 20,
    depositDeadlineDays: 7,
    enableConvenienceFee: true,
    convenienceFeePercentage: 3.5
  }
};

export default function SettingsPage() {
  const { refreshSettings } = useSiteSettings();
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'seo' | 'injection' | 'navigation' | 'contact' | 'financial'>('general');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [selectableOptions, setSelectableOptions] = useState<SelectableLinkOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await loadSiteSettings();
        const options = await getSelectableLinkOptions();
        setSelectableOptions(options);

        if (data) {
          const rawLinks = data.navigation?.links || DEFAULT_SETTINGS.navigation?.links || [];
          const healedLinks = rawLinks.map((link: any) => {
            let newLabel = link.label;
            if (link.label === 'New Link') {
              const matched = options.find(o => o.value === link.url);
              if (matched) newLabel = matched.label;
            }
            
            let children = link.children;
            if (children && children.length > 0) {
              children = children.map((c: any) => {
                let newCLabel = c.label;
                if (c.label === 'Sub Link' || c.label === 'New Link') {
                  const matched = options.find(o => o.value === c.url);
                  if (matched) newCLabel = matched.label;
                }
                return { ...c, label: newCLabel };
              });
            }
            return { ...link, label: newLabel, children };
          });

          setSettings({
            general: { ...DEFAULT_SETTINGS.general, ...data.general },
            brand: { 
              ...DEFAULT_SETTINGS.brand,
              ...data.brand,
              colors: data.brand?.colors || DEFAULT_SETTINGS.brand?.colors
            },
            seo: { ...DEFAULT_SETTINGS.seo, ...data.seo },
            injection: { ...DEFAULT_SETTINGS.injection, ...data.injection },
            navigation: {
              links: healedLinks
            },
            financial: {
              ...DEFAULT_SETTINGS.financial,
              ...data.financial
            }
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Remove any undefined values which Firestore rejects
      const safeSettings = JSON.parse(JSON.stringify(settings));
      await saveSiteSettings(safeSettings);
      await refreshSettings();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const inputStyle = {
    padding: '0.6rem 0.75rem',
    background: '#121416',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#F4F1EA',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    marginBottom: '1.5rem'
  };

  // NAVIGATION MENU ACTIONS
  const getLinks = () => settings.navigation?.links || [];
  const setLinks = (links: any[]) => {
    setSettings({
      ...settings,
      navigation: { links }
    });
  };

  const addTopLevelLink = () => {
    setLinks([...getLinks(), { label: 'New Link', url: '', linkStyle: 'text' }]);
  };

  const deleteTopLevelLink = (idx: number) => {
    setLinks(getLinks().filter((_, i) => i !== idx));
  };

  const moveTopLevelLink = (idx: number, direction: 'up' | 'down') => {
    const list = [...getLinks()];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;
    setLinks(list);
  };

  const addChildLink = (parentIdx: number) => {
    const list = [...getLinks()];
    const parent = { ...list[parentIdx] };
    const children = parent.children ? [...parent.children] : [];
    children.push({ label: 'Sub Link', url: '' });
    parent.children = children;
    list[parentIdx] = parent;
    setLinks(list);
  };

  const deleteChildLink = (parentIdx: number, childIdx: number) => {
    const list = [...getLinks()];
    const parent = { ...list[parentIdx] };
    if (parent.children) {
      parent.children = parent.children.filter((_, i) => i !== childIdx);
    }
    list[parentIdx] = parent;
    setLinks(list);
  };

  const moveChildLink = (parentIdx: number, childIdx: number, direction: 'up' | 'down') => {
    const list = [...getLinks()];
    const parent = { ...list[parentIdx] };
    if (!parent.children) return;
    const children = [...parent.children];
    const targetIdx = direction === 'up' ? childIdx - 1 : childIdx + 1;
    if (targetIdx < 0 || targetIdx >= children.length) return;
    const temp = children[childIdx];
    children[childIdx] = children[targetIdx];
    children[targetIdx] = temp;
    parent.children = children;
    list[parentIdx] = parent;
    setLinks(list);
  };

  const isPredefinedUrl = (url: string) => {
    return ['/', ...selectableOptions.map(o => o.value)].includes(url);
  };

  if (isLoading) return <div style={{ padding: '2rem', color: '#F4F1EA', background: '#121416', minHeight: '100vh' }}>Loading settings...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/admin" style={{ color: '#D8C7AF', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </Link>
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>Site Settings</div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saveStatus === 'saving' || saveStatus === 'success'}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            background: saveStatus === 'success' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : saveStatus === 'saving' ? 'var(--color-muted)' : '#B9783B', 
            color: 'white', 
            border: 'none', 
            padding: '0.6rem 1.5rem', 
            borderRadius: '6px', 
            cursor: (saveStatus === 'saving' || saveStatus === 'success') ? 'default' : 'pointer', 
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            minWidth: '150px',
            justifyContent: 'center'
          }}
          onMouseOver={e => { if (saveStatus === 'idle') e.currentTarget.style.background = '#a2642e'; }}
          onMouseOut={e => { if (saveStatus === 'idle') e.currentTarget.style.background = '#B9783B'; }}
        >
          {saveStatus === 'idle' && <><Save size={18} /> Save Settings</>}
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'success' && 'Saved!'}
          {saveStatus === 'error' && 'Error'}
        </button>
      </nav>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 2rem', display: 'flex', gap: '3rem', alignItems: 'flex-start' }}>
        
        {/* Sidebar Tabs */}
        <aside style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'sticky', top: '100px' }}>
          <button 
            onClick={() => setActiveTab('general')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'general' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'general' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <Globe size={18} /> General
          </button>
          <button 
            onClick={() => setActiveTab('brand')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'brand' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'brand' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <Palette size={18} /> Brand Colors
          </button>
          <button 
            onClick={() => setActiveTab('navigation')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'navigation' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'navigation' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <Menu size={18} /> Navigation Menu
          </button>
          <button 
            onClick={() => setActiveTab('contact')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'contact' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'contact' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <Phone size={18} /> Contact & Social
          </button>
          <button 
            onClick={() => setActiveTab('seo')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'seo' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'seo' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <FileText size={18} /> SEO Defaults
          </button>
          <button 
            onClick={() => setActiveTab('injection')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'injection' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'injection' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <Code size={18} /> Code Injection
          </button>
          <button 
            onClick={() => setActiveTab('financial')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', background: activeTab === 'financial' ? '#1E2124' : 'transparent', border: 'none', borderRadius: '6px', color: activeTab === 'financial' ? '#B9783B' : '#D8C7AF', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
          >
            <DollarSign size={18} /> Financial & Payments
          </button>
        </aside>

        {/* Content Area */}
        <div style={{ flex: 1, background: '#1E2124', padding: '2.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          
          {activeTab === 'general' && (
            <div>
              <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>General Settings</h2>
              <label style={labelStyle}>
                Site Name
                <input 
                  type="text" 
                  value={settings.general.siteName} 
                  onChange={e => setSettings({ ...settings, general: { ...settings.general, siteName: e.target.value } })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </label>

              <label style={labelStyle}>
                Default OpenGraph Image URL
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Fallback image when sharing site links on social media</span>
                <SettingsImageUploader 
                  placeholder="https://example.com/og-image.jpg"
                  value={settings.general.defaultOgImage} 
                  onChange={val => setSettings({ ...settings, general: { ...settings.general, defaultOgImage: val } })}
                  inputStyle={inputStyle}
                />
              </label>
            </div>
          )}

          {activeTab === 'brand' && (
            <div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Brand Colors</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2.5rem', fontSize: '0.875rem' }}>Manage custom brand colors to use globally across all builder elements.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {(settings.brand?.colors || []).map((color, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#121416', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Visual Swatch Picker */}
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', position: 'relative', flexShrink: 0 }}>
                      <input 
                        type="color"
                        value={color.value.startsWith('#') && color.value.length === 7 ? color.value : '#000000'}
                        onChange={(e) => {
                          const newColors = [...(settings.brand?.colors || [])];
                          newColors[idx] = { ...newColors[idx], value: e.target.value };
                          setSettings({ ...settings, brand: { ...settings.brand, colors: newColors } });
                        }}
                        style={{ width: '160%', height: '160%', transform: 'translate(-20%, -20%)', cursor: 'pointer', border: 'none', padding: 0 }}
                      />
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Color Label (e.g. Whiskey Amber)"
                        value={color.name} 
                        onChange={(e) => {
                          const newColors = [...(settings.brand?.colors || [])];
                          newColors[idx] = { ...newColors[idx], name: e.target.value };
                          setSettings({ ...settings, brand: { ...settings.brand, colors: newColors } });
                        }}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <input 
                        type="text" 
                        placeholder="#FFFFFF or rgb(255,255,255)"
                        value={color.value} 
                        onChange={(e) => {
                          const newColors = [...(settings.brand?.colors || [])];
                          newColors[idx] = { ...newColors[idx], value: e.target.value };
                          setSettings({ ...settings, brand: { ...settings.brand, colors: newColors } });
                        }}
                        style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                      />
                    </div>

                    <button 
                      onClick={() => {
                        const newColors = (settings.brand?.colors || []).filter((_, i) => i !== idx);
                        setSettings({ ...settings, brand: { ...settings.brand, colors: newColors } });
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                      title="Remove Swatch"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}

                <button 
                  onClick={() => {
                    const newColors = [...(settings.brand?.colors || []), { name: 'New Swatch', value: '#B9783B' }];
                    setSettings({ ...settings, brand: { ...settings.brand, colors: newColors } });
                  }}
                  style={{ marginTop: '1rem', padding: '0.75rem', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', color: '#B9783B', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={18} /> Add Color Swatch
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2.5rem 0' }} />
              
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Brand Images</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2.5rem', fontSize: '0.875rem' }}>Manage global branding assets like logos and site icons.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label style={labelStyle}>
                  Favicon URL (Must be .ico or .png)
                  <SettingsImageUploader 
                    placeholder="https://example.com/favicon.ico"
                    value={settings.brand?.faviconUrl} 
                    onChange={val => setSettings({ ...settings, brand: { ...settings.brand, faviconUrl: val } })}
                    inputStyle={inputStyle}
                  />
                </label>
                
                <label style={labelStyle}>
                  Rectangular Logo URL (Header / Landscape)
                  <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Used at the top left of the main navigation header. Falls back to site name if empty.</span>
                  <SettingsImageUploader 
                    placeholder="https://example.com/logo-rect.png"
                    value={settings.brand?.logoRectUrl} 
                    onChange={val => setSettings({ ...settings, brand: { ...settings.brand, logoRectUrl: val } })}
                    inputStyle={inputStyle}
                  />
                </label>
                
                <label style={labelStyle}>
                  Square Logo URL (Menu / Badges / Footers)
                  <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Used for square-ratio badges, avatar menus, and custom footers.</span>
                  <SettingsImageUploader 
                    placeholder="https://example.com/logo-square.png"
                    value={settings.brand?.logoSquareUrl} 
                    onChange={val => setSettings({ ...settings, brand: { ...settings.brand, logoSquareUrl: val } })}
                    inputStyle={inputStyle}
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'navigation' && (
            <div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Navigation Menu Builder</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2rem', fontSize: '0.875rem' }}>
                Configure the multi-level navigation tree for your site. Add sub-links, edit labels, reorder links, and target custom pages or URLs.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {getLinks().map((link: any, pIdx) => {
                  const isCustom = !isPredefinedUrl(link.url);
                  return (
                    <div 
                      key={pIdx} 
                      style={{ 
                        background: '#121416', 
                        border: '1px solid rgba(255,255,255,0.06)', 
                        borderRadius: '8px', 
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                    >
                      {/* Top level item controls row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', color: '#D8C7AF', opacity: 0.5 }}>
                          <Menu size={16} />
                        </div>
                        
                        <input 
                          type="text" 
                          placeholder="Label (e.g. Destinations)"
                          value={link.label}
                          onChange={e => {
                            const list = [...getLinks()];
                            list[pIdx] = { ...list[pIdx], label: e.target.value };
                            setLinks(list);
                          }}
                          style={{ ...inputStyle, width: '130px', fontWeight: 600 }}
                          required
                        />

                        {/* Page Selector dropdown */}
                        <select
                          value={isCustom ? 'custom' : link.url}
                          onChange={e => {
                            const val = e.target.value;
                            const list = [...getLinks()];
                            let currentLabel = list[pIdx].label;
                            if (currentLabel === 'New Link' || currentLabel === 'Sub Link') {
                              if (val === '/') {
                                currentLabel = 'Home';
                              } else if (val === '') {
                                currentLabel = 'New Link';
                              } else {
                                const matchedPage = selectableOptions.find(o => o.value === val);
                                if (matchedPage) currentLabel = matchedPage.label;
                              }
                            }
                            list[pIdx] = { ...list[pIdx], url: val === 'custom' ? '' : val, label: currentLabel };
                            setLinks(list);
                          }}
                          style={{ ...inputStyle, width: '140px' }}
                        >
                          <option value="" disabled>-- Select Page --</option>
                          <option value="custom">Custom URL...</option>
                          {Array.from(new Set(selectableOptions.map(o => o.category))).map(category => (
                            <optgroup key={category} label={category}>
                              {selectableOptions.filter(o => o.category === category).map(o => (
                                <option key={o.value} value={o.value}>{o.label} ({o.value})</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        {isCustom && (
                          <input 
                            type="text" 
                            placeholder="https://..."
                            value={link.url || ''}
                            onChange={e => {
                              const list = [...getLinks()];
                              list[pIdx] = { ...list[pIdx], url: e.target.value };
                              setLinks(list);
                            }}
                            style={{ ...inputStyle, width: '120px', fontFamily: 'monospace' }}
                          />
                        )}

                        <select
                          value={link.linkStyle || 'text'}
                          onChange={e => {
                            const list = [...getLinks()];
                            list[pIdx] = { ...list[pIdx], linkStyle: e.target.value };
                            setLinks(list);
                          }}
                          style={{ ...inputStyle, width: '110px' }}
                        >
                          <option value="text">Text style</option>
                          <option value="primary">Amber button</option>
                          <option value="secondary">Navy button</option>
                        </select>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Dynamic Sub-links</label>
                          <select
                            value={link.dynamicSublinks || ''}
                            onChange={(e) => {
                              const list = [...getLinks()];
                              list[pIdx] = { ...list[pIdx], dynamicSublinks: e.target.value || null };
                              setLinks(list);
                            }}
                            style={{ padding: '0.5rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)', fontSize: '0.875rem' }}
                          >
                            <option value="">None (Manual)</option>
                            <option value="adventure">Adventures</option>
                            <option value="asset">Fleet Assets</option>
                            <option value="staff">Crew Members</option>
                            <option value="location">Locations</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Target</label>
                          <select 
                            value={link.target || '_self'} 
                            onChange={(e) => {
                              const list = [...getLinks()];
                              list[pIdx] = { ...list[pIdx], target: e.target.value as any };
                              setLinks(list);
                            }}
                            style={{ padding: '0.5rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)', fontSize: '0.875rem' }}
                          >
                            <option value="_self">Same Window</option>
                            <option value="_blank">New Window</option>
                            <option value="overlay">Overlay</option>
                          </select>
                        </div>

                        {/* Reorder & Action buttons */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
                          <button 
                            type="button" 
                            disabled={pIdx === 0}
                            onClick={() => moveTopLevelLink(pIdx, 'up')}
                            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: pIdx === 0 ? 'not-allowed' : 'pointer', opacity: pIdx === 0 ? 0.3 : 0.7 }}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button 
                            type="button" 
                            disabled={pIdx === getLinks().length - 1}
                            onClick={() => moveTopLevelLink(pIdx, 'down')}
                            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: pIdx === getLinks().length - 1 ? 'not-allowed' : 'pointer', opacity: pIdx === getLinks().length - 1 ? 0.3 : 0.7 }}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => deleteTopLevelLink(pIdx)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.25rem' }}
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Sub-links nested tree area */}
                      <div style={{ borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '1.5rem', marginLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {link.children?.map((child: any, cIdx: number) => {
                          const childIsCustom = !isPredefinedUrl(child.url);
                          return (
                            <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <ChevronRight size={14} style={{ color: '#D8C7AF', opacity: 0.5 }} />
                              
                              <input 
                                type="text" 
                                placeholder="Sub-Link Label"
                                value={child.label}
                                onChange={e => {
                                  const list = [...getLinks()];
                                  const parent = { ...list[pIdx] };
                                  if (parent.children) {
                                    const children = [...parent.children];
                                    children[cIdx] = { ...children[cIdx], label: e.target.value };
                                    parent.children = children;
                                    list[pIdx] = parent;
                                    setLinks(list);
                                  }
                                }}
                                style={{ ...inputStyle, width: '130px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                required
                              />

                              <select
                                value={childIsCustom ? 'custom' : child.url}
                                onChange={e => {
                                  const val = e.target.value;
                                  const list = [...getLinks()];
                                  const parent = { ...list[pIdx] };
                                  if (parent.children) {
                                    const children = [...parent.children];
                                    let currentLabel = children[cIdx].label;
                                    if (currentLabel === 'Sub Link' || currentLabel === 'New Link') {
                                      if (val === '/') {
                                        currentLabel = 'Home';
                                      } else if (val === '') {
                                        currentLabel = 'Sub Link';
                                      } else {
                                        const matchedPage = selectableOptions.find(o => o.value === val);
                                        if (matchedPage) currentLabel = matchedPage.label;
                                      }
                                    }
                                    children[cIdx] = { ...children[cIdx], url: val === 'custom' ? '' : val, label: currentLabel };
                                    parent.children = children;
                                    list[pIdx] = parent;
                                    setLinks(list);
                                  }
                                }}
                                style={{ ...inputStyle, width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                              >
                                <option value="" disabled>-- Select Page --</option>
                                <option value="custom">Custom URL...</option>
                                {Array.from(new Set(selectableOptions.map(o => o.category))).map(category => (
                                  <optgroup key={category} label={category}>
                                    {selectableOptions.filter(o => o.category === category).map(o => (
                                      <option key={o.value} value={o.value}>{o.label} ({o.value})</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>

                              {childIsCustom && (
                                <input 
                                  type="text" 
                                  placeholder="https://..."
                                  value={child.url || ''}
                                  onChange={e => {
                                    const list = [...getLinks()];
                                    const parent = { ...list[pIdx] };
                                    if (parent.children) {
                                      const children = [...parent.children];
                                      children[cIdx] = { ...children[cIdx], url: e.target.value };
                                      parent.children = children;
                                      list[pIdx] = parent;
                                      setLinks(list);
                                    }
                                  }}
                                  style={{ ...inputStyle, width: '120px', fontFamily: 'monospace', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                />
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Target</label>
                                <select 
                                  value={child.target || '_self'} 
                                  onChange={(e) => {
                                    const list = [...getLinks()];
                                    const parent = { ...list[pIdx] };
                                    if (parent.children) {
                                      const children = [...parent.children];
                                      children[cIdx] = { ...children[cIdx], target: e.target.value as any };
                                      parent.children = children;
                                      list[pIdx] = parent;
                                      setLinks(list);
                                    }
                                  }}
                                  style={{ padding: '0.5rem', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)', fontSize: '0.875rem' }}
                                >
                                  <option value="_self">Same Window</option>
                                  <option value="_blank">New Window</option>
                                  <option value="overlay">Overlay</option>
                                </select>
                              </div>

                              {/* Reorder sublink buttons */}
                              <div style={{ display: 'flex', gap: '0.15rem' }}>
                                <button 
                                  type="button" 
                                  disabled={cIdx === 0}
                                  onClick={() => moveChildLink(pIdx, cIdx, 'up')}
                                  style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: cIdx === 0 ? 'not-allowed' : 'pointer', opacity: cIdx === 0 ? 0.3 : 0.7 }}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button 
                                  type="button" 
                                  disabled={cIdx === (link.children?.length - 1)}
                                  onClick={() => moveChildLink(pIdx, cIdx, 'down')}
                                  style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: cIdx === (link.children?.length - 1) ? 'not-allowed' : 'pointer', opacity: cIdx === (link.children?.length - 1) ? 0.3 : 0.7 }}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => deleteChildLink(pIdx, cIdx)}
                                  style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.2rem' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        <button 
                          type="button"
                          onClick={() => addChildLink(pIdx)}
                          style={{
                            width: 'fit-content',
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.75rem',
                            color: '#708C84',
                            background: 'transparent',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.25rem'
                          }}
                        >
                          <Plus size={12} /> Add Sub-Link
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button 
                  type="button"
                  onClick={addTopLevelLink}
                  style={{
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px dashed rgba(255,255,255,0.15)',
                    color: '#B9783B',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    marginTop: '0.5rem'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Plus size={18} /> Add Top-Level Menu Link
                </button>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Contact & Social Media</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2rem', fontSize: '0.875rem' }}>Manage your global contact information and social media links for use in footers and contact pages.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F4F1EA', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Contact Information</h3>
                  <label style={labelStyle}>
                    Phone Number
                    <input 
                      type="text" 
                      placeholder="+1 (555) 123-4567"
                      value={settings.contact?.phone || ''} 
                      onChange={e => setSettings({ ...settings, contact: { ...settings.contact, phone: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    Email Address
                    <input 
                      type="email" 
                      placeholder="info@mywhiskey.com"
                      value={settings.contact?.email || ''} 
                      onChange={e => setSettings({ ...settings, contact: { ...settings.contact, email: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    Physical Address
                    <textarea 
                      placeholder="123 Marina Bay&#10;Nassau, Bahamas"
                      value={settings.contact?.address || ''} 
                      onChange={e => setSettings({ ...settings, contact: { ...settings.contact, address: e.target.value } })}
                      style={{ ...inputStyle, width: '100%', minHeight: '80px', resize: 'vertical' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F4F1EA', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Social Media Links</h3>
                  <label style={labelStyle}>
                    Instagram URL
                    <input 
                      type="url" 
                      placeholder="https://instagram.com/mywhiskey"
                      value={settings.social?.instagram || ''} 
                      onChange={e => setSettings({ ...settings, social: { ...settings.social, instagram: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    Facebook URL
                    <input 
                      type="url" 
                      placeholder="https://facebook.com/mywhiskey"
                      value={settings.social?.facebook || ''} 
                      onChange={e => setSettings({ ...settings, social: { ...settings.social, facebook: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    Twitter (X) URL
                    <input 
                      type="url" 
                      placeholder="https://twitter.com/mywhiskey"
                      value={settings.social?.twitter || ''} 
                      onChange={e => setSettings({ ...settings, social: { ...settings.social, twitter: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    LinkedIn URL
                    <input 
                      type="url" 
                      placeholder="https://linkedin.com/company/mywhiskey"
                      value={settings.social?.linkedin || ''} 
                      onChange={e => setSettings({ ...settings, social: { ...settings.social, linkedin: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                  <label style={labelStyle}>
                    YouTube URL
                    <input 
                      type="url" 
                      placeholder="https://youtube.com/c/mywhiskey"
                      value={settings.social?.youtube || ''} 
                      onChange={e => setSettings({ ...settings, social: { ...settings.social, youtube: e.target.value } })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div>
              <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>SEO Defaults</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2rem', fontSize: '0.875rem' }}>These values will be used if a specific page does not have its own SEO metadata defined.</p>
              
              <label style={labelStyle}>
                Default Meta Title
                <input 
                  type="text" 
                  value={settings.seo.defaultTitle} 
                  onChange={e => setSettings({ ...settings, seo: { ...settings.seo, defaultTitle: e.target.value } })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </label>
              <label style={labelStyle}>
                Default Meta Description
                <textarea 
                  rows={4}
                  value={settings.seo.defaultDescription} 
                  onChange={e => setSettings({ ...settings, seo: { ...settings.seo, defaultDescription: e.target.value } })}
                  style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
                />
              </label>
            </div>
          )}

          {activeTab === 'injection' && (
            <div>
              <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Code Injection</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2rem', fontSize: '0.875rem' }}>Add custom scripts, styles, or tracking tags to your site. This will affect public pages.</p>
              
              <label style={labelStyle}>
                Google Analytics / Tag Manager ID
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>e.g. G-XXXXXXX or GTM-XXXXXXX (Automatically injects the correct snippet)</span>
                <input 
                  type="text" 
                  placeholder="G- or GTM-"
                  value={settings.injection.googleAnalyticsId} 
                  onChange={e => setSettings({ ...settings, injection: { ...settings.injection, googleAnalyticsId: e.target.value } })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </label>
              
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2rem 0' }} />

              <label style={labelStyle}>
                Head Code
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Code added here will be injected before the closing &lt;/head&gt; tag.</span>
                <textarea 
                  rows={6}
                  placeholder="<script>...</script>"
                  value={settings.injection.headCode} 
                  onChange={e => setSettings({ ...settings, injection: { ...settings.injection, headCode: e.target.value } })}
                  style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </label>

              <label style={labelStyle}>
                Body Code
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>Code added here will be injected before the closing &lt;/body&gt; tag.</span>
                <textarea 
                  rows={6}
                  placeholder="<script>...</script>"
                  value={settings.injection.bodyCode} 
                  onChange={e => setSettings({ ...settings, injection: { ...settings.injection, bodyCode: e.target.value } })}
                  style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </label>
            </div>
          )}

          {activeTab === 'financial' && (
            <div>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Financial & Payment Settings</h2>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '2.5rem', fontSize: '0.875rem' }}>Configure payment plans, deposit percentages, convenience fees, and cutoff windows for charter bookings.</p>
              
              <label style={labelStyle}>
                Default Deposit Percentage (%)
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>The percentage of the total invoice to charge as a booking deposit (default: 20%).</span>
                <input 
                  type="number" 
                  min={0}
                  max={100}
                  value={settings.financial?.depositPercentage ?? 20} 
                  onChange={e => setSettings({ 
                    ...settings, 
                    financial: { 
                      ...settings.financial, 
                      depositPercentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) 
                    } 
                  })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </label>

              <label style={labelStyle}>
                Deposit Cutoff Period (Days Before Trip)
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>
                  If a booking is made within this many days of the departure date, the deposit option will be disabled (forcing 100% full payment). 
                  Also, this determines when the scheduled remainder balance is automatically charged (default: 7 days before trip).
                </span>
                <input 
                  type="number" 
                  min={0}
                  value={settings.financial?.depositDeadlineDays ?? 7} 
                  onChange={e => setSettings({ 
                    ...settings, 
                    financial: { 
                      ...settings.financial, 
                      depositDeadlineDays: Math.max(0, Number(e.target.value) || 0) 
                    } 
                  })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </label>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '2rem 0' }} />

              <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem', fontFamily: "'Cormorant Garamond', serif', sans-serif", fontWeight: 600, color: '#B9783B' }}>Card Convenience Fees</h3>
              <p style={{ color: '#D8C7AF', opacity: 0.6, marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                Charge an optional processing fee when guests pay via credit or debit card. Bank transfers (EFT/ACH) are always fee-free.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#121416', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input 
                    type="checkbox" 
                    id="enableConvenienceFee"
                    checked={settings.financial?.enableConvenienceFee ?? true}
                    onChange={e => setSettings({
                      ...settings,
                      financial: {
                        ...settings.financial,
                        enableConvenienceFee: e.target.checked
                      }
                    })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#B9783B' }}
                  />
                  <label htmlFor="enableConvenienceFee" style={{ fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    Enable Credit/Debit Card Convenience Fee
                  </label>
                </div>

                {(settings.financial?.enableConvenienceFee ?? true) && (
                  <label style={labelStyle}>
                    Card Convenience Fee Percentage (%)
                    <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6, fontWeight: 'normal' }}>
                      This percentage is added to credit/debit card invoice payments. EFT/ACH payments will bypass this charge.
                    </span>
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      step={0.1}
                      value={settings.financial?.convenienceFeePercentage ?? 3.5} 
                      onChange={e => setSettings({ 
                        ...settings, 
                        financial: { 
                          ...settings.financial, 
                          convenienceFeePercentage: Math.max(0, Number(e.target.value) || 0) 
                        } 
                      })}
                      style={{ ...inputStyle, width: '100%' }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
