'use client';

import { useBuilderStore, ThemeConfig, TypographySettings } from '@/store/useBuilderStore';
import * as LucideIcons from 'lucide-react';
import { Trash2, Settings, Palette, UploadCloud, Plus, Image as ImageIcon, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAllPagesWithMetadata, getSelectableLinkOptions, SelectableLinkOption, getContentItems, ContentItem } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';
import IconPickerModal from '@/components/builder/IconPickerModal';
import BulkImportModal from '@/components/builder/BulkImportModal';

const TargetSelector = ({ value, onChange, label = "Link Open Behavior" }: { value?: string, onChange: (val: string) => void, label?: string }) => {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
      {label}
      <select 
        value={value || '_self'} 
        onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)', fontSize: '0.875rem' }}
      >
        <option value="_self">Same Window</option>
        <option value="_blank">New Window</option>
        <option value="overlay">Overlay (Booking Flow)</option>
      </select>
    </label>
  );
};

const ImageUploader = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
      {label}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ ...inputStyle, flex: 1, minWidth: 0 }} 
          placeholder="External URL or Media Library..."
        />
        <button 
          onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
          style={{ 
            background: 'var(--color-surface)', 
            border: '1px solid var(--color-border)', 
            padding: '0 0.75rem', 
            borderRadius: 'var(--radius-sm)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            color: 'var(--color-foreground)'
          }} 
          title="Open Media Library"
          onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.color = 'var(--color-foreground)'; }}
        >
          <ImageIcon size={16} />
        </button>
      </div>
      <AssetLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
};

const IconSelector = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const displayValue = typeof value === 'string' ? value : '';
  const Icon = displayValue ? (LucideIcons as any)[displayValue] as React.ComponentType<any> : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
      {label}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon ? <Icon size={20} color="var(--color-foreground)" /> : <LucideIcons.HelpCircle size={20} color="var(--color-muted)" />}
        </div>
        <input 
          type="text" 
          value={displayValue} 
          onChange={(e) => onChange(e.target.value)} 
          style={{ flex: 1, minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-foreground)', outline: 'none' }} 
          placeholder="Icon name..."
        />
        <button 
          onClick={(e) => { e.preventDefault(); setIsModalOpen(true); }}
          style={{ padding: '0.5rem 0.75rem', background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
          title="Browse Icons"
        >
          <LucideIcons.Search size={16} />
          Browse
        </button>
      </div>
      <IconPickerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={(iconName) => { onChange(iconName); setIsModalOpen(false); }} 
        currentIcon={displayValue}
      />
    </div>
  );
};


const MultiImageUploader = ({ onUpload }: { onUpload: (urls: string[]) => void }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadFile(file));
      const urls = await Promise.all(uploadPromises);
      onUpload(urls);
    } catch (error) {
      console.error(error);
      alert('Upload failed. Please check your Firebase Storage rules and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <label 
      style={{ 
        flex: 1, 
        padding: '0.5rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '0.5rem', 
        background: 'var(--color-primary)', 
        border: 'none', 
        color: 'white', 
        borderRadius: 'var(--radius-sm)', 
        cursor: isUploading ? 'not-allowed' : 'pointer', 
        fontWeight: 600,
        opacity: isUploading ? 0.7 : 1,
        transition: 'opacity 0.2s'
      }}
    >
      {isUploading ? <span style={{ fontSize: '0.875rem' }}>Uploading...</span> : <><UploadCloud size={16} /> Upload Images</>}
      <input 
        type="file" 
        accept="image/*,video/*" 
        multiple
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        disabled={isUploading}
      />
    </label>
  );
};

const SwatchSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const { brandColors } = useBuilderStore();
  
  if (!brandColors || brandColors.length === 0) return null;
  
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
      {brandColors.map((swatch, i) => {
        const isSelected = value === swatch.value;
        return (
          <button 
            key={i}
            onClick={(e) => {
              e.preventDefault();
              onChange(swatch.value);
            }}
            title={`${swatch.name}: ${swatch.value}`}
            style={{ 
              width: '22px', 
              height: '22px', 
              borderRadius: '50%', 
              backgroundColor: swatch.value,
              border: isSelected ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.2)',
              boxShadow: isSelected ? '0 0 0 1px var(--color-background)' : 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.1s ease',
              transform: isSelected ? 'scale(1.1)' : 'scale(1)'
            }}
            onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1.15)'; }}
            onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1)'; }}
          />
        );
      })}
    </div>
  );
};


  const UrlSelector = ({ value, onChange, placeholder, selectableOptions }: { value: string | undefined, onChange: (val: string) => void, placeholder?: string, selectableOptions: SelectableLinkOption[] }) => {
    const isPredefinedUrl = (url: string) => {
      return selectableOptions.some(o => o.value === url);
    };
    const isCustom = !isPredefinedUrl(value || '');
  
    // We need inputStyle here for UrlSelector so it matches other inputs
    const inputStyle = {
      padding: '0.5rem', 
      borderRadius: 'var(--radius-sm)', 
      border: '1px solid var(--color-border)', 
      background: 'var(--color-surface)', 
      color: 'var(--color-foreground)',
      outline: 'none',
      fontSize: '0.875rem'
    };
  
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
        <select
          value={isCustom ? 'custom' : (value || '')}
          onChange={e => {
            const val = e.target.value;
            onChange(val === 'custom' ? '' : val);
          }}
          style={{ ...inputStyle, flex: isCustom ? '0 0 auto' : 1, width: isCustom ? '140px' : 'auto' }}
        >
          <option value="" disabled>-- Select Page --</option>
          <option value="custom">Custom URL...</option>
          {Array.from(new Set(selectableOptions.map(o => o.category))).map(category => (
            <optgroup key={category} label={category}>
              {selectableOptions.filter(o => o.category === category).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        
        {isCustom && (
          <input 
            type="text" 
            placeholder={placeholder || "https://..."}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 0, fontFamily: 'monospace' }}
          />
        )}
      </div>
    );
  };

export default function BuilderRightPanel() {
  const { selectedNodeId, nodes, updateNodeProps, removeNode, theme, updateTheme, selectNode } = useBuilderStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'style'>('settings');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalInitialText, setImportModalInitialText] = useState('');
  const [globalTab, setGlobalTab] = useState<'theme' | 'header' | 'footer'>('theme');
  const [themeSubTab, setThemeSubTab] = useState<'colors' | 'typography' | 'styles'>('colors');
  const [selectableOptions, setSelectableOptions] = useState<SelectableLinkOption[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    getSelectableLinkOptions().then(setSelectableOptions);
    getContentItems().then(setContentItems);
  }, []);

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

  return (
    <aside style={{ width: '300px', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-muted)', margin: 0 }}>
          Inspector
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {selectedNodeId && (
            <button 
              onClick={() => selectNode(null)}
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer' }}
              title="Return to Site Settings"
            >
              Done
            </button>
          )}
          {selectedNode && selectedNodeId !== 'root' && (
            <button 
              onClick={() => removeNode(selectedNodeId!)}
              style={{ color: '#ef4444', padding: '0.25rem', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              title="Delete element"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {!selectedNodeId ? (
        <>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setGlobalTab('theme')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: globalTab === 'theme' ? '2px solid var(--color-primary)' : '2px solid transparent', color: globalTab === 'theme' ? 'var(--color-primary)' : 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Theme
            </button>
            <button 
              onClick={() => setGlobalTab('header')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: globalTab === 'header' ? '2px solid var(--color-primary)' : '2px solid transparent', color: globalTab === 'header' ? 'var(--color-primary)' : 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Header
            </button>
            <button 
              onClick={() => setGlobalTab('footer')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: globalTab === 'footer' ? '2px solid var(--color-primary)' : '2px solid transparent', color: globalTab === 'footer' ? 'var(--color-primary)' : 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Footer
            </button>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {globalTab === 'theme' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', background: 'var(--color-background)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                  <button 
                    onClick={() => setThemeSubTab('colors')}
                    style={{ flex: 1, padding: '0.5rem', background: themeSubTab === 'colors' ? 'var(--color-surface)' : 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: themeSubTab === 'colors' ? 'var(--color-foreground)' : 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: themeSubTab === 'colors' ? 'var(--shadow-sm)' : 'none' }}
                  >
                    Colors
                  </button>
                  <button 
                    onClick={() => setThemeSubTab('typography')}
                    style={{ flex: 1, padding: '0.5rem', background: themeSubTab === 'typography' ? 'var(--color-surface)' : 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: themeSubTab === 'typography' ? 'var(--color-foreground)' : 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: themeSubTab === 'typography' ? 'var(--shadow-sm)' : 'none' }}
                  >
                    Typography
                  </button>
                  <button 
                    onClick={() => setThemeSubTab('styles')}
                    style={{ flex: 1, padding: '0.5rem', background: themeSubTab === 'styles' ? 'var(--color-surface)' : 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', color: themeSubTab === 'styles' ? 'var(--color-foreground)' : 'var(--color-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', boxShadow: themeSubTab === 'styles' ? 'var(--shadow-sm)' : 'none' }}
                  >
                    Styles
                  </button>
                </div>

                {themeSubTab === 'colors' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Background Color
                  <input 
                    type="color" 
                    value={theme.backgroundColor || '#1F2326'} 
                    onChange={(e) => updateTheme({ backgroundColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.backgroundColor || ''} onChange={(val) => updateTheme({ backgroundColor: val })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Surface Color <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Cards, Panels)</span>
                  <input 
                    type="color" 
                    value={theme.surfaceColor || '#1E3A4C'} 
                    onChange={(e) => updateTheme({ surfaceColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.surfaceColor || ''} onChange={(val) => updateTheme({ surfaceColor: val })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Text Color
                  <input 
                    type="color" 
                    value={theme.foregroundColor || '#F4F1EA'} 
                    onChange={(e) => updateTheme({ foregroundColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.foregroundColor || ''} onChange={(val) => updateTheme({ foregroundColor: val })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Primary Accent <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Buttons, Highlights)</span>
                  <input 
                    type="color" 
                    value={theme.primaryColor || '#B9783B'} 
                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.primaryColor || ''} onChange={(val) => updateTheme({ primaryColor: val })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Muted Color <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Borders, Subtext)</span>
                  <input 
                    type="color" 
                    value={theme.mutedColor || '#D8C7AF'} 
                    onChange={(e) => updateTheme({ mutedColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.mutedColor || ''} onChange={(val) => updateTheme({ mutedColor: val })} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Secondary Accent
                  <input 
                    type="color" 
                    value={theme.accentColor || '#708C84'} 
                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                    style={{ width: '100%', height: '40px', cursor: 'pointer', ...inputStyle, padding: '2px' }}
                  />
                  <SwatchSelector value={theme.accentColor || ''} onChange={(val) => updateTheme({ accentColor: val })} />
                </label>
                </div>
                )}

                {themeSubTab === 'typography' && theme.typography && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Heading Font
                        <select 
                          value={['Inter', 'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Oswald', 'Raleway', 'Poppins'].includes(theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '')) ? theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '') : 'custom'} 
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              updateTheme({ typography: { ...theme.typography, headingFontFamily: `'${e.target.value}', ${['Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond'].includes(e.target.value) ? 'serif' : 'sans-serif'}` } })
                            }
                          }}
                          style={inputStyle}
                        >
                          <optgroup label="Serif">
                            <option value="Cormorant Garamond">Cormorant Garamond</option>
                            <option value="Playfair Display">Playfair Display</option>
                            <option value="Lora">Lora</option>
                            <option value="Merriweather">Merriweather</option>
                            <option value="Cinzel">Cinzel</option>
                            <option value="PT Serif">PT Serif</option>
                            <option value="EB Garamond">EB Garamond</option>
                          </optgroup>
                          <optgroup label="Sans Serif">
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Oswald">Oswald</option>
                            <option value="Raleway">Raleway</option>
                            <option value="Poppins">Poppins</option>
                          </optgroup>
                          <option value="custom">Custom Google Font...</option>
                        </select>
                      </label>
                      {!['Inter', 'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Oswald', 'Raleway', 'Poppins'].includes(theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '')) && (
                        <input 
                          type="text" 
                          placeholder="e.g. Space Grotesk"
                          value={theme.typography.headingFontFamily.split(',')[0].replace(/['"]/g, '') || ''} 
                          onChange={(e) => updateTheme({ typography: { ...theme.typography, headingFontFamily: `'${e.target.value}', sans-serif` } })}
                          style={inputStyle}
                        />
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                        Body Font
                        <select 
                          value={['Inter', 'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Oswald', 'Raleway', 'Poppins'].includes(theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '')) ? theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '') : 'custom'} 
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              updateTheme({ typography: { ...theme.typography, bodyFontFamily: `'${e.target.value}', ${['Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond'].includes(e.target.value) ? 'serif' : 'sans-serif'}` } })
                            }
                          }}
                          style={inputStyle}
                        >
                          <optgroup label="Serif">
                            <option value="Cormorant Garamond">Cormorant Garamond</option>
                            <option value="Playfair Display">Playfair Display</option>
                            <option value="Lora">Lora</option>
                            <option value="Merriweather">Merriweather</option>
                            <option value="Cinzel">Cinzel</option>
                            <option value="PT Serif">PT Serif</option>
                            <option value="EB Garamond">EB Garamond</option>
                          </optgroup>
                          <optgroup label="Sans Serif">
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Open Sans">Open Sans</option>
                            <option value="Lato">Lato</option>
                            <option value="Oswald">Oswald</option>
                            <option value="Raleway">Raleway</option>
                            <option value="Poppins">Poppins</option>
                          </optgroup>
                          <option value="custom">Custom Google Font...</option>
                        </select>
                      </label>
                      {!['Inter', 'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Cinzel', 'PT Serif', 'EB Garamond', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Oswald', 'Raleway', 'Poppins'].includes(theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '')) && (
                        <input 
                          type="text" 
                          placeholder="e.g. Space Grotesk"
                          value={theme.typography.bodyFontFamily.split(',')[0].replace(/['"]/g, '') || ''} 
                          onChange={(e) => updateTheme({ typography: { ...theme.typography, bodyFontFamily: `'${e.target.value}', sans-serif` } })}
                          style={inputStyle}
                        />
                      )}
                    </div>

                    <div style={{ height: '1px', background: 'var(--color-border)' }} />

                    {/* Typography Sizes Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 40px', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', paddingBottom: '0.25rem' }}>
                      <span>Element</span>
                      <span>Desktop</span>
                      <span>Mobile</span>
                      <span style={{ textAlign: 'center' }}>Bold</span>
                    </div>

                    {/* Typography Sizes & Weights */}
                    {(['h1', 'h2', 'h3', 'large', 'p', 'small', 'a'] as const).map(tag => {
                      const settings = theme.typography[tag] || { fontSize: tag === 'large' ? '1.2rem' : '', fontWeight: '400' };
                      const mobileKey = `${tag}Mobile` as keyof ThemeConfig['typography'];
                      const mobileSettings = theme.typography[mobileKey] as TypographySettings || { fontSize: '', fontWeight: '400' };
                      const isBold = settings.fontWeight === 'bold' || parseInt(settings.fontWeight || '') > 600;
                      
                      return (
                        <div key={tag} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 40px', gap: '0.5rem', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }} title={tag === 'large' ? 'Large Body' : ''}>{tag}</div>
                          
                          {/* Desktop input */}
                          <input 
                            type="text" 
                            placeholder="Desktop size"
                            value={settings.fontSize || ''} 
                            onChange={(e) => updateTheme({ 
                              typography: { 
                                ...theme.typography, 
                                [tag]: { ...settings, fontSize: e.target.value } 
                              } 
                            })}
                            style={{ ...inputStyle, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                          />
                          
                          {/* Mobile input */}
                          <input 
                            type="text" 
                            placeholder="Mobile size"
                            value={mobileSettings?.fontSize || ''} 
                            onChange={(e) => updateTheme({ 
                              typography: { 
                                ...theme.typography, 
                                [mobileKey]: { ...mobileSettings, fontSize: e.target.value } 
                              } 
                            })}
                            style={{ ...inputStyle, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                          />
                          
                          {/* Bold Toggle */}
                          <button 
                            onClick={() => {
                              const newWeight = isBold ? '400' : '700';
                              updateTheme({ 
                                typography: { 
                                  ...theme.typography, 
                                  [tag]: { ...settings, fontWeight: newWeight },
                                  [mobileKey]: { ...mobileSettings, fontWeight: newWeight }
                                } 
                              });
                            }}
                            style={{ 
                              padding: '0.35rem', 
                              background: isBold ? 'var(--color-primary)' : 'var(--color-background)', 
                              color: isBold ? 'white' : 'var(--color-muted)',
                              border: '1px solid var(--color-border)', 
                              borderRadius: 'var(--radius-sm)', 
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Toggle Bold"
                          >
                            B
                          </button>
                        </div>
                      )
                    })}
                    <div style={{ height: '1px', background: 'var(--color-border)' }} />

                    <h3 style={{ marginTop: '1rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Page Layout</h3>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Page Edge Padding (Root)
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Set to 0 to allow full-width sections to touch the edge.</span>
                      <input 
                        type="text" 
                        placeholder="e.g. 0 or 2rem"
                        value={nodes['root']?.props?.style?.padding || ''} 
                        onChange={(e) => updateNodeProps('root', { style: { ...nodes['root']?.props?.style, padding: e.target.value } })}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}

                {themeSubTab === 'styles' && theme.styles && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                      Global Border Radius
                      <select 
                        value={theme.styles.radius} 
                        onChange={(e) => updateTheme({ styles: { ...theme.styles, radius: e.target.value } })}
                        style={inputStyle}
                      >
                        <option value="0">None</option>
                        <option value="0.25rem">Small (4px)</option>
                        <option value="0.5rem">Medium (8px)</option>
                        <option value="1rem">Large (16px)</option>
                        <option value="1.5rem">Extra Large (24px)</option>
                        <option value="9999px">Pill (9999px)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
                      Global Section Padding
                      <input 
                        type="text" 
                        value={theme.styles.padding} 
                        onChange={(e) => updateTheme({ styles: { ...theme.styles, padding: e.target.value } })}
                        placeholder="e.g. 4rem 2rem"
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {globalTab === 'header' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Logo Text
                  <input 
                    type="text" 
                    value={theme.header?.logoText || ''} 
                    onChange={(e) => updateTheme({ header: { ...theme.header, logoText: e.target.value } })}
                    style={inputStyle}
                  />
                </label>

                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--color-primary)' }}>Header Colors</div>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Background Color
                  <input type="text" value={theme.header?.bgColor || '#171717'} onChange={(e) => updateTheme({ header: { ...theme.header, bgColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.header?.bgColor || '#171717'} onChange={(val) => updateTheme({ header: { ...theme.header, bgColor: val } })} />
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Text Color
                  <input type="text" value={theme.header?.textColor || '#ffffff'} onChange={(e) => updateTheme({ header: { ...theme.header, textColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.header?.textColor || '#ffffff'} onChange={(val) => updateTheme({ header: { ...theme.header, textColor: val } })} />
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Accent / Hover Color
                  <input type="text" value={theme.header?.accentColor || '#c05c08'} onChange={(e) => updateTheme({ header: { ...theme.header, accentColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.header?.accentColor || '#c05c08'} onChange={(val) => updateTheme({ header: { ...theme.header, accentColor: val } })} />
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                  <input 
                    type="checkbox" 
                    checked={!!theme.header?.sticky} 
                    onChange={(e) => updateTheme({ header: { ...theme.header, sticky: e.target.checked } })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>Sticky / Fixed Header to Top</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                  <input 
                    type="checkbox" 
                    checked={theme.header?.fullWidth !== false} 
                    onChange={(e) => updateTheme({ header: { ...theme.header, fullWidth: e.target.checked } })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>Full Width Layout (Edge to Edge)</span>
                </label>
                
                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!theme.header?.showWeather} 
                      onChange={(e) => updateTheme({ header: { ...theme.header, showWeather: e.target.checked, weatherLocation: theme.header?.weatherLocation || 'Destin, FL, USA' } })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: 600 }}>Show Weather Widget</span>
                  </label>
                  
                  {theme.header?.showWeather && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Location
                      <input 
                        type="text" 
                        value={theme.header?.weatherLocation || ''} 
                        onChange={(e) => updateTheme({ header: { ...theme.header, weatherLocation: e.target.value } })}
                        style={inputStyle}
                        placeholder="e.g. Destin, FL, USA"
                      />
                    </label>
                  )}
                </div>

              </div>
            )}

            {globalTab === 'footer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Copyright / Footer Text
                  <textarea 
                    value={theme.footer?.text || ''} 
                    onChange={(e) => updateTheme({ footer: { ...theme.footer, text: e.target.value } })}
                    rows={2}
                    style={inputStyle}
                  />
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Brand Description
                  <textarea 
                    value={theme.footer?.description || ''} 
                    onChange={(e) => updateTheme({ footer: { ...theme.footer, description: e.target.value } })}
                    rows={3}
                    style={inputStyle}
                  />
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input 
                    type="checkbox" 
                    checked={theme.footer?.showNewsletter || false} 
                    onChange={(e) => updateTheme({ footer: { ...theme.footer, showNewsletter: e.target.checked } })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600 }}>Enable Newsletter Subscribe Form</span>
                </label>
                
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem' }}>Colors</div>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Background Color
                  <input type="text" value={theme.footer?.bgColor || '#0B0C0E'} onChange={(e) => updateTheme({ footer: { ...theme.footer, bgColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.footer?.bgColor || '#0B0C0E'} onChange={(val) => updateTheme({ footer: { ...theme.footer, bgColor: val } })} />
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Text Color
                  <input type="text" value={theme.footer?.textColor || '#F4F1EA'} onChange={(e) => updateTheme({ footer: { ...theme.footer, textColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.footer?.textColor || '#F4F1EA'} onChange={(val) => updateTheme({ footer: { ...theme.footer, textColor: val } })} />
                </label>
                
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Accent Color
                  <input type="text" value={theme.footer?.accentColor || '#B9783B'} onChange={(e) => updateTheme({ footer: { ...theme.footer, accentColor: e.target.value } })} style={inputStyle} />
                  <SwatchSelector value={theme.footer?.accentColor || '#B9783B'} onChange={(val) => updateTheme({ footer: { ...theme.footer, accentColor: val } })} />
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
                
                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem' }}>Contact Info</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Phone Number
                  <input type="text" placeholder="+1 (555) 123-4567" value={theme.footer?.contact?.phone || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, contact: { ...theme.footer?.contact, phone: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Email Address
                  <input type="email" placeholder="info@example.com" value={theme.footer?.contact?.email || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, contact: { ...theme.footer?.contact, email: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Physical Address
                  <textarea placeholder="123 Marina Bay&#10;City, State 12345" value={theme.footer?.contact?.address || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, contact: { ...theme.footer?.contact, address: e.target.value } } })} rows={3} style={inputStyle} />
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem' }}>Social Media Links</div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Instagram URL
                  <input type="url" placeholder="https://instagram.com/..." value={theme.footer?.social?.instagram || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, social: { ...theme.footer?.social, instagram: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Facebook URL
                  <input type="url" placeholder="https://facebook.com/..." value={theme.footer?.social?.facebook || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, social: { ...theme.footer?.social, facebook: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Twitter / X URL
                  <input type="url" placeholder="https://twitter.com/..." value={theme.footer?.social?.twitter || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, social: { ...theme.footer?.social, twitter: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  LinkedIn URL
                  <input type="url" placeholder="https://linkedin.com/..." value={theme.footer?.social?.linkedin || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, social: { ...theme.footer?.social, linkedin: e.target.value } } })} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  YouTube URL
                  <input type="url" placeholder="https://youtube.com/..." value={theme.footer?.social?.youtube || ''} onChange={(e) => updateTheme({ footer: { ...theme.footer, social: { ...theme.footer?.social, youtube: e.target.value } } })} style={inputStyle} />
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem' }}>Legal Policy Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(theme.footer?.legalLinks || []).map((link, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Label (e.g. Privacy Policy)" 
                        value={link.label} 
                        onChange={(e) => {
                          const newLinks = [...(theme.footer?.legalLinks || [])];
                          newLinks[idx] = { ...newLinks[idx], label: e.target.value };
                          updateTheme({ footer: { ...theme.footer, legalLinks: newLinks } });
                        }}
                        style={{ ...inputStyle, flex: 1 }} 
                      />
                      <div style={{ flex: 1.2 }}>
                        <UrlSelector 
                          value={link.url} 
                          onChange={(val) => {
                            const newLinks = [...(theme.footer?.legalLinks || [])];
                            newLinks[idx] = { ...newLinks[idx], url: val };
                            updateTheme({ footer: { ...theme.footer, legalLinks: newLinks } });
                          }}
                          selectableOptions={selectableOptions}
                          placeholder="Link URL"
                        />
                      </div>
                      <select
                        value={link.target || '_self'}
                        onChange={(e) => {
                          const newLinks = [...(theme.footer?.legalLinks || [])];
                          newLinks[idx] = { ...newLinks[idx], target: e.target.value as '_self' | '_blank' | 'overlay' };
                          updateTheme({ footer: { ...theme.footer, legalLinks: newLinks } });
                        }}
                        style={{ ...inputStyle, flex: 0.8 }}
                      >
                        <option value="_self">Same Window</option>
                        <option value="_blank">New Window</option>
                        <option value="overlay">Overlay</option>
                      </select>
                      <button 
                        onClick={() => {
                          const newLinks = [...(theme.footer?.legalLinks || [])];
                          newLinks.splice(idx, 1);
                          updateTheme({ footer: { ...theme.footer, legalLinks: newLinks } });
                        }}
                        style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', color: 'var(--color-muted)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newLinks = [...(theme.footer?.legalLinks || []), { label: '', url: '' }];
                      updateTheme({ footer: { ...theme.footer, legalLinks: newLinks } });
                    }}
                    style={{ padding: '0.5rem', background: 'var(--color-surface)', color: 'var(--color-foreground)', border: '1px dashed var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem', marginTop: '0.5rem' }}
                  >
                    + Add Legal Link
                  </button>
                </div>

              </div>
            )}
          </div>
        </>
      ) : selectedNode ? (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'settings' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'settings' ? 'var(--color-primary)' : 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <Settings size={14} /> Settings
            </button>
            <button 
              onClick={() => setActiveTab('style')}
              style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'style' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'style' ? 'var(--color-primary)' : 'var(--color-muted)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <Palette size={14} /> Style
            </button>
          </div>

          <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '1.1rem' }}>{selectedNode.type}</div>
            
            {activeTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedNode.type === 'Text' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Text Content
                      <textarea value={selectedNode.props.text || ''} onChange={(e) => updateNodeProps(selectedNodeId, { text: e.target.value })} rows={4} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Typographic Style
                      <select 
                        value={selectedNode.props.typographyPreset || ''} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { typographyPreset: e.target.value })}
                        style={inputStyle as any}
                      >
                        <option value="">Default (Paragraph)</option>
                        <option value="h1">Heading 1 (H1)</option>
                        <option value="h2">Heading 2 (H2)</option>
                        <option value="h3">Heading 3 (H3)</option>
                        <option value="large">Large Body text</option>
                        <option value="small">Small Body text</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'Button' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Button Label
                    <input type="text" value={selectedNode.props.text || ''} onChange={(e) => updateNodeProps(selectedNodeId, { text: e.target.value })} style={inputStyle} />
                  </label>
                )}

                {selectedNode.type === 'Image' && (
                  <ImageUploader 
                    label="Image URL" 
                    value={selectedNode.props.src || ''} 
                    onChange={(val) => updateNodeProps(selectedNodeId, { src: val })} 
                  />
                )}

                {selectedNode.type === 'Hero' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text
                      <input type="text" value={selectedNode.props.buttonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Link URL
                      <UrlSelector value={selectedNode.props.buttonLink} onChange={(val) => updateNodeProps(selectedNodeId, { buttonLink: val })} selectableOptions={selectableOptions} />
                    </label>
                    <TargetSelector value={selectedNode.props.buttonTarget} onChange={(val) => updateNodeProps(selectedNodeId, { buttonTarget: val })} />
                    <ImageUploader 
                      label="Background Image URL" 
                      value={selectedNode.props.bgImage || ''} 
                      onChange={(val) => updateNodeProps(selectedNodeId, { bgImage: val })} 
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Overlay Darkness ({(typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6).toFixed(2)})
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { overlayOpacity: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.props.fullWidth !== false} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { fullWidth: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Full Width Layout</span>
                    </label>
                  </>
                )}

                {selectedNode.type === 'Specs' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Length
                      <textarea value={selectedNode.props.length || ''} onChange={(e) => updateNodeProps(selectedNodeId, { length: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Cabins
                      <textarea value={selectedNode.props.cabins || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cabins: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Guests
                      <textarea value={selectedNode.props.guests || ''} onChange={(e) => updateNodeProps(selectedNodeId, { guests: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Speed
                      <textarea value={selectedNode.props.speed || ''} onChange={(e) => updateNodeProps(selectedNodeId, { speed: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'Gallery' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Gallery Title
                      <textarea value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Gallery Images</div>
                      {(!selectedNode.props.images || selectedNode.props.images.length === 0) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>No images in gallery yet.</div>
                      )}
                      {selectedNode.props.images && selectedNode.props.images.map((imgUrl: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>
                            {imgUrl ? (
                              <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                                <UploadCloud size={16} />
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <ImageUploader 
                              label={`Image ${idx + 1}`} 
                              value={imgUrl} 
                              onChange={(val) => {
                                const newImages = [...selectedNode.props.images];
                                newImages[idx] = val;
                                updateNodeProps(selectedNodeId, { images: newImages });
                              }} 
                            />
                          </div>
                          <button 
                            onClick={() => {
                              const newImages = selectedNode.props.images.filter((_: any, i: number) => i !== idx);
                              updateNodeProps(selectedNodeId, { images: newImages });
                            }} 
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            const currentImages = selectedNode.props.images || [];
                            updateNodeProps(selectedNodeId, { images: [...currentImages, ''] });
                          }} 
                          style={{ flex: 1, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          <Plus size={16} /> Add URL
                        </button>
                        <MultiImageUploader 
                          onUpload={(urls) => {
                            const currentImages = selectedNode.props.images || [];
                            // If there's exactly one empty image slot at the end, replace it. Otherwise just append.
                            let newImages = [...currentImages];
                            if (newImages.length > 0 && newImages[newImages.length - 1] === '') {
                              newImages.pop();
                            }
                            updateNodeProps(selectedNodeId, { images: [...newImages, ...urls] });
                          }}
                        />
                      </div>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'DeckPlan' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Title
                      <textarea value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <ImageUploader 
                      label="Image URL" 
                      value={selectedNode.props.imageUrl || ''} 
                      onChange={(val) => updateNodeProps(selectedNodeId, { imageUrl: val })} 
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Details Text
                      <textarea value={selectedNode.props.details || ''} onChange={(e) => updateNodeProps(selectedNodeId, { details: e.target.value })} rows={4} style={inputStyle} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'BookingForm' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Title
                      <textarea value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subtitle
                      <textarea value={selectedNode.props.subtitle || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subtitle: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text
                      <input type="text" value={selectedNode.props.buttonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonText: e.target.value })} style={inputStyle} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'Divider' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Thickness (e.g. 1px, 2px)
                      <input type="text" value={selectedNode.props.thickness || '1px'} onChange={(e) => updateNodeProps(selectedNodeId, { thickness: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Color
                      <input type="text" value={selectedNode.props.color || 'var(--color-border)'} onChange={(e) => updateNodeProps(selectedNodeId, { color: e.target.value })} style={inputStyle} placeholder="e.g. #888 or var(--color-border)" />
                      <SwatchSelector value={selectedNode.props.color || ''} onChange={(val) => updateNodeProps(selectedNodeId, { color: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Style
                      <select value={selectedNode.props.style || 'solid'} onChange={(e) => updateNodeProps(selectedNodeId, { style: e.target.value })} style={inputStyle}>
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Margin (e.g. 2rem 0)
                      <input type="text" value={selectedNode.props.margin || '2rem 0'} onChange={(e) => updateNodeProps(selectedNodeId, { margin: e.target.value })} style={inputStyle} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'Icon' && (
                  <>
                    <IconSelector label="Icon Name (from lucide.dev)" value={selectedNode.props.iconName || 'Anchor'} onChange={(val) => updateNodeProps(selectedNodeId, { iconName: val })} />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Size (px)
                      <input type="number" value={selectedNode.props.size || 48} onChange={(e) => updateNodeProps(selectedNodeId, { size: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Color
                      <input type="text" value={selectedNode.props.color || 'var(--color-primary)'} onChange={(e) => updateNodeProps(selectedNodeId, { color: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.color || ''} onChange={(val) => updateNodeProps(selectedNodeId, { color: val })} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'Video' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Video URL <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(YouTube, Vimeo, or MP4)</span>
                      <input type="text" value={selectedNode.props.videoUrl || ''} onChange={(e) => updateNodeProps(selectedNodeId, { videoUrl: e.target.value })} style={inputStyle} placeholder="https://..." />
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '-0.5rem', marginBottom: '0.5rem', fontStyle: 'italic', background: 'var(--color-background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--color-primary)' }}>
                      <strong>Note:</strong> Advanced playback speed and precise trimming require directly hosted videos (e.g. <strong>.mp4</strong>). YouTube/Vimeo embedding restricts cross-origin programmatic speed control.
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!selectedNode.props.autoPlay} onChange={(e) => updateNodeProps(selectedNodeId, { autoPlay: e.target.checked })} />
                      Auto Play
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedNode.props.muted !== false} onChange={(e) => updateNodeProps(selectedNodeId, { muted: e.target.checked })} />
                      Muted
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedNode.props.showControls !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showControls: e.target.checked })} />
                      Show Controls (YouTube/Player)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!selectedNode.props.loop} onChange={(e) => updateNodeProps(selectedNodeId, { loop: e.target.checked })} />
                      Loop
                    </label>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Trim Start (sec)
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          placeholder="0"
                          value={selectedNode.props.startTime ?? 0} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { startTime: parseFloat(e.target.value) || 0 })} 
                          style={inputStyle} 
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Trim End (sec)
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          placeholder="None"
                          value={selectedNode.props.endTime ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            updateNodeProps(selectedNodeId, { endTime: val });
                          }} 
                          style={inputStyle} 
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Playback Speed ({(selectedNode.props.playbackSpeed || 1.0).toFixed(2)}x)
                      <input 
                        type="range" 
                        min="0.25" 
                        max="2" 
                        step="0.25" 
                        value={selectedNode.props.playbackSpeed || 1.0} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { playbackSpeed: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '2px' }}>
                        <span>Slower</span>
                        <span>Original</span>
                        <span>Faster</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Object Fit
                      <select 
                        value={selectedNode.props.objectFit || 'contain'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { objectFit: e.target.value })} 
                        style={inputStyle as any}
                      >
                        <option value="contain">Contain (Show Whole Video)</option>
                        <option value="cover">Cover (Fill Area, Crop Edges)</option>
                        <option value="fill">Fill (Stretch)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Overlay Darkness ({(typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0).toFixed(2)})
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { overlayOpacity: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </label>
                  </>
                )}

                {selectedNode.type === 'Html' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Embed HTML Code
                      <textarea 
                        rows={12}
                        value={selectedNode.props.htmlCode || ''} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { htmlCode: e.target.value })} 
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }} 
                        placeholder="<div class='my-widget'>...</div>"
                      />
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem', lineHeight: '1.5', background: 'rgba(var(--color-primary-rgb), 0.05)', borderLeft: '2px solid var(--color-primary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <strong>💡 Pro Tip:</strong> You can paste raw HTML, <code>&lt;iframe&gt;</code> widgets, inline CSS <code>&lt;style&gt;</code> blocks, and even <code>&lt;script&gt;</code> tags here. Script elements will be executed dynamically when the block loads on the live site.
                    </div>
                  </>
                )}

                {selectedNode.type === 'Map' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Map Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} placeholder="e.g. Our Location" />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subtitle
                      <input type="text" value={selectedNode.props.subtitle || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subtitle: e.target.value })} style={inputStyle} placeholder="e.g. Port Hercules, Monaco" />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Location Query
                      <input type="text" value={selectedNode.props.locationQuery || ''} onChange={(e) => updateNodeProps(selectedNodeId, { locationQuery: e.target.value })} style={inputStyle} placeholder="e.g. Monaco Port, Monaco" />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Zoom Level (1–20)
                      <input type="number" min="1" max="20" value={selectedNode.props.zoomLevel || 14} onChange={(e) => updateNodeProps(selectedNodeId, { zoomLevel: Number(e.target.value) })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      <input type="checkbox" checked={selectedNode.props.isSatellite || false} onChange={(e) => updateNodeProps(selectedNodeId, { isSatellite: e.target.checked })} />
                      Show Satellite View
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Map Visual Theme
                      <select 
                        value={selectedNode.props.mapTheme || 'standard'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mapTheme: e.target.value })} 
                        style={inputStyle as any}
                      >
                        <option value="standard">Standard (Color)</option>
                        <option value="grayscale">Monochrome Grayscale</option>
                        <option value="dark">Luxury Dark Mode</option>
                        <option value="luxuryBlue">Maritime Royal Blue</option>
                        <option value="sepia">Vintage Sepia</option>
                        <option value="desaturated">Subtle / Desaturated</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'VideoHero' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text
                      <input type="text" value={selectedNode.props.buttonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Link URL
                      <UrlSelector value={selectedNode.props.buttonLink} onChange={(val) => updateNodeProps(selectedNodeId, { buttonLink: val })} selectableOptions={selectableOptions} />
                    </label>
                    <TargetSelector value={selectedNode.props.buttonTarget} onChange={(val) => updateNodeProps(selectedNodeId, { buttonTarget: val })} />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Background Video URL <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(YouTube, Vimeo, or MP4)</span>
                      <input type="text" value={selectedNode.props.videoUrl || ''} onChange={(e) => updateNodeProps(selectedNodeId, { videoUrl: e.target.value })} style={inputStyle} placeholder="https://..." />
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '-0.5rem', marginBottom: '0.5rem', fontStyle: 'italic', background: 'var(--color-background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--color-primary)' }}>
                      <strong>Note:</strong> Advanced playback speed and precise trimming require directly hosted videos (e.g. <strong>.mp4</strong>). YouTube/Vimeo embedding restricts cross-origin programmatic speed control.
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Overlay Darkness ({(typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.55).toFixed(2)})
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.55} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { overlayOpacity: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.props.loop !== false} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { loop: e.target.checked })} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Loop Video</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.props.showControls === true} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { showControls: e.target.checked })} 
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Show Controls (YouTube/Player)</span>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Trim Start (sec)
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          placeholder="e.g. 0"
                          value={selectedNode.props.startTime ?? 0} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { startTime: parseFloat(e.target.value) || 0 })} 
                          style={inputStyle} 
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Trim End (sec)
                        <input 
                          type="number" 
                          min="0" 
                          step="0.5"
                          placeholder="None"
                          value={selectedNode.props.endTime ?? ''} 
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            updateNodeProps(selectedNodeId, { endTime: val });
                          }} 
                          style={inputStyle} 
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Playback Speed ({(selectedNode.props.playbackSpeed || 1.0).toFixed(2)}x)
                      <input 
                        type="range" 
                        min="0.25" 
                        max="2" 
                        step="0.25" 
                        value={selectedNode.props.playbackSpeed || 1.0} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { playbackSpeed: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '2px' }}>
                        <span>Slower</span>
                        <span>Original</span>
                        <span>Faster</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Object Fit
                      <select 
                        value={selectedNode.props.objectFit || 'cover'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { objectFit: e.target.value })} 
                        style={inputStyle as any}
                      >
                        <option value="cover">Cover (Fill Area, Crop Edges)</option>
                        <option value="contain">Contain (Show Whole Video)</option>
                        <option value="fill">Fill (Stretch)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.props.fullWidth !== false} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { fullWidth: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Full Width Layout</span>
                    </label>
                  </>
                )}

                {selectedNode.type === 'Accordion' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>FAQ Items</div>
                      {(selectedNode.props.items || []).map((item: { question: string; answer: string }, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input type="text" placeholder="Question" value={item.question} onChange={(e) => { const items = [...(selectedNode.props.items || [])]; items[idx] = { ...items[idx], question: e.target.value }; updateNodeProps(selectedNodeId, { items }); }} style={{ ...inputStyle, fontWeight: 600 }} />
                          <textarea rows={3} placeholder="Answer (Markdown supported)" value={item.answer} onChange={(e) => { const items = [...(selectedNode.props.items || [])]; items[idx] = { ...items[idx], answer: e.target.value }; updateNodeProps(selectedNodeId, { items }); }} style={inputStyle} />
                          <button onClick={() => { const items = (selectedNode.props.items || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { items }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const items = [...(selectedNode.props.items || []), { question: 'New Question', answer: 'Answer here...' }]; updateNodeProps(selectedNodeId, { items }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Item</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Amenities' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Features</div>
                      {(selectedNode.props.features || []).map((f: { icon: string; title: string; description: string }, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <IconSelector label="Icon" value={f.icon || ''} onChange={(val) => { const features = [...(selectedNode.props.features || [])]; features[idx] = { ...features[idx], icon: val }; updateNodeProps(selectedNodeId, { features }); }} />
                          <input type="text" placeholder="Title" value={f.title} onChange={(e) => { const features = [...(selectedNode.props.features || [])]; features[idx] = { ...features[idx], title: e.target.value }; updateNodeProps(selectedNodeId, { features }); }} style={{ ...inputStyle, fontWeight: 600 }} />
                          <input type="text" placeholder="Description" value={f.description} onChange={(e) => { const features = [...(selectedNode.props.features || [])]; features[idx] = { ...features[idx], description: e.target.value }; updateNodeProps(selectedNodeId, { features }); }} style={inputStyle} />
                          <button onClick={() => { const features = (selectedNode.props.features || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { features }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const features = [...(selectedNode.props.features || []), { icon: 'Star', title: 'New Feature', description: '' }]; updateNodeProps(selectedNodeId, { features }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Feature</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Pricing' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Specs Rows</div>
                      {(selectedNode.props.specs || []).map((s: { label: string; value: string }, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="text" placeholder="Label" value={s.label} onChange={(e) => { const specs = [...(selectedNode.props.specs || [])]; specs[idx] = { ...specs[idx], label: e.target.value }; updateNodeProps(selectedNodeId, { specs }); }} style={{ ...inputStyle, flex: 1 }} />
                          <input type="text" placeholder="Value" value={s.value} onChange={(e) => { const specs = [...(selectedNode.props.specs || [])]; specs[idx] = { ...specs[idx], value: e.target.value }; updateNodeProps(selectedNodeId, { specs }); }} style={{ ...inputStyle, flex: 1 }} />
                          <button onClick={() => { const specs = (selectedNode.props.specs || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { specs }); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>âœ•</button>
                        </div>
                      ))}
                      <button onClick={() => { const specs = [...(selectedNode.props.specs || []), { label: '', value: '' }]; updateNodeProps(selectedNodeId, { specs }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Spec</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Pricing Rows</div>
                      {(selectedNode.props.pricing || []).map((p: { season: string; rate: string }, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="text" placeholder="Season" value={p.season} onChange={(e) => { const pricing = [...(selectedNode.props.pricing || [])]; pricing[idx] = { ...pricing[idx], season: e.target.value }; updateNodeProps(selectedNodeId, { pricing }); }} style={{ ...inputStyle, flex: 1 }} />
                          <input type="text" placeholder="Rate" value={p.rate} onChange={(e) => { const pricing = [...(selectedNode.props.pricing || [])]; pricing[idx] = { ...pricing[idx], rate: e.target.value }; updateNodeProps(selectedNodeId, { pricing }); }} style={{ ...inputStyle, flex: 1 }} />
                          <button onClick={() => { const pricing = (selectedNode.props.pricing || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { pricing }); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>âœ•</button>
                        </div>
                      ))}
                      <button onClick={() => { const pricing = [...(selectedNode.props.pricing || []), { season: '', rate: '' }]; updateNodeProps(selectedNodeId, { pricing }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Rate</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Crew' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Crew Members</div>
                      {(selectedNode.props.crew || []).map((m: { image: string; name: string; role: string; bio: string }, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <ImageUploader label="Photo" value={m.image} onChange={(v) => { const crew = [...(selectedNode.props.crew || [])]; crew[idx] = { ...crew[idx], image: v }; updateNodeProps(selectedNodeId, { crew }); }} />
                          <input type="text" placeholder="Full Name" value={m.name} onChange={(e) => { const crew = [...(selectedNode.props.crew || [])]; crew[idx] = { ...crew[idx], name: e.target.value }; updateNodeProps(selectedNodeId, { crew }); }} style={{ ...inputStyle, fontWeight: 600 }} />
                          <input type="text" placeholder="Role / Title" value={m.role} onChange={(e) => { const crew = [...(selectedNode.props.crew || [])]; crew[idx] = { ...crew[idx], role: e.target.value }; updateNodeProps(selectedNodeId, { crew }); }} style={inputStyle} />
                          <textarea rows={3} placeholder="Bio" value={m.bio} onChange={(e) => { const crew = [...(selectedNode.props.crew || [])]; crew[idx] = { ...crew[idx], bio: e.target.value }; updateNodeProps(selectedNodeId, { crew }); }} style={inputStyle} />
                          <button onClick={() => { const crew = (selectedNode.props.crew || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { crew }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const crew = [...(selectedNode.props.crew || []), { image: '', name: '', role: '', bio: '' }]; updateNodeProps(selectedNodeId, { crew }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Member</button>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'Itinerary' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Days</div>
                      {(selectedNode.props.days || []).map((d: { dayNumber: number; location: string; description: string; image: string }, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" placeholder="Day #" value={d.dayNumber} onChange={(e) => { const days = [...(selectedNode.props.days || [])]; days[idx] = { ...days[idx], dayNumber: Number(e.target.value) }; updateNodeProps(selectedNodeId, { days }); }} style={{ ...inputStyle, width: '70px' }} />
                            <input type="text" placeholder="Location" value={d.location} onChange={(e) => { const days = [...(selectedNode.props.days || [])]; days[idx] = { ...days[idx], location: e.target.value }; updateNodeProps(selectedNodeId, { days }); }} style={{ ...inputStyle, flex: 1 }} />
                          </div>
                          <textarea rows={2} placeholder="Description" value={d.description} onChange={(e) => { const days = [...(selectedNode.props.days || [])]; days[idx] = { ...days[idx], description: e.target.value }; updateNodeProps(selectedNodeId, { days }); }} style={inputStyle} />
                          <ImageUploader label="Photo" value={d.image} onChange={(v) => { const days = [...(selectedNode.props.days || [])]; days[idx] = { ...days[idx], image: v }; updateNodeProps(selectedNodeId, { days }); }} />
                          <button onClick={() => { const days = (selectedNode.props.days || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { days }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const days = [...(selectedNode.props.days || []), { dayNumber: (selectedNode.props.days?.length || 0) + 1, location: '', description: '', image: '' }]; updateNodeProps(selectedNodeId, { days }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Day</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'Testimonials' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Section Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Quotes</div>
                      {(selectedNode.props.quotes || []).map((q: { text: string; author: string }, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea rows={3} placeholder="Quote text" value={q.text} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], text: e.target.value }; updateNodeProps(selectedNodeId, { quotes }); }} style={inputStyle} />
                          <input type="text" placeholder="â€” Author Name" value={q.author} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], author: e.target.value }; updateNodeProps(selectedNodeId, { quotes }); }} style={inputStyle} />
                          <button onClick={() => { const quotes = (selectedNode.props.quotes || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { quotes }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const quotes = [...(selectedNode.props.quotes || []), { text: '', author: '' }]; updateNodeProps(selectedNodeId, { quotes }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Quote</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'EnhancedHero' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Primary Button Text
                      <input type="text" value={selectedNode.props.primaryButtonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { primaryButtonText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Primary Button Link
                      <UrlSelector value={selectedNode.props.primaryButtonLink} onChange={(val) => updateNodeProps(selectedNodeId, { primaryButtonLink: val })} selectableOptions={selectableOptions} placeholder="e.g. /about or https://..." />
                    </label>
                    <TargetSelector label="Primary Link Behavior" value={selectedNode.props.primaryButtonTarget} onChange={(val) => updateNodeProps(selectedNodeId, { primaryButtonTarget: val })} />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Secondary Button Text
                      <input type="text" value={selectedNode.props.secondaryButtonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { secondaryButtonText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Secondary Button Link
                      <UrlSelector value={selectedNode.props.secondaryButtonLink} onChange={(val) => updateNodeProps(selectedNodeId, { secondaryButtonLink: val })} selectableOptions={selectableOptions} placeholder="e.g. /contact or https://..." />
                    </label>
                    <TargetSelector label="Secondary Link Behavior" value={selectedNode.props.secondaryButtonTarget} onChange={(val) => updateNodeProps(selectedNodeId, { secondaryButtonTarget: val })} />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Location Text
                      <input type="text" value={selectedNode.props.locationText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { locationText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedNode.props.fullWidth !== false} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { fullWidth: e.target.checked })}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600 }}>Full Width Background (Edge to Edge)</span>
                    </label>
                    <ImageUploader 
                      label="Background Image URL" 
                      value={selectedNode.props.bgImage || ''} 
                      onChange={(val) => updateNodeProps(selectedNodeId, { bgImage: val })} 
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Text Alignment
                      <select 
                        value={selectedNode.props.textAlignment || 'center'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { textAlignment: e.target.value })} 
                        style={inputStyle}
                      >
                        <option value="center">Center (Full Width)</option>
                        <option value="left-half">Left Half</option>
                        <option value="right-half">Right Half</option>
                      </select>
                    </label>

                    {(selectedNode.props.textAlignment === 'left-half' || selectedNode.props.textAlignment === 'right-half') ? (
                      <>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                          Left Opacity ({(typeof selectedNode.props.leftOpacity === 'number' ? selectedNode.props.leftOpacity : 0.6).toFixed(2)})
                          <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={typeof selectedNode.props.leftOpacity === 'number' ? selectedNode.props.leftOpacity : 0.6} 
                            onChange={(e) => updateNodeProps(selectedNodeId, { leftOpacity: parseFloat(e.target.value) })} 
                            style={{ width: '100%', cursor: 'pointer' }} 
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                          Center Opacity ({(typeof selectedNode.props.centerOpacity === 'number' ? selectedNode.props.centerOpacity : 0.4).toFixed(2)})
                          <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={typeof selectedNode.props.centerOpacity === 'number' ? selectedNode.props.centerOpacity : 0.4} 
                            onChange={(e) => updateNodeProps(selectedNodeId, { centerOpacity: parseFloat(e.target.value) })} 
                            style={{ width: '100%', cursor: 'pointer' }} 
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                          Right Opacity ({(typeof selectedNode.props.rightOpacity === 'number' ? selectedNode.props.rightOpacity : 0.1).toFixed(2)})
                          <input 
                            type="range" min="0" max="1" step="0.05" 
                            value={typeof selectedNode.props.rightOpacity === 'number' ? selectedNode.props.rightOpacity : 0.1} 
                            onChange={(e) => updateNodeProps(selectedNodeId, { rightOpacity: parseFloat(e.target.value) })} 
                            style={{ width: '100%', cursor: 'pointer' }} 
                          />
                        </label>
                      </>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Overlay Darkness ({(typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6).toFixed(2)})
                        <input 
                          type="range" min="0" max="1" step="0.05" 
                          value={typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { overlayOpacity: parseFloat(e.target.value) })} 
                          style={{ width: '100%', cursor: 'pointer' }} 
                        />
                      </label>
                    )}
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Minimum Height
                      <input 
                        type="text" 
                        value={selectedNode.props.minHeight || '85vh'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { minHeight: e.target.value })} 
                        style={inputStyle} 
                        placeholder="e.g. 85vh, 600px, 100%"
                      />
                    </label>
                  </>
                )}

                {selectedNode.type === 'TextMedia' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <textarea value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description
                      <textarea value={selectedNode.props.description || ''} onChange={(e) => updateNodeProps(selectedNodeId, { description: e.target.value })} rows={4} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link Text
                      <input type="text" value={selectedNode.props.linkText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { linkText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link URL
                      <UrlSelector value={selectedNode.props.linkUrl} onChange={(val) => updateNodeProps(selectedNodeId, { linkUrl: val })} selectableOptions={selectableOptions} placeholder="e.g. /experiences" />
                    </label>
                    <TargetSelector value={selectedNode.props.linkTarget} onChange={(val) => updateNodeProps(selectedNodeId, { linkTarget: val })} />
                    <ImageUploader 
                      label="Media URL (Image or Video)" 
                      value={selectedNode.props.imageUrl || ''} 
                      onChange={(val) => updateNodeProps(selectedNodeId, { imageUrl: val })} 
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Media Position
                      <select value={selectedNode.props.imagePosition || 'right'} onChange={(e) => updateNodeProps(selectedNodeId, { imagePosition: e.target.value })} style={inputStyle}>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="page-width">Page Width</option>
                      </select>
                    </label>
                    {(() => {
                      const isVideo = selectedNode.props.imageUrl?.match(/\.(mp4|webm|ogg|mov)/i) || selectedNode.props.imageUrl?.includes('youtube') || selectedNode.props.imageUrl?.includes('vimeo') || selectedNode.props.imageUrl?.includes('video');
                      if (!isVideo) return null;
                      return (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>Video Settings</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedNode.props.autoPlay !== false} onChange={(e) => updateNodeProps(selectedNodeId, { autoPlay: e.target.checked })} />
                            Auto Play
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedNode.props.muted !== false} onChange={(e) => updateNodeProps(selectedNodeId, { muted: e.target.checked })} />
                            Muted
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!selectedNode.props.showControls} onChange={(e) => updateNodeProps(selectedNodeId, { showControls: e.target.checked })} />
                            Show Controls
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedNode.props.loop !== false} onChange={(e) => updateNodeProps(selectedNodeId, { loop: e.target.checked })} />
                            Loop
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                              Trim Start (sec)
                              <input type="number" min="0" step="0.5" placeholder="0" value={selectedNode.props.startTime ?? 0} onChange={(e) => updateNodeProps(selectedNodeId, { startTime: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                              Trim End (sec)
                              <input type="number" min="0" step="0.5" placeholder="None" value={selectedNode.props.endTime ?? ''} onChange={(e) => updateNodeProps(selectedNodeId, { endTime: e.target.value ? parseFloat(e.target.value) : null })} style={inputStyle} />
                            </label>
                          </div>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                            Playback Speed ({(selectedNode.props.playbackSpeed || 1.0).toFixed(2)}x)
                            <input type="range" min="0.25" max="2.0" step="0.25" value={selectedNode.props.playbackSpeed || 1.0} onChange={(e) => updateNodeProps(selectedNodeId, { playbackSpeed: parseFloat(e.target.value) })} />
                          </label>
                        </div>
                      );
                    })()}
                  </>
                )}

                {selectedNode.type === 'ExperiencesGrid' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Experience Cards</div>
                      {(selectedNode.props.cards || []).map((card: any, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <IconSelector label="Icon" value={card.icon || ''} onChange={(val) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], icon: val }; updateNodeProps(selectedNodeId, { cards }); }} />
                          <input type="text" placeholder="Title" value={card.title || ''} onChange={(e) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], title: e.target.value }; updateNodeProps(selectedNodeId, { cards }); }} style={inputStyle} />
                          <input type="text" placeholder="Subtitle" value={card.subtitle || ''} onChange={(e) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], subtitle: e.target.value }; updateNodeProps(selectedNodeId, { cards }); }} style={inputStyle} />
                          <textarea rows={2} placeholder="Description" value={card.description || ''} onChange={(e) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], description: e.target.value }; updateNodeProps(selectedNodeId, { cards }); }} style={inputStyle} />
                          <input type="text" placeholder="Link Text" value={card.linkText || ''} onChange={(e) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], linkText: e.target.value }; updateNodeProps(selectedNodeId, { cards }); }} style={inputStyle} />
                          <UrlSelector placeholder="Link URL " value={card.linkUrl} onChange={(val) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], linkUrl: val }; updateNodeProps(selectedNodeId, { cards }); }} selectableOptions={selectableOptions} />
                          <TargetSelector value={card.linkTarget} onChange={(val) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], linkTarget: val }; updateNodeProps(selectedNodeId, { cards }); }} />
                          <ImageUploader label="Image" value={card.image || ''} onChange={(val) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], image: val }; updateNodeProps(selectedNodeId, { cards }); }} />
                          <button onClick={() => { const cards = (selectedNode.props.cards || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { cards }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const cards = [...(selectedNode.props.cards || []), { title: '', subtitle: '', description: '', linkText: '', image: '' }]; updateNodeProps(selectedNodeId, { cards }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Card</button>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Bottom Text
                      <input type="text" value={selectedNode.props.bottomText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { bottomText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'ContentGrid' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Content Type
                      <select 
                        value={selectedNode.props.contentType || 'adventure'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { contentType: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="adventure">Adventures</option>
                        <option value="asset">Assets</option>
                        <option value="staff">Staff</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Display Limit
                      <input type="number" min="1" max="50" value={selectedNode.props.limit ?? 6} onChange={(e) => updateNodeProps(selectedNodeId, { limit: parseInt(e.target.value) || 6 })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Columns
                      <select 
                        value={selectedNode.props.columns ?? 3} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { columns: parseInt(e.target.value) || 3 })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value={1}>1 Column</option>
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'YachtFeature' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description
                      <textarea value={selectedNode.props.description || ''} onChange={(e) => updateNodeProps(selectedNodeId, { description: e.target.value })} rows={4} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link Text
                      <input type="text" value={selectedNode.props.linkText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { linkText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link URL
                      <UrlSelector value={selectedNode.props.linkUrl} onChange={(val) => updateNodeProps(selectedNodeId, { linkUrl: val })} selectableOptions={selectableOptions} placeholder="e.g. /yacht" />
                    </label>
                    <TargetSelector value={selectedNode.props.linkTarget} onChange={(val) => updateNodeProps(selectedNodeId, { linkTarget: val })} />
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Images</div>
                      {(selectedNode.props.images || []).map((imgUrl: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-background)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                          <ImageUploader label={`Image ${idx + 1}`} value={imgUrl} onChange={(val) => { const newImages = [...(selectedNode.props.images || [])]; newImages[idx] = val; updateNodeProps(selectedNodeId, { images: newImages }); }} />
                          <button onClick={() => { const newImages = (selectedNode.props.images || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { images: newImages }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const newImages = [...(selectedNode.props.images || []), '']; updateNodeProps(selectedNodeId, { images: newImages }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Image</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Amenities</div>
                      {(selectedNode.props.amenities || []).map((item: any, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <IconSelector label="Icon" value={item.icon || ''} onChange={(val) => { const items = [...(selectedNode.props.amenities || [])]; items[idx] = { ...items[idx], icon: val }; updateNodeProps(selectedNodeId, { amenities: items }); }} />
                          <input type="text" placeholder="Amenity text" value={item.text || ''} onChange={(e) => { const items = [...(selectedNode.props.amenities || [])]; items[idx] = { ...items[idx], text: e.target.value }; updateNodeProps(selectedNodeId, { amenities: items }); }} style={inputStyle} />
                          <button onClick={() => { const items = (selectedNode.props.amenities || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { amenities: items }); }} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                        </div>
                      ))}
                      <button onClick={() => { const items = [...(selectedNode.props.amenities || []), { text: '', icon: 'Check' }]; updateNodeProps(selectedNodeId, { amenities: items }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Amenity</button>
                    </div>
                  </>
                )}

                {selectedNode.type === 'TestimonialsGrid' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <input type="text" value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description
                      <textarea rows={2} value={selectedNode.props.description || ''} onChange={(e) => updateNodeProps(selectedNodeId, { description: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Overall Rating (e.g. 4.9)
                      <input type="number" step="0.1" min={0} max={5} value={selectedNode.props.overallRating !== undefined ? selectedNode.props.overallRating : 5} onChange={(e) => updateNodeProps(selectedNodeId, { overallRating: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Rating Text
                      <input type="text" value={selectedNode.props.ratingText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { ratingText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link Text
                      <input type="text" value={selectedNode.props.linkText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { linkText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Link URL
                      <UrlSelector value={selectedNode.props.linkUrl} onChange={(val) => updateNodeProps(selectedNodeId, { linkUrl: val })} selectableOptions={selectableOptions} />
                    </label>
                    <TargetSelector value={selectedNode.props.linkTarget} onChange={(val) => updateNodeProps(selectedNodeId, { linkTarget: val })} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Quotes</div>
                      {(selectedNode.props.quotes || []).map((q: any, idx: number) => (
                        <div key={idx} style={{ background: 'var(--color-background)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <textarea rows={3} placeholder="Quote text" value={q.text || ''} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], text: e.target.value }; updateNodeProps(selectedNodeId, { quotes }); }} style={inputStyle} />
                          <input type="text" placeholder="Author Name" value={q.author || ''} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], author: e.target.value }; updateNodeProps(selectedNodeId, { quotes }); }} style={inputStyle} />
                          <input type="text" placeholder="Subtitle (e.g. Guest from Texas)" value={q.subtitle || ''} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], subtitle: e.target.value }; updateNodeProps(selectedNodeId, { quotes }); }} style={inputStyle} />
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                              Stars:
                              <input type="number" min={1} max={5} value={q.stars !== undefined ? q.stars : 5} onChange={(e) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], stars: parseInt(e.target.value) || 5 }; updateNodeProps(selectedNodeId, { quotes }); }} style={{ ...inputStyle, width: '60px' }} />
                            </label>
                            <button onClick={() => { const quotes = (selectedNode.props.quotes || []).filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { quotes }); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>Remove</button>
                          </div>
                          
                          <ImageUploader 
                            label="Avatar Image" 
                            value={q.avatar || ''} 
                            onChange={(val) => { const quotes = [...(selectedNode.props.quotes || [])]; quotes[idx] = { ...quotes[idx], avatar: val }; updateNodeProps(selectedNodeId, { quotes }); }} 
                          />
                        </div>
                      ))}
                      <button onClick={() => { const quotes = [...(selectedNode.props.quotes || []), { text: '', author: '' }]; updateNodeProps(selectedNodeId, { quotes }); }} style={{ padding: '0.5rem', background: 'transparent', border: '1px dashed var(--color-border)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600 }}>+ Add Quote</button>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'CTA' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={3} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text
                      <input type="text" value={selectedNode.props.buttonText || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonText: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Link URL
                      <input type="text" value={selectedNode.props.buttonLink || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonLink: e.target.value })} placeholder="/contact" style={inputStyle} />
                    </label>
                    <TargetSelector value={selectedNode.props.buttonTarget} onChange={(val) => updateNodeProps(selectedNodeId, { buttonTarget: val })} />
                    <ImageUploader 
                      label="Background Image URL" 
                      value={selectedNode.props.bgImage || ''} 
                      onChange={(val) => updateNodeProps(selectedNodeId, { bgImage: val })} 
                    />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Overlay Darkness ({(typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6).toFixed(2)})
                      <input 
                        type="range" min="0" max="1" step="0.05" 
                        value={typeof selectedNode.props.overlayOpacity === 'number' ? selectedNode.props.overlayOpacity : 0.6} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { overlayOpacity: parseFloat(e.target.value) })} 
                        style={{ width: '100%', cursor: 'pointer' }} 
                      />
                    </label>
                  </>
                )}
                {selectedNode.type === 'ComparisonTable' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Title
                      <input type="text" value={selectedNode.props.title || ''} onChange={(e) => updateNodeProps(selectedNodeId, { title: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description
                      <textarea value={selectedNode.props.description || ''} onChange={(e) => updateNodeProps(selectedNodeId, { description: e.target.value })} rows={3} style={inputStyle} />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                      <input type="checkbox" checked={selectedNode.props.showLegend || false} onChange={(e) => updateNodeProps(selectedNodeId, { showLegend: e.target.checked })} />
                      Show Compliance Legend Table
                    </label>

                    <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Bulk Import (Excel/CSV)</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-muted)' }}>Paste tab-separated values from Excel/Google Sheets. First column = Feature.</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={(e) => { 
                            e.preventDefault(); 
                            setImportModalInitialText('');
                            setIsImportModalOpen(true); 
                          }}
                          style={{ flex: 1, padding: '0.75rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <LucideIcons.FileSpreadsheet size={18} />
                          New Import
                        </button>
                        <button
                          onClick={(e) => { 
                            e.preventDefault(); 
                            const items = selectedNode.props.items || [];
                            const rows = selectedNode.props.rows || [];
                            if (items.length > 0) {
                              let tsv = 'Feature\tLucide Icon\t' + items.map((i: any) => i.name).join('\t') + '\n';
                              rows.forEach((r: any) => {
                                let line = `${r.feature || ''}\t${r.featureIcon || ''}`;
                                items.forEach((_: any, idx: number) => {
                                  const cell = r.values?.[idx];
                                  const cellVal = cell ? (cell.text || cell.icon || '') : '';
                                  line += `\t${cellVal}`;
                                });
                                tsv += line + '\n';
                              });
                              setImportModalInitialText(tsv);
                            } else {
                              setImportModalInitialText('');
                            }
                            setIsImportModalOpen(true); 
                          }}
                          style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                          <LucideIcons.Edit size={18} />
                          Edit Data
                        </button>
                      </div>
                      <BulkImportModal 
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        onImport={(items, rows) => {
                          updateNodeProps(selectedNodeId, { items, rows });
                        }}
                        initialText={importModalInitialText}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Items (Columns)</h4>
                      {(selectedNode.props.items || []).map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <input type="text" value={item.name} onChange={(e) => { const items = [...selectedNode.props.items]; items[idx] = { ...items[idx], name: e.target.value }; updateNodeProps(selectedNodeId, { items }); }} style={inputStyle} />
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input type="checkbox" checked={item.showIcon} onChange={(e) => { const items = [...selectedNode.props.items]; items[idx] = { ...items[idx], showIcon: e.target.checked }; updateNodeProps(selectedNodeId, { items }); }} /> Show Icon
                            </label>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <input type="checkbox" checked={item.showText} onChange={(e) => { const items = [...selectedNode.props.items]; items[idx] = { ...items[idx], showText: e.target.checked }; updateNodeProps(selectedNodeId, { items }); }} /> Show Text
                            </label>
                          </div>
                          <button onClick={() => { const items = selectedNode.props.items.filter((_: any, i: number) => i !== idx); updateNodeProps(selectedNodeId, { items }); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Remove Item</button>
                        </div>
                      ))}
                      <button onClick={() => { const items = [...(selectedNode.props.items || []), { name: 'New Item', showIcon: true, showText: true }]; updateNodeProps(selectedNodeId, { items }); }} style={{ padding: '0.5rem', border: '1px dashed var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>+ Add Item</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Rows (Features)</h4>
                      {(selectedNode.props.rows || []).map((row: any, rIndex: number) => (
                        <div key={rIndex} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}><input type="text" placeholder="Feature Name" value={row.feature} onChange={(e) => { const rows = [...selectedNode.props.rows]; rows[rIndex] = { ...rows[rIndex], feature: e.target.value }; updateNodeProps(selectedNodeId, { rows }); }} style={{ ...inputStyle, flex: 2 }} /><input type="text" placeholder="Feature Icon (e.g. Map)" value={row.featureIcon || ''} onChange={(e) => { const rows = [...selectedNode.props.rows]; rows[rIndex] = { ...rows[rIndex], featureIcon: e.target.value }; updateNodeProps(selectedNodeId, { rows }); }} style={{ ...inputStyle, flex: 1 }} /></div>
                          
                          {(selectedNode.props.items || []).map((item: any, cIndex: number) => {
                            const val = row.values?.[cIndex] || { text: '', icon: '' };
                            return (
                              <div key={cIndex} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '1rem', borderLeft: '2px solid var(--color-border)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{item.name}</span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <div style={{ flex: 1 }}><IconSelector label="Icon" value={val.icon} onChange={(iconVal) => { const rows = [...selectedNode.props.rows]; const newVals = [...(rows[rIndex].values || [])]; newVals[cIndex] = { ...val, icon: iconVal }; rows[rIndex] = { ...rows[rIndex], values: newVals }; updateNodeProps(selectedNodeId, { rows }); }} /></div>
                                  <input type="text" placeholder="Text" style={{ ...inputStyle, flex: 2 }} value={val.text} onChange={(e) => { const rows = [...selectedNode.props.rows]; const newVals = [...(rows[rIndex].values || [])]; newVals[cIndex] = { ...val, text: e.target.value }; rows[rIndex] = { ...rows[rIndex], values: newVals }; updateNodeProps(selectedNodeId, { rows }); }} />
                                </div>
                              </div>
                            );
                          })}
                          <button onClick={() => { const rows = selectedNode.props.rows.filter((_: any, i: number) => i !== rIndex); updateNodeProps(selectedNodeId, { rows }); }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Remove Row</button>
                        </div>
                      ))}
                      <button onClick={() => { 
                        const rows = [...(selectedNode.props.rows || []), { feature: 'New Feature', values: (selectedNode.props.items || []).map(() => ({ text: '', icon: '' })) }];
                        updateNodeProps(selectedNodeId, { rows }); 
                      }} style={{ padding: '0.5rem', border: '1px dashed var(--color-primary)', background: 'transparent', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>+ Add Row</button>
                    </div>
                  </>
                )}
                {selectedNode.type === 'DynamicCardBlock' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Content Type
                      <select 
                        value={selectedNode.props.contentType || 'adventure'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { contentType: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="adventure">Adventures</option>
                        <option value="asset">Assets</option>
                        <option value="staff">Staff / Crew</option>
                        <option value="location">Locations</option>
                      </select>
                    </label>

                    {selectedNode.props.contentType === 'asset' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Filter Subtype
                        <select 
                          value={selectedNode.props.filterSubtype || 'all'} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { filterSubtype: e.target.value })}
                          style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                        >
                          <option value="all">All Assets</option>
                          <option value="vessel">Vessels Only (Yachts)</option>
                          <option value="gear">Gear Only (Tenders/Water Toys)</option>
                        </select>
                      </label>
                    )}

                    {selectedNode.props.contentType === 'staff' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Filter Subtype
                        <select 
                          value={selectedNode.props.filterSubtype || 'all'} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { filterSubtype: e.target.value })}
                          style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                        >
                          <option value="all">All Crew</option>
                          <option value="captain">Captains Only</option>
                          <option value="crew">Non-Captains</option>
                        </select>
                      </label>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Filter by Connected Item (Slug)
                      <input 
                        type="text" 
                        placeholder="e.g. motoryacht-whiskey"
                        value={selectedNode.props.filterByItemSlug || ''} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { filterByItemSlug: e.target.value })} 
                        style={inputStyle} 
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Display Limit
                      <input type="number" min="1" max="50" value={selectedNode.props.limit ?? 6} onChange={(e) => updateNodeProps(selectedNodeId, { limit: parseInt(e.target.value) || 6 })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Columns
                      <select 
                        value={selectedNode.props.columns ?? 3} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { columns: parseInt(e.target.value) || 3 })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value={1}>1 Column</option>
                        <option value={2}>2 Columns</option>
                        <option value={3}>3 Columns</option>
                        <option value={4}>4 Columns</option>
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-primary)' }}>Visible Card Elements</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showImage !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showImage: e.target.checked })} />
                        Show Hero Image
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showTitle !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showTitle: e.target.checked })} />
                        Show Title
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showDescription !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showDescription: e.target.checked })} />
                        Show Short Description
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showLocation !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showLocation: e.target.checked })} />
                        Show Base Port / Location
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showDuration !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showDuration: e.target.checked })} />
                        Show Duration (Adventures)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showPrice !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showPrice: e.target.checked })} />
                        Show Pricing (Adventures/Assets)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showRating !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showRating: e.target.checked })} />
                        Show Star Ratings (Crew)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showCerts !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showCerts: e.target.checked })} />
                        Show Certifications (Crew)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showFeatures !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showFeatures: e.target.checked })} />
                        Show Features & Amenities (Assets)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showButton !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showButton: e.target.checked })} />
                        Show CTA Button
                      </label>
                    </div>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Mobile Layout
                      <select 
                        value={selectedNode.props.mobileLayout || 'stack'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { mobileLayout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="stack">Stack Vertically</option>
                        <option value="swipe">Swipe Side-Scroll</option>
                      </select>
                    </label>
                  </>
                )}

                {selectedNode.type === 'DynamicCarousel' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Content Type
                      <select 
                        value={selectedNode.props.contentType || 'adventure'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { contentType: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="adventure">Adventures</option>
                        <option value="asset">Assets</option>
                        <option value="staff">Staff / Crew</option>
                        <option value="location">Locations</option>
                      </select>
                    </label>

                    {selectedNode.props.contentType === 'asset' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Filter Subtype
                        <select 
                          value={selectedNode.props.filterSubtype || 'all'} 
                          onChange={(e) => updateNodeProps(selectedNodeId, { filterSubtype: e.target.value })}
                          style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                        >
                          <option value="all">All Assets</option>
                          <option value="vessel">Vessels Only (Yachts)</option>
                          <option value="gear">Gear Only (Tenders/Water Toys)</option>
                        </select>
                      </label>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow
                      <input type="text" value={selectedNode.props.eyebrow || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrow: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <textarea value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Max Items in Carousel
                      <input type="number" min="1" max="30" value={selectedNode.props.limit ?? 10} onChange={(e) => updateNodeProps(selectedNodeId, { limit: parseInt(e.target.value) || 10 })} style={inputStyle} />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.25rem 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedNode.props.autoScroll || false} onChange={(e) => updateNodeProps(selectedNodeId, { autoScroll: e.target.checked })} />
                      Auto-rotate / Autoplay
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-primary)' }}>Visible Card Elements</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showImage !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showImage: e.target.checked })} />
                        Show Hero Image
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showTitle !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showTitle: e.target.checked })} />
                        Show Title
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showDescription !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showDescription: e.target.checked })} />
                        Show Description
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showPrice !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showPrice: e.target.checked })} />
                        Show Prices
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showFeatures !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showFeatures: e.target.checked })} />
                        Show Features & Amenities (Assets)
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showButton !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showButton: e.target.checked })} />
                        Show CTA Button
                      </label>
                    </div>
                  </>
                )}

                {selectedNode.type === 'BookingWidget' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Headline
                      <input type="text" value={selectedNode.props.headline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { headline: e.target.value })} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Subheadline
                      <textarea value={selectedNode.props.subheadline || ''} onChange={(e) => updateNodeProps(selectedNodeId, { subheadline: e.target.value })} rows={2} style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Widget Layout
                      <select 
                        value={selectedNode.props.layout || 'card'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { layout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="card">Centered Card</option>
                        <option value="bar">Horizontal Search Bar (Dynamic)</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.25rem 0', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedNode.props.showAdventuresList !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showAdventuresList: e.target.checked })} />
                      Show Adventures Dropdown Selector
                    </label>
                  </>
                )}

                {selectedNode.type === 'DynamicDetailBlock' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Content Type
                      <select 
                        value={selectedNode.props.contentType || 'adventure'} 
                        onChange={(e) => {
                          const newType = e.target.value;
                          updateNodeProps(selectedNodeId, { contentType: newType, itemId: '' });
                        }}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="adventure">Adventures</option>
                        <option value="asset">Assets</option>
                        <option value="staff">Staff / Crew</option>
                        <option value="location">Locations</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Specific Showcase Item
                      <select 
                        value={selectedNode.props.itemId || ''} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { itemId: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="">-- Select Item --</option>
                        {contentItems
                          .filter(item => item.contentType === (selectedNode.props.contentType || 'adventure'))
                          .map(item => (
                            <option key={item.id} value={item.id}>
                              {item.title} ({item.status})
                            </option>
                          ))
                        }
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Layout Style
                      <select 
                        value={selectedNode.props.layout || 'left'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { layout: e.target.value })}
                        style={{ ...inputStyle, width: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-foreground)' }}
                      >
                        <option value="left">Image on Left, Content Right</option>
                        <option value="right">Image on Right, Content Left</option>
                        <option value="card">Centered Detailed Card</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text
                      <input 
                        type="text" 
                        value={selectedNode.props.buttonText ?? 'Discover Details'} 
                        onChange={(e) => updateNodeProps(selectedNodeId, { buttonText: e.target.value })} 
                        style={inputStyle} 
                      />
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--color-primary)' }}>Visible Elements</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showImage !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showImage: e.target.checked })} />
                        Show Image
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showTitle !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showTitle: e.target.checked })} />
                        Show Title
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showDescription !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showDescription: e.target.checked })} />
                        Show Description
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showMetadata !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showMetadata: e.target.checked })} />
                        Show Metadata Details
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selectedNode.props.showButton !== false} onChange={(e) => updateNodeProps(selectedNodeId, { showButton: e.target.checked })} />
                        Show CTA Button
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'style' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Padding
                  <input 
                    type="text" 
                    placeholder="e.g. 2rem"
                    value={selectedNode.props.style?.padding || ''} 
                    onChange={(e) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, padding: e.target.value } })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Margin
                  <input 
                    type="text" 
                    placeholder="e.g. 1rem 0"
                    value={selectedNode.props.style?.margin || ''} 
                    onChange={(e) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, margin: e.target.value } })}
                    style={inputStyle}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Background Color 
                  {selectedNode.type === 'EnhancedHero' && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Sets outer section background)</span>}
                  <input 
                    type="text" 
                    placeholder="e.g. #ffffff or var(--color-surface)"
                    value={selectedNode.props.style?.backgroundColor || selectedNode.props.style?.background || ''} 
                    onChange={(e) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, backgroundColor: e.target.value } })}
                    style={inputStyle}
                  />
                  <SwatchSelector value={selectedNode.props.style?.backgroundColor || selectedNode.props.style?.background || ''} onChange={(val) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, backgroundColor: val } })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Text Color
                  {selectedNode.type === 'EnhancedHero' && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Sets outer section text color)</span>}
                  <input 
                    type="text" 
                    placeholder="e.g. #000000"
                    value={selectedNode.props.style?.color || ''} 
                    onChange={(e) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, color: e.target.value } })}
                    style={inputStyle}
                  />
                  <SwatchSelector value={selectedNode.props.style?.color || ''} onChange={(val) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, color: val } })} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                  Border Radius
                  {selectedNode.type === 'EnhancedHero' && <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>(Sets outer section border radius)</span>}
                  <input 
                    type="text" 
                    placeholder="e.g. 8px"
                    value={selectedNode.props.style?.borderRadius || ''} 
                    onChange={(e) => updateNodeProps(selectedNodeId, { style: { ...selectedNode.props.style, borderRadius: e.target.value } })}
                    style={inputStyle}
                  />
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1rem 0' }} />
                <h4 style={{ margin: '0 0 0.5rem', color: 'var(--color-foreground)' }}>Block Specific Styles</h4>

                {/* Typography Sizes */}
                {(['EnhancedHero', 'TextMedia', 'ExperiencesGrid', 'YachtFeature', 'CTA', 'ComparisonTable', 'ContentGrid'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Headline Font Size
                    <input 
                      type="text" 
                      placeholder="e.g. 2.5rem or clamp(2rem, 4vw, 3rem)"
                      value={selectedNode.props.headlineFontSize || selectedNode.props.titleFontSize || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'ComparisonTable' ? { titleFontSize: e.target.value } : { headlineFontSize: e.target.value })
                      })}
                      style={inputStyle}
                    />
                  </label>
                )}

                {(['EnhancedHero', 'TextMedia', 'CTA', 'ComparisonTable'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Subheadline/Description Font Size
                    <input 
                      type="text" 
                      placeholder="e.g. 1.2rem"
                      value={selectedNode.props.subheadlineFontSize || selectedNode.props.descriptionFontSize || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'TextMedia' ? { descriptionFontSize: e.target.value } : { subheadlineFontSize: e.target.value })
                      })}
                      style={inputStyle}
                    />
                  </label>
                )}

                {/* Colors */}
                {(['EnhancedHero', 'TextMedia', 'ExperiencesGrid', 'YachtFeature', 'Testimonials', 'ContentGrid'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Eyebrow Color
                    <input 
                      type="text" 
                      value={selectedNode.props.eyebrowColor || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { eyebrowColor: e.target.value })}
                      style={inputStyle}
                    />
                    <SwatchSelector value={selectedNode.props.eyebrowColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { eyebrowColor: val })} />
                  </label>
                )}

                {(['EnhancedHero', 'TextMedia', 'ExperiencesGrid', 'YachtFeature', 'CTA', 'ComparisonTable', 'ContentGrid'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Headline Color
                    <input 
                      type="text" 
                      value={selectedNode.props.headlineColor || selectedNode.props.titleColor || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'ComparisonTable' ? { titleColor: e.target.value } : { headlineColor: e.target.value })
                      })}
                      style={inputStyle}
                    />
                    <SwatchSelector value={selectedNode.props.headlineColor || selectedNode.props.titleColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'ComparisonTable' ? { titleColor: val } : { headlineColor: val })
                      })} />
                  </label>
                )}

                {(['EnhancedHero', 'TextMedia', 'YachtFeature', 'CTA', 'ComparisonTable'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Subheadline/Description Color
                    <input 
                      type="text" 
                      value={selectedNode.props.subheadlineColor || selectedNode.props.descriptionColor || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'TextMedia' || selectedNode.type === 'YachtFeature' ? { descriptionColor: e.target.value } : { subheadlineColor: e.target.value })
                      })}
                      style={inputStyle}
                    />
                    <SwatchSelector value={selectedNode.props.subheadlineColor || selectedNode.props.descriptionColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { 
                        ...(selectedNode.type === 'TextMedia' || selectedNode.type === 'YachtFeature' ? { descriptionColor: val } : { subheadlineColor: val })
                      })} />
                  </label>
                )}

                {(['TextMedia', 'YachtFeature'].includes(selectedNode.type)) && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                    Link Color
                    <input 
                      type="text" 
                      value={selectedNode.props.linkColor || ''} 
                      onChange={(e) => updateNodeProps(selectedNodeId, { linkColor: e.target.value })}
                      style={inputStyle}
                    />
                    <SwatchSelector value={selectedNode.props.linkColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { linkColor: val })} />
                  </label>
                )}

                {selectedNode.type === 'TestimonialsGrid' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Eyebrow Color
                      <input type="text" value={selectedNode.props.eyebrowColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { eyebrowColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.eyebrowColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { eyebrowColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Quote Color
                      <input type="text" value={selectedNode.props.quoteColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { quoteColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.quoteColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { quoteColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Author Color
                      <input type="text" value={selectedNode.props.authorColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { authorColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.authorColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { authorColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Card Background Color
                      <input type="text" value={selectedNode.props.cardBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cardBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.cardBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { cardBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Header Text Color
                      <input type="text" value={selectedNode.props.textColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { textColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.textColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { textColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description Text Color
                      <input type="text" value={selectedNode.props.descriptionColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { descriptionColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.descriptionColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { descriptionColor: val })} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'EnhancedHero' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Primary Button BG Color
                      <input type="text" value={selectedNode.props.primaryButtonBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { primaryButtonBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.primaryButtonBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { primaryButtonBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Primary Button Text Color
                      <input type="text" value={selectedNode.props.primaryButtonTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { primaryButtonTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.primaryButtonTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { primaryButtonTextColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Secondary Button BG Color
                      <input type="text" value={selectedNode.props.secondaryButtonBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { secondaryButtonBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.secondaryButtonBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { secondaryButtonBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Secondary Button Text Color
                      <input type="text" value={selectedNode.props.secondaryButtonTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { secondaryButtonTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.secondaryButtonTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { secondaryButtonTextColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Content Background Color
                      <input type="text" value={selectedNode.props.contentBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { contentBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.contentBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { contentBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Inner Border Radius
                      <input type="text" value={selectedNode.props.innerBorderRadius || ''} onChange={(e) => updateNodeProps(selectedNodeId, { innerBorderRadius: e.target.value })} style={inputStyle} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'CTA' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button BG Color
                      <input type="text" value={selectedNode.props.buttonBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.buttonBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { buttonBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Button Text Color
                      <input type="text" value={selectedNode.props.buttonTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { buttonTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.buttonTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { buttonTextColor: val })} />
                    </label>
                  </>
                )}

                {['ExperiencesGrid', 'ContentGrid'].includes(selectedNode.type) && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Card Background Color
                      <input type="text" value={selectedNode.props.cardBgColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cardBgColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.cardBgColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { cardBgColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Card Text Color
                      <input type="text" value={selectedNode.props.cardTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cardTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.cardTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { cardTextColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Card Border Radius
                      <input type="text" value={selectedNode.props.cardBorderRadius || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cardBorderRadius: e.target.value })} style={inputStyle} />
                    </label>
                    {selectedNode.type === 'ExperiencesGrid' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                        Bottom Text Color
                        <input type="text" value={selectedNode.props.bottomTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { bottomTextColor: e.target.value })} style={inputStyle} />
                        <SwatchSelector value={selectedNode.props.bottomTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { bottomTextColor: val })} />
                      </label>
                    )}
                  </>
                )}

                {selectedNode.type === 'Testimonials' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Quote Text Color
                      <input type="text" value={selectedNode.props.quoteColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { quoteColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.quoteColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { quoteColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Author Text Color
                      <input type="text" value={selectedNode.props.authorColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { authorColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.authorColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { authorColor: val })} />
                    </label>
                  </>
                )}

                {selectedNode.type === 'ComparisonTable' && (
                  <>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Feature Text Color
                      <input type="text" value={selectedNode.props.featureTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { featureTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.featureTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { featureTextColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Cell Text Color
                      <input type="text" value={selectedNode.props.cellTextColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { cellTextColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.cellTextColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { cellTextColor: val })} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                      Description Color
                      <input type="text" value={selectedNode.props.descriptionColor || ''} onChange={(e) => updateNodeProps(selectedNodeId, { descriptionColor: e.target.value })} style={inputStyle} />
                      <SwatchSelector value={selectedNode.props.descriptionColor || ''} onChange={(val) => updateNodeProps(selectedNodeId, { descriptionColor: val })} />
                    </label>
                  </>
                )}

              </div>
            )}
          </div>
        </>
      ) : null}
    </aside>
  );
}

const inputStyle = {
  padding: '0.5rem', 
  borderRadius: 'var(--radius-sm)', 
  border: '1px solid var(--color-border)', 
  background: 'var(--color-background)', 
  color: 'var(--color-foreground)' 
};







