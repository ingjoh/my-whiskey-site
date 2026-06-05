'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  getContentItems, deleteContentItem, getContentTypeConfigs, 
  ContentItem, ContentTypeConfig 
} from '@/lib/db';
import { 
  Compass, Ship, Users, Sliders, ChevronLeft, Plus, 
  Trash2, Edit, Loader2, FileText, AlertCircle, ArrowRight, MapPin, Eye
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ContentItemsList({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [typeConfig, setTypeConfig] = useState<ContentTypeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load type configurations to find matching name & pluralName
        const configs = await getContentTypeConfigs();
        const config = configs.find(c => c.id === type);
        if (config) {
          setTypeConfig(config);
        } else {
          // Fallback if not found in custom list
          const fallbacks: Record<string, Partial<ContentTypeConfig>> = {
            adventure: { name: 'Adventure', pluralName: 'Adventures' },
            asset: { name: 'Asset', pluralName: 'Assets' },
            staff: { name: 'Staff Member', pluralName: 'Staff' }
          };
          setTypeConfig({
            id: type,
            name: fallbacks[type]?.name || type.charAt(0).toUpperCase() + type.slice(1),
            pluralName: fallbacks[type]?.pluralName || type.charAt(0).toUpperCase() + type.slice(1) + 's',
            slugPrefix: type === 'adventure' ? 'experiences' : type === 'asset' ? 'fleet' : 'crew',
            isEnabled: true
          });
        }

        // Load items of this contentType
        const contentItems = await getContentItems(type);
        setItems(contentItems);
      } catch (error) {
        console.error('Error fetching content items:', error);
        showToast('error', 'Failed to load content items');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [type]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteContentItem(deleteConfirmId);
      setItems(prev => prev.filter(item => item.id !== deleteConfirmId));
      showToast('success', 'Item deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('error', 'Failed to delete item');
    } finally {
      setIsDeleting(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'adventure':
        return <Compass size={24} color="#B9783B" />;
      case 'asset':
        return <Ship size={24} color="#B9783B" />;
      case 'staff':
        return <Users size={24} color="#B9783B" />;
      default:
        return <Sliders size={24} color="#B9783B" />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
          <Link href="/admin" style={{ textDecoration: 'none', color: '#D8C7AF', opacity: 0.7, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', fontWeight: 500 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.7'}>
            Admin
          </Link>
          <span style={{ color: '#D8C7AF', opacity: 0.4 }}>/</span>
          <Link href="/admin/content" style={{ textDecoration: 'none', color: '#D8C7AF', opacity: 0.7, transition: 'opacity 0.2s', fontWeight: 500 }} onMouseOver={e => e.currentTarget.style.opacity = '1'} onMouseOut={e => e.currentTarget.style.opacity = '0.7'}>
            Content Settings
          </Link>
          <span style={{ color: '#D8C7AF', opacity: 0.4 }}>/</span>
          <span style={{ color: '#F4F1EA', fontWeight: 600 }}>
            {typeConfig?.pluralName || 'Items'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.15rem', color: '#B9783B' }}>
          {getIcon()} {typeConfig?.pluralName || 'Content Items'}
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

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 2rem' }}>
        
        {/* Back Link to Admin Dashboard */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/admin" 
            style={{ 
              textDecoration: 'none', 
              color: '#B9783B', 
              fontSize: '0.9rem', 
              fontWeight: 600, 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            <ChevronLeft size={16} /> Back to Admin Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.25rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
              Manage {typeConfig?.pluralName}
            </h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8 }}>
              Create, edit, and organize public entries for your {typeConfig?.pluralName.toLowerCase()}.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {typeConfig && (
              <a 
                href={`/${typeConfig.slugPrefix}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: 'transparent',
                  border: '1px solid #B9783B',
                  color: '#B9783B', 
                  textDecoration: 'none',
                  padding: '0.725rem 1.25rem', 
                  borderRadius: '6px', 
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  fontSize: '0.875rem'
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(185,120,59,0.1)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Eye size={16} /> View Collection Page
              </a>
            )}
            <Link 
              href={`/admin/content/${type}/new`}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: '#B9783B', 
                color: 'white', 
                textDecoration: 'none',
                padding: '0.75rem 1.5rem', 
                borderRadius: '6px', 
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(185,120,59,0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
              onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
            >
              <Plus size={18} /> New {typeConfig?.name}
            </Link>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: '#B9783B' }} />
            <span style={{ color: '#D8C7AF' }}>Loading items...</span>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#D8C7AF'
          }}>
            <FileText size={48} color="#B9783B" style={{ margin: '0 auto 1.5rem', opacity: 0.7 }} />
            <h3 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>No items found</h3>
            <p style={{ opacity: 0.7, maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
              You haven't created any {typeConfig?.pluralName.toLowerCase()} yet. Get started by creating your first entry.
            </p>
            <Link 
              href={`/admin/content/${type}/new`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#B9783B',
                color: 'white',
                textDecoration: 'none',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem'
              }}
            >
              Add {typeConfig?.name}
            </Link>
          </div>
        ) : (
          /* Items Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {items.map((item) => (
              <div 
                key={item.id}
                style={{
                  background: '#1E2124',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  overflow: 'hidden', // Make sure image corners are clipped!
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '340px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'rgba(185,120,59,0.4)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div>
                  {/* Hero Image */}
                  {item.heroImage ? (
                    <div style={{ width: '100%', height: '180px', overflow: 'hidden', background: '#121416', position: 'relative' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.heroImage} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '180px', background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {type === 'adventure' && <Compass size={32} color="#B9783B" opacity={0.3} />}
                      {type === 'asset' && <Ship size={32} color="#B9783B" opacity={0.3} />}
                      {type === 'staff' && <Users size={32} color="#B9783B" opacity={0.3} />}
                    </div>
                  )}

                  {/* Card Content Padding */}
                  <div style={{ padding: '1.25rem 1.25rem 0 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        background: item.status === 'published' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                        color: item.status === 'published' ? '#10B981' : '#F59E0B', 
                        padding: '0.2rem 0.5rem', 
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.05em'
                      }}>
                        {item.status}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {item.status === 'published' ? (
                          <a
                            href={`/${typeConfig?.slugPrefix || (type === 'adventure' ? 'experiences' : type === 'asset' ? 'fleet' : 'crew')}/${item.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ background: 'transparent', border: 'none', color: '#B9783B', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                            title="View Live Page"
                          >
                            <Eye size={15} />
                          </a>
                        ) : (
                          <div
                            style={{ color: '#D8C7AF', opacity: 0.3, padding: '0.25rem', display: 'flex', alignItems: 'center', cursor: 'not-allowed' }}
                            title="Item is a draft. Publish to view live page."
                          >
                            <Eye size={15} />
                          </div>
                        )}
                        <Link
                          href={`/admin/content/${type}/${item.id}`}
                          style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                          title="Edit Item"
                        >
                          <Edit size={15} />
                        </Link>
                        <button 
                          onClick={() => setDeleteConfirmId(item.id)}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', opacity: 0.7, cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                          title="Delete Item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', margin: '0.5rem 0 0.25rem 0', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#B9783B', opacity: 0.9, marginBottom: '0.5rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      /{typeConfig?.slugPrefix}/{item.slug}
                    </div>

                    {item.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8, marginBottom: '0.5rem' }}>
                        <MapPin size={13} color="#B9783B" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.location}</span>
                      </div>
                    )}

                    <p style={{ fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.8, margin: 0, lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '2.4rem', lineHeight: '1.2rem' }}>
                      {item.shortDescription}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5 }}>
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/admin/content/${type}/${item.id}`}
                      style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#B9783B', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Edit Details <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
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
            maxWidth: '440px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              color: '#EF4444',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <AlertCircle size={28} />
            </div>
            
            <h3 style={{ fontSize: '1.3rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '0.5rem' }}>
              Delete {typeConfig?.name}?
            </h3>
            <p style={{ color: '#D8C7AF', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong style={{ color: 'white' }}>{items.find(i => i.id === deleteConfirmId)?.title}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setDeleteConfirmId(null)}
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
                No, Keep
              </button>
              <button 
                onClick={handleDeleteItem}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
