'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Plus, Settings, Calendar as CalendarIcon, Clock, Eye, Trash2, Edit2, 
  Sparkles, Loader2, Check, Moon, Sun, BookOpen, FileText, ArrowRight
} from 'lucide-react';
import { 
  getBlogPosts, getBlogSettings, saveBlogSettings, deleteBlogPost, BlogPost, BlogSettings 
} from '@/lib/db';
import { useAuth } from '@/components/AuthProvider';

export default function BlogAdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [settings, setSettings] = useState<BlogSettings>({ globalTheme: 'dark', updatedAt: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // AI Planner States
  const [isPlanning, setIsPlanning] = useState(false);
  const [plannedIdeas, setPlannedIdeas] = useState<Array<{ title: string; hook: string; suggestedTags: string[]; outline: string }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allPosts = await getBlogPosts();
      const blogSettings = await getBlogSettings();
      setPosts(allPosts);
      setSettings(blogSettings);
    } catch (err) {
      console.error('Error loading admin blog dashboard:', err);
      showToast('Failed to load blog database.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleTheme = async () => {
    setIsSavingSettings(true);
    const newTheme = settings.globalTheme === 'dark' ? 'light' : 'dark';
    try {
      const success = await saveBlogSettings({ globalTheme: newTheme });
      if (success) {
        setSettings({ ...settings, globalTheme: newTheme });
        showToast(`Theme switched to ${newTheme === 'dark' ? 'Dark Mode' : 'Light Mode'} successfully!`, 'success');
      } else {
        showToast('Failed to save settings.', 'error');
      }
    } catch (err) {
      showToast('Error toggling settings.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }
    try {
      const success = await deleteBlogPost(id);
      if (success) {
        setPosts(posts.filter(p => p.id !== id));
        showToast('Blog post deleted successfully.', 'success');
      } else {
        showToast('Failed to delete post.', 'error');
      }
    } catch (err) {
      showToast('Error deleting post.', 'error');
    }
  };

  const handleGenerateIdeas = async () => {
    setIsPlanning(true);
    setPlannedIdeas([]);
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/admin/blog/generate-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate ideas');
      }
      setPlannedIdeas(data.ideas || []);
      showToast('AI Post Planner generated 5 fresh concepts!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'AI Idea generation failed.', 'error');
    } finally {
      setIsPlanning(false);
    }
  };

  const drafts = posts.filter(p => p.status === 'draft');
  const scheduled = posts.filter(p => p.status === 'scheduled');
  const published = posts.filter(p => p.status === 'published');

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "var(--font-sans, 'Inter', sans-serif)", padding: '2rem' }}>
      
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 1000,
          background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#d97706',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          fontWeight: 600,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'slideIn 0.2s ease'
        }}>
          {toast.type === 'success' && <Check size={16} />}
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/admin" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', color: '#F4F1EA', textDecoration: 'none' }}>
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                Blog & Editorial Manager
              </h1>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Plan, schedule, and write marketing content with Google AI.</span>
            </div>
          </div>
          <Link href="/admin/blog/new" style={{ textDecoration: 'none' }}>
            <button style={{ background: '#B9783B', color: 'white', border: 'none', borderRadius: '6px', padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', transition: 'background 0.2s' }}>
              <Plus size={16} /> New Article
            </button>
          </Link>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Loader2 size={36} className="animate-spin" color="#B9783B" />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
            
            {/* Left Column: Post Manager Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Scheduled Posts */}
              {scheduled.length > 0 && (
                <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d97706' }}>
                    <Clock size={16} /> Scheduled Publications ({scheduled.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {scheduled.map(post => (
                      <PostRow key={post.id} post={post} onDelete={handleDeletePost} />
                    ))}
                  </div>
                </div>
              )}

              {/* Drafts */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ededed' }}>
                  <FileText size={16} /> Editorial Drafts ({drafts.length})
                </h3>
                {drafts.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', opacity: 0.5, fontStyle: 'italic' }}>No drafts in progress. Click "New Article" to start writing.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {drafts.map(post => (
                      <PostRow key={post.id} post={post} onDelete={handleDeletePost} />
                    ))}
                  </div>
                )}
              </div>

              {/* Published Posts */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                  <BookOpen size={16} /> Published Logs ({published.length})
                </h3>
                {published.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', opacity: 0.5, fontStyle: 'italic' }}>No articles published yet.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {published.map(post => (
                      <PostRow key={post.id} post={post} onDelete={handleDeletePost} isPublished />
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Settings & AI Ideator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Global Theme Settings Card */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Settings size={16} /> Blog Config
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Public Theme</span>
                  <button 
                    onClick={handleToggleTheme}
                    disabled={isSavingSettings}
                    style={{
                      background: '#121416',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      color: '#F4F1EA',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {settings.globalTheme === 'dark' ? (
                      <>
                        <Moon size={14} color="#d97706" /> Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun size={14} color="#f59e0b" /> Light Mode
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI Content Ideator Card */}
              <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#d97706" /> AI Content Ideator
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.4, display: 'block' }}>
                    Analyzes calendar event slow slumps and regional Destin spikes to suggest 5 relevant blog post hooks.
                  </span>
                </div>

                <button
                  onClick={handleGenerateIdeas}
                  disabled={isPlanning}
                  style={{
                    background: 'rgba(217, 119, 6, 0.1)',
                    border: '1px solid rgba(217, 119, 6, 0.3)',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    color: '#d97706',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(217, 119, 6, 0.1)'}
                >
                  {isPlanning ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Blog Ideas
                    </>
                  )}
                </button>

                {/* Ideas list */}
                {plannedIdeas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', animation: 'fadeIn 0.2s' }}>
                    {plannedIdeas.map((idea, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          router.push(`/admin/blog/new?pre_title=${encodeURIComponent(idea.title)}&pre_summary=${encodeURIComponent(idea.hook)}`);
                        }}
                        style={{ 
                          background: '#121416', 
                          border: '1px solid rgba(255,255,255,0.04)', 
                          borderRadius: '6px', 
                          padding: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.border = '1px solid rgba(217, 119, 6, 0.3)';
                          e.currentTarget.style.boxShadow = '0 0 10px rgba(217, 119, 6, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.border = '1px solid rgba(255,255,255,0.04)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F4F1EA', display: 'block', marginBottom: '0.2rem', lineHeight: 1.2 }}>{idea.title}</span>
                        <p style={{ fontSize: '0.7rem', color: '#a1a1aa', margin: 0, lineHeight: 1.3 }}>{idea.hook}</p>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#B9783B', fontSize: '0.65rem', fontWeight: 600, marginTop: '0.4rem', textTransform: 'uppercase' }}>
                          Create Post <ArrowRight size={10} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}

/* Post list item component */
function PostRow({ post, onDelete, isPublished = false }: { post: BlogPost; onDelete: (id: string) => void; isPublished?: boolean }) {
  const publishDateFormatted = new Date(post.publishDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#121416', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '70%' }}>
        <strong style={{ fontSize: '0.875rem', color: '#F4F1EA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: '#a1a1aa' }}>
          <span>{publishDateFormatted}</span>
          {post.tags && post.tags.length > 0 && (
            <span style={{ color: '#B9783B' }}>{post.tags.slice(0, 2).map(t => `#${t}`).join(' ')}</span>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {isPublished && (
          <Link href={`/blog/${post.slug}`} target="_blank" style={{ textDecoration: 'none' }}>
            <button title="View Live" style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }} onMouseOver={e => e.currentTarget.style.color = '#F4F1EA'} onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}>
              <Eye size={15} />
            </button>
          </Link>
        )}
        <Link href={`/admin/blog/${post.id}`} style={{ textDecoration: 'none' }}>
          <button title="Edit Article" style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }} onMouseOver={e => e.currentTarget.style.color = '#B9783B'} onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}>
            <Edit2 size={15} />
          </button>
        </Link>
        <button 
          title="Delete Article" 
          onClick={() => onDelete(post.id)}
          style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)', cursor: 'pointer', padding: '0.3rem', borderRadius: '4px' }} 
          onMouseOver={e => e.currentTarget.style.color = '#ef4444'} 
          onMouseOut={e => e.currentTarget.style.color = 'rgba(239,68,68,0.7)'}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
