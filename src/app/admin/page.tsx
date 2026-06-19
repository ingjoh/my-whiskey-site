'use client';

import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  Anchor, Settings, Users, LogOut, FileText, Plus, Trash2, Building,
  Copy, Layout, AlertCircle, ArrowRight, Loader2, Edit3, Image as ImageIcon,
  Compass, Sliders, Ship, MapPin, Calendar, MessageSquare, Printer, DollarSign,
  Tag, Share2
} from 'lucide-react';
import { 
  getAllPagesWithMetadata, PageMetadata, deletePageData, 
  getAllTemplates, TemplateMetadata, savePageData, loadPageData,
  loadTemplateData, getAllBookings, getContentItems
} from '@/lib/db';
import { seedTemplates } from '@/lib/pageTemplates';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  // Data states
  const [pages, setPages] = useState<PageMetadata[]>([]);
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'pages' | 'templates'>('pages');
  const [isLoading, setIsLoading] = useState(true);

  // Workspace selection state
  const [activeWorkspace, setActiveWorkspace] = useState<'cms' | 'operations' | 'system'>('operations');

  // KPI count metrics states
  const [bookingsCount, setBookingsCount] = useState(0);
  const [vesselsCount, setVesselsCount] = useState(0);
  const [crewCount, setCrewCount] = useState(0);
  const [pendingWaiversCount, setPendingWaiversCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Modal / Interaction states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [creationType, setCreationType] = useState<'template' | 'clone'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [selectedCloneSource, setSelectedCloneSource] = useState('home');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all pages and templates on load
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allPages, allTemplatesRaw, allBookings, allAssets, allStaff] = await Promise.all([
        getAllPagesWithMetadata(),
        getAllTemplates(),
        getAllBookings(),
        getContentItems('asset'),
        getContentItems('staff')
      ]);

      setPages(allPages);

      let allTemplates = allTemplatesRaw;
      // If templates collection is empty, seed them automatically
      if (allTemplates.length === 0) {
        await seedTemplates();
        allTemplates = await getAllTemplates();
      }
      setTemplates(allTemplates);

      // Set operational metrics counts
      const activeBookings = allBookings.filter(b => b.status !== 'cancelled');
      setBookingsCount(activeBookings.length);
      setPendingWaiversCount(activeBookings.filter(b => b.status === 'pending waiver').length);
      setVesselsCount(allAssets.filter((a: any) => a.isVessel).length);
      setCrewCount(allStaff.length);
      
      // Count bookings with unread messages from guests
      const unreadCount = allBookings.filter(b => b.messageStatus === 'unread').length;
      setUnreadMessagesCount(unreadCount);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast('error', 'Failed to load page data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to auto-sluggify page title
  const handleTitleChange = (title: string) => {
    setNewPageTitle(title);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .trim()
      .replace(/\s+/g, '-');       // replace spaces with hyphens
    setNewPageSlug(slug);
    setValidationError(null);
  };

  const handleSlugChange = (slug: string) => {
    const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewPageSlug(sanitized);
    setValidationError(null);
  };

  // Create new page action
  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) {
      setValidationError('Page title is required');
      return;
    }
    if (!newPageSlug.trim()) {
      setValidationError('Page URL slug is required');
      return;
    }

    // Slug validation rules
    const reservedSlugs = ['admin', 'login', 'api', 'dashboard', 'settings', 'editor', 'templates'];
    if (reservedSlugs.includes(newPageSlug)) {
      setValidationError(`"${newPageSlug}" is a reserved system path and cannot be used`);
      return;
    }

    if (pages.some(p => p.id === newPageSlug)) {
      setValidationError(`A page with slug "/${newPageSlug}" already exists`);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      let initialNodes = {};
      let initialTheme = {};

      if (creationType === 'template') {
        const templateData = await loadTemplateData(selectedTemplate);
        if (templateData) {
          initialNodes = templateData.nodes;
          initialTheme = templateData.theme;
        } else {
          // Fallback to blank page
          initialNodes = {
            root: { id: 'root', type: 'Section', props: { style: { minHeight: '100px', padding: '2rem' } }, children: [] }
          };
        }
      } else if (creationType === 'clone') {
        const cloneData = await loadPageData(selectedCloneSource);
        if (cloneData) {
          initialNodes = cloneData.nodes;
          initialTheme = cloneData.theme;
        } else {
          throw new Error('Failed to load page to clone');
        }
      }

      await savePageData(newPageSlug, initialNodes, initialTheme as any, newPageTitle);
      
      showToast('success', 'Page created successfully!');
      setShowCreateModal(false);
      
      // Reset form fields
      setNewPageTitle('');
      setNewPageSlug('');
      
      // Redirect to the newly created page editor
      router.push(`/admin/editor/${newPageSlug}`);
    } catch (error) {
      console.error('Error creating page:', error);
      setValidationError('An error occurred while creating the page. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete page action
  const handleDeletePage = async () => {
    if (!showDeleteConfirm) return;
    if (showDeleteConfirm === 'home') {
      showToast('error', 'Cannot delete the Home Page');
      return;
    }

    try {
      await deletePageData(showDeleteConfirm);
      showToast('success', 'Page deleted successfully');
      setPages(prev => prev.filter(p => p.id !== showDeleteConfirm));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting page:', error);
      showToast('error', 'Failed to delete page');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif", display: 'flex' }}>
      
      {/* Cockpit Sidebar */}
      <aside style={{ width: '260px', background: '#1E2124', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
        <div>
          {/* Logo Brand Header */}
          <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Anchor size={24} style={{ color: '#B9783B' }} />
            <div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white', display: 'block', letterSpacing: '0.05em' }}>M/Y WHISKEY</span>
              <span style={{ fontSize: '0.65rem', color: '#B9783B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cockpit Console</span>
            </div>
          </div>

          {/* Sidebar Menu Workspaces */}
          <nav style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveWorkspace('operations')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: activeWorkspace === 'operations' ? 'rgba(185,120,59,0.12)' : 'transparent',
                color: activeWorkspace === 'operations' ? '#F4F1EA' : '#D8C7AF',
                fontWeight: activeWorkspace === 'operations' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => {
                if (activeWorkspace !== 'operations') e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseOut={e => {
                if (activeWorkspace !== 'operations') e.currentTarget.style.background = 'transparent';
              }}
            >
              <Calendar size={18} style={{ color: activeWorkspace === 'operations' ? '#B9783B' : 'inherit' }} /> Charter Operations
            </button>

            <button
              onClick={() => setActiveWorkspace('cms')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: activeWorkspace === 'cms' ? 'rgba(185,120,59,0.12)' : 'transparent',
                color: activeWorkspace === 'cms' ? '#F4F1EA' : '#D8C7AF',
                fontWeight: activeWorkspace === 'cms' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => {
                if (activeWorkspace !== 'cms') e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseOut={e => {
                if (activeWorkspace !== 'cms') e.currentTarget.style.background = 'transparent';
              }}
            >
              <FileText size={18} style={{ color: activeWorkspace === 'cms' ? '#B9783B' : 'inherit' }} /> Website CMS
            </button>

            <button
              onClick={() => setActiveWorkspace('system')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: activeWorkspace === 'system' ? 'rgba(185,120,59,0.12)' : 'transparent',
                color: activeWorkspace === 'system' ? '#F4F1EA' : '#D8C7AF',
                fontWeight: activeWorkspace === 'system' ? 600 : 500,
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => {
                if (activeWorkspace !== 'system') e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseOut={e => {
                if (activeWorkspace !== 'system') e.currentTarget.style.background = 'transparent';
              }}
            >
              <Settings size={18} style={{ color: activeWorkspace === 'system' ? '#B9783B' : 'inherit' }} /> System Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Details */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.5 }}>Dispatcher Profile</span>
            <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'white', fontFamily: 'monospace' }} title={user?.email || 'Admin'}>{user?.email || 'admin@mywhiskey.com'}</span>
          </div>
          <button 
            style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', opacity: 0.6, padding: '0.25rem', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} 
            onMouseOver={e => e.currentTarget.style.opacity = '1'}
            onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
            onClick={() => router.push('/login')}
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main style={{ flex: 1, padding: '2.5rem 3rem', boxSizing: 'border-box', overflowY: 'auto', height: '100vh' }}>
        
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
            animation: 'fadeIn 0.2s ease',
            fontWeight: 500
          }}>
            {toast.message}
          </div>
        )}

        {unreadMessagesCount > 0 && (
          <div style={{
            background: 'rgba(185, 120, 59, 0.1)',
            border: '1px solid rgba(185, 120, 59, 0.3)',
            borderRadius: '8px',
            padding: '1rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#B9783B', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                {unreadMessagesCount}
              </div>
              <div>
                <strong style={{ color: 'white', display: 'block', fontSize: '0.9rem' }}>Pending Guest Messages</strong>
                <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.8 }}>There are unresolved concierge chats awaiting admin attention.</span>
              </div>
            </div>
            <Link 
              href="/admin/bookings"
              style={{
                background: '#B9783B',
                color: 'white',
                textDecoration: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
              onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
            >
              Open Bookings Command Center →
            </Link>
          </div>
        )}

        {/* CMS Workspace */}
        {activeWorkspace === 'cms' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>Website CMS Console</h1>
                <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>Create custom landing pages, edit layout blocks, and manage starter presets.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: '#B9783B', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.7rem 1.25rem', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(185,120,59,0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#a2642e'}
                onMouseOut={e => e.currentTarget.style.background = '#B9783B'}
              >
                <Plus size={16} /> Create Custom Page
              </button>
            </div>

            {/* Sub Tabs Switcher */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', paddingBottom: '1px' }}>
              <button 
                onClick={() => setActiveTab('pages')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'pages' ? '2px solid #B9783B' : '2px solid transparent',
                  color: activeTab === 'pages' ? '#F4F1EA' : '#D8C7AF',
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FileText size={16} /> Active Custom Pages ({pages.length})
              </button>
              <button 
                onClick={() => setActiveTab('templates')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'templates' ? '2px solid #B9783B' : '2px solid transparent',
                  color: activeTab === 'templates' ? '#F4F1EA' : '#D8C7AF',
                  padding: '0.6rem 1rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Layout size={16} /> Templates Library ({templates.length})
              </button>
            </div>

            {/* Pages & Templates Content Grid */}
            {activeTab === 'pages' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {pages.map((page) => (
                  <div 
                    key={page.id}
                    style={{
                      background: '#1E2124',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(185,120,59,0.35)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ background: 'rgba(185,120,59,0.08)', padding: '0.4rem', borderRadius: '4px', color: '#B9783B' }}>
                          <FileText size={16} />
                        </div>
                        {page.id !== 'home' && (
                          <button 
                            onClick={() => setShowDeleteConfirm(page.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', opacity: 0.6, cursor: 'pointer', padding: '0.25rem', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.opacity = '1'}
                            onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
                            title="Delete Page"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: 'white' }}>{page.title}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.15rem', fontFamily: 'monospace' }}>
                        /{page.id}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.4 }}>
                        Modified {new Date(page.updatedAt).toLocaleDateString()}
                      </span>
                      <Link 
                        href={`/admin/editor/${page.id}`}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#B9783B', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Edit Page <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    style={{
                      background: '#1E2124',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '140px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'rgba(185,120,59,0.35)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                  >
                    <div>
                      <div style={{ background: 'rgba(112,140,132,0.08)', padding: '0.4rem', borderRadius: '4px', color: '#708C84', width: 'fit-content', marginBottom: '0.5rem' }}>
                        <Layout size={16} />
                      </div>
                      <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 600, color: 'white' }}>{template.title}</h3>
                      <div style={{ fontSize: '0.78rem', color: '#D8C7AF', opacity: 0.6, marginTop: '0.15rem' }}>
                        Default Starter Presets
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.4 }}>
                        Editable Block Set
                      </span>
                      <Link 
                        href={`/admin/editor/template-${template.id}`}
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#708C84', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Edit Template <Edit3 size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Secondary CMS Links */}
            <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>Structured Database Directories</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <Link href="/admin/content/adventure" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Compass size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Adventures Directory</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage itineraries & routes</div>
                  </div>
                </Link>
                <Link href="/admin/content/asset" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Ship size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Assets & Fleet Register</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage boats, gear & rentals</div>
                  </div>
                </Link>
                <Link href="/admin/content/staff" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Users size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Crew & Staff Register</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Captains profiles & crew roles</div>
                  </div>
                </Link>
                <Link href="/admin/content/company" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Building size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Partner Companies Directory</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage brokers, resellers & OTAs</div>
                  </div>
                </Link>
                <Link href="/admin/content/location" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <MapPin size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Home Ports & Stopping Locations</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage stopped ports & locks</div>
                  </div>
                </Link>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>CMS Library Assets & Engine</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                <Link href="/admin/media" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <ImageIcon size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Media Library Directory</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage banner photos & files</div>
                  </div>
                </Link>
                <Link href="/admin/content" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Sliders size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Type Configuration Settings</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Customize schemas & prefixes</div>
                  </div>
                </Link>
                <Link href="/admin/collateral" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Printer size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Print Collateral Builder</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Design brochures, rack cards & crew business cards</div>
                  </div>
                </Link>
                <Link href="/admin/social-ads" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                  <Share2 size={20} color="#B9783B" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Social & Paid Ads Manager</div>
                    <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Plan campaigns, generate AI creatives & manage ad prompts</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Operations Workspace */}
        {activeWorkspace === 'operations' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>Charter Operations Command</h1>
              <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>Dispatch bookings, audit digital waiver compliance, view owner payouts, and configure stopped ports.</p>
            </div>

            {/* Operational KPI Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmed Charters</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', display: 'block', marginTop: '0.25rem' }}>{bookingsCount} Voyages</span>
              </div>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Waivers</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', display: 'block', marginTop: '0.25rem' }}>{pendingWaiversCount} Guests</span>
              </div>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Fleet</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#B9783B', display: 'block', marginTop: '0.25rem' }}>{vesselsCount} Vessels</span>
              </div>
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.7rem', color: '#D8C7AF', opacity: 0.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Staff</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#708C84', display: 'block', marginTop: '0.25rem' }}>{crewCount} Staff</span>
              </div>
            </div>

            {/* Direct Operational Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <Link href="/admin/bookings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Calendar size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Bookings Command Center</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage charter schedules & splits</div>
                </div>
              </Link>
              <Link href="/admin/customers" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Users size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>CRM Guest Directory</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Lifetime spend, waivers & notes</div>
                </div>
              </Link>
              <Link href="/admin/content/company" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Building size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Partner Companies Directory</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage brokers, agencies, resellers & OTAs</div>
                </div>
              </Link>
              <Link href="/owner/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Ship size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Fleet Owners Portal</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>View charter splits & owner payouts</div>
                </div>
              </Link>
              <Link href="/admin/content/location" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <MapPin size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Home Ports & Stopping Locations</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage stopped ports, locks & distances</div>
                </div>
              </Link>
              <Link href="/admin/messaging" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <MessageSquare size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Voyage Flow & Messaging</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage automated emails, SMS & templates</div>
                </div>
              </Link>
              <Link href="/admin/collateral" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Printer size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Print Collateral Builder</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Generate brochures, rack cards & QR marketing materials</div>
                </div>
              </Link>
              <Link href="/admin/social-ads" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Share2 size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Social & Paid Ads Manager</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Plan campaigns, generate AI creatives & manage ad prompts</div>
                </div>
              </Link>
              <Link href="/admin/commissions" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <DollarSign size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Commissions & Payouts Ledger</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Track referral fees, UTM attribution & partner payouts</div>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* System Settings Workspace */}
        {activeWorkspace === 'system' && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Header Section */}
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>System Configurations</h1>
              <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>Configure charter itineraries, asset registers, crew files, settings, and SEO headers.</p>
            </div>

            {/* Core Registers */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>Fleet & Staff Registers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
              <Link href="/admin/content/adventure" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Compass size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Adventures Directory</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage charter voyages & schedules</div>
                </div>
              </Link>
              <Link href="/admin/content/asset" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Ship size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Assets & Fleet Register</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Manage boats, gear & rentals</div>
                </div>
              </Link>
              <Link href="/admin/content/staff" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Users size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Crew & Staff Register</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Captains profiles, roles & licenses</div>
                </div>
              </Link>
              <Link href="/admin/content/company" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Building size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Companies & OTA Register</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Registered partner affiliations & brokers</div>
                </div>
              </Link>
            </div>

            {/* System Setup */}
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'white', marginBottom: '1rem' }}>Global & Account Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <Link href="/admin/settings" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Settings size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Site Branding & SEO</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Navigation header, SEO meta & logo</div>
                </div>
              </Link>
              <Link href="/admin/discounts" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Tag size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Discount Codes Admin</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Create & manage promo code vouchers</div>
                </div>
              </Link>
              <Link href="/admin/content/owner" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Users size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Owners Accounts Settings</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Vessel owner profiles & share percentages</div>
                </div>
              </Link>
              <Link href="/admin/content" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#F4F1EA', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(185,120,59,0.3)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'}>
                <Sliders size={22} color="#B9783B" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Type Configuration Settings</div>
                  <div style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7 }}>Customize routing slug schemas</div>
                </div>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#1E2124', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', color: '#D8C7AF', opacity: 0.6 }}>
                <Users size={22} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>User Directory</div>
                  <div style={{ fontSize: '0.72rem' }}>Coming Soon</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE PAGE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
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
            maxWidth: '520px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
            position: 'relative',
            animation: 'scaleIn 0.15s ease'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>Create New Page</h2>
            
            <form onSubmit={handleCreatePage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Page Title
                <input 
                  type="text"
                  placeholder="e.g. Charter Rates"
                  value={newPageTitle}
                  onChange={e => handleTitleChange(e.target.value)}
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
                URL Route Slug
                <div style={{ display: 'flex', alignItems: 'center', background: '#121416', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', paddingLeft: '0.75rem' }}>
                  <span style={{ color: '#D8C7AF', opacity: 0.5, fontSize: '0.875rem', userSelect: 'none' }}>mywhiskey.com/</span>
                  <input 
                    type="text"
                    placeholder="charter-rates"
                    value={newPageSlug}
                    onChange={e => handleSlugChange(e.target.value)}
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
              </label>

              {/* Source Option Toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                Page Source Setup
                <div style={{ display: 'flex', gap: '0.5rem', background: '#121416', padding: '0.25rem', borderRadius: '6px' }}>
                  <button 
                    type="button"
                    onClick={() => setCreationType('template')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: creationType === 'template' ? '#B9783B' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: creationType === 'template' ? 'white' : '#D8C7AF',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    Starter Template
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCreationType('clone')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      background: creationType === 'clone' ? '#B9783B' : 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: creationType === 'clone' ? 'white' : '#D8C7AF',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s'
                    }}
                  >
                    Clone Existing Page
                  </button>
                </div>
              </div>

              {creationType === 'template' ? (
                /* Select Template Radio Grid */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Select Starter Template
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {templates.map(t => (
                      <label 
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          background: selectedTemplate === t.id ? 'rgba(185,120,59,0.1)' : '#121416',
                          border: selectedTemplate === t.id ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                          padding: '0.75rem 1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <input 
                          type="radio" 
                          name="templateSelect" 
                          value={t.id} 
                          checked={selectedTemplate === t.id}
                          onChange={() => setSelectedTemplate(t.id)}
                          style={{ accentColor: '#B9783B' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                /* Select Existing Page Dropdown */
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Select Page to Clone
                  <select 
                    value={selectedCloneSource}
                    onChange={e => setSelectedCloneSource(e.target.value)}
                    style={{
                      padding: '0.75rem',
                      background: '#121416',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {pages.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} (/{p.id})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {validationError && (
                <div style={{ color: '#EF4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{validationError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewPageTitle('');
                    setNewPageSlug('');
                    setValidationError(null);
                  }}
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
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#B9783B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating...
                    </>
                  ) : (
                    'Create Page'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
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
              Delete Custom Page?
            </h3>
            <p style={{ color: '#D8C7AF', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete the page <strong style={{ color: 'white' }}>/{showDeleteConfirm}</strong>? This action will erase all page elements and cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowDeleteConfirm(null)}
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
                No, Keep Page
              </button>
              <button 
                onClick={handleDeletePage}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

