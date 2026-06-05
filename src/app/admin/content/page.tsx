'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getContentTypeConfigs, saveContentTypeConfig, ContentTypeConfig, seedMockData } from '@/lib/db';
import { 
  Anchor, Compass, Ship, Users, Sliders, ChevronLeft, 
  Save, Loader2, Check, AlertCircle, Edit2, Database, MapPin
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ContentTypesAdmin() {
  const { user } = useAuth();
  const router = useRouter();

  const [configs, setConfigs] = useState<ContentTypeConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingType, setEditingType] = useState<ContentTypeConfig | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedMockData();
      showToast('success', 'Demo data seeded successfully! All Assets, Locations, and Staff are now in the database.');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      showToast('error', 'Failed to seed demo data.');
    } finally {
      setIsSeeding(false);
    }
  };


  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const data = await getContentTypeConfigs();
        setConfigs(data);
      } catch (error) {
        console.error('Error loading content configs:', error);
        showToast('error', 'Failed to load content configurations');
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfigs();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEditClick = (config: ContentTypeConfig) => {
    setEditingType({ ...config });
    setValidationError(null);
  };

  const handleInputChange = (field: keyof ContentTypeConfig, value: any) => {
    if (!editingType) return;
    setEditingType(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    setValidationError(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    // Validate slugPrefix
    const prefix = editingType.slugPrefix.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!prefix) {
      setValidationError('URL prefix is required and must contain only letters, numbers, and hyphens');
      return;
    }

    // Reserved paths checking
    const reserved = ['admin', 'login', 'api', 'dashboard', 'settings', 'editor', 'media', 'templates'];
    if (reserved.includes(prefix)) {
      setValidationError(`"${prefix}" is a reserved system path and cannot be used as a URL prefix`);
      return;
    }

    // Check duplicate prefixes
    const duplicate = configs.find(c => c.id !== editingType.id && c.slugPrefix === prefix && c.isEnabled);
    if (duplicate) {
      setValidationError(`The URL prefix "/${prefix}" is already in use by the ${duplicate.name} type`);
      return;
    }

    setIsSaving(true);
    try {
      const updatedConfig = {
        ...editingType,
        slugPrefix: prefix
      };
      await saveContentTypeConfig(updatedConfig);
      setConfigs(prev => prev.map(c => c.id === updatedConfig.id ? updatedConfig : c));
      showToast('success', `${updatedConfig.name} settings updated successfully!`);
      setEditingType(null);
    } catch (error) {
      console.error('Error saving content type config:', error);
      showToast('error', 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'adventure':
        return <Compass size={24} color="#B9783B" />;
      case 'asset':
        return <Ship size={24} color="#B9783B" />;
      case 'staff':
      case 'owner':
        return <Users size={24} color="#B9783B" />;
      case 'location':
        return <MapPin size={24} color="#B9783B" />;
      default:
        return <Sliders size={24} color="#B9783B" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#D8C7AF', fontSize: '0.9rem' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#B9783B' }}>
          <Anchor size={20} /> Content Type Settings
        </div>
      </nav>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 500
        }}>
          {toast.message}
        </div>
      )}

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>Structured Content Engine</h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8 }}>Configure how different content schemas are structured, labeled, and served on your website.</p>
          </div>
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            style={{
              background: 'transparent',
              border: '1px dashed #B9783B',
              color: '#B9783B',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              cursor: isSeeding ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
              marginTop: '0.25rem'
            }}
            onMouseOver={e => { if (!isSeeding) { e.currentTarget.style.background = 'rgba(185,120,59,0.1)'; } }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {isSeeding ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Seeding...
              </>
            ) : (
              <>
                <Database size={16} /> Seed Demo Data
              </>
            )}
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading configurations...</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {configs.map((config) => (
              <div 
                key={config.id}
                style={{
                  background: '#1E2124',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  padding: '1.5rem 2rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(185,120,59,0.1)', padding: '1rem', borderRadius: '8px' }}>
                    {getIcon(config.id)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {config.pluralName}
                      {!config.isEnabled && (
                        <span style={{ fontSize: '0.7rem', background: '#EF4444', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>Disabled</span>
                      )}
                    </h3>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.7 }}>
                      <div>Type ID: <strong style={{ color: '#F4F1EA', fontFamily: 'monospace' }}>{config.id}</strong></div>
                      <div>URL Prefix: <strong style={{ color: '#B9783B', fontFamily: 'monospace' }}>/{config.slugPrefix}/*</strong></div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    onClick={() => handleEditClick(config)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#F4F1EA',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#B9783B'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
                  >
                    <Edit2 size={14} /> Configure Prefix
                  </button>
                  <Link 
                    href={`/admin/content/${config.id}`}
                    style={{
                      textDecoration: 'none',
                      background: '#B9783B',
                      color: 'white',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      boxShadow: '0 2px 6px rgba(185,120,59,0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
                    onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
                  >
                    Manage Items
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* EDIT CONFIG MODAL */}
      {editingType && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Configure: {editingType.name}
            </h2>

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Singular Label
                <input 
                  type="text"
                  value={editingType.name}
                  onChange={e => handleInputChange('name', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: '#121416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Plural Label
                <input 
                  type="text"
                  value={editingType.pluralName}
                  onChange={e => handleInputChange('pluralName', e.target.value)}
                  style={{
                    padding: '0.75rem',
                    background: '#121416',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                URL Route Slug Prefix
                <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem' }}>
                  <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.875rem', userSelect: 'none' }}>mywhiskey.com/</span>
                  <input 
                    type="text"
                    placeholder="experiences"
                    value={editingType.slugPrefix}
                    onChange={e => handleInputChange('slugPrefix', e.target.value)}
                    style={{
                      padding: '0.75rem 0.75rem 0.75rem 0.1rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      flex: 1
                    }}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#D8C7AF', opacity: 0.6 }}>
                  Changing this prefix updates all live links dynamically! E.g. `/experiences/my-trip` becomes `/${editingType.slugPrefix}/my-trip`.
                </span>
              </label>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.25rem' }}>
                <input 
                  type="checkbox"
                  id="isEnabled"
                  checked={editingType.isEnabled}
                  onChange={e => handleInputChange('isEnabled', e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#B9783B', cursor: 'pointer' }}
                />
                <label htmlFor="isEnabled" style={{ cursor: 'pointer' }}>Enable this Content Type</label>
              </div>

              {validationError && (
                <div style={{ color: '#EF4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => setEditingType(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#D8C7AF',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#B9783B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
