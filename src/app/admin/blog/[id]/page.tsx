'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Save, Loader2, Image as ImageIcon, Sparkles, AlertCircle, Calendar as CalendarIcon, Clock, Check
} from 'lucide-react';
import { 
  getBlogPostBySlug, saveBlogPost, BlogPost, getCalendarEvents, CalendarEvent 
} from '@/lib/db';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';
import AIFieldWrapper from '@/components/admin/AIFieldWrapper';
import ToastEditor from '@/components/admin/ToastEditor';
import { useAuth } from '@/components/AuthProvider';
import AdminMediaWrapper from '@/components/admin/AdminMediaWrapper';

export default function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { user } = useAuth();

  // Form States
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [heroImage, setHeroImage] = useState('');
  const [tags, setTags] = useState('');
  const [authorName, setAuthorName] = useState('M/Y Whiskey');
  const [createdAt, setCreatedAt] = useState('');

  // Page States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals & AI States
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  
  // AI Copywriter states
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [aiOutline, setAiOutline] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');

  // AI Image states
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageError, setImageError] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Auto-slugify title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (id === 'new') {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generatedSlug);
    }
  };

  useEffect(() => {
    async function loadPost() {
      if (id === 'new') {
        // Check query parameters for AI pre-filled data
        const searchParams = new URLSearchParams(window.location.search);
        const preTitle = searchParams.get('pre_title');
        const preSummary = searchParams.get('pre_summary');
        
        if (preTitle) handleTitleChange(preTitle);
        if (preSummary) setSummary(preSummary);
        
        setIsLoading(false);
        return;
      }
      
      try {
        const postData = await getBlogPostBySlug(id);
        if (postData) {
          setTitle(postData.title || '');
          setSlug(postData.slug || '');
          setSummary(postData.summary || '');
          setContent(postData.content || '');
          setStatus(postData.status || 'draft');
          setPublishDate(postData.publishDate || new Date().toISOString().split('T')[0]);
          setHeroImage(postData.heroImage || '');
          setTags(postData.tags ? postData.tags.join(', ') : '');
          setAuthorName(postData.authorName || 'M/Y Whiskey');
          setCreatedAt(postData.createdAt || '');
        } else {
          setError('Logbook entry not found.');
        }
      } catch (err) {
        console.error('Error loading blog post:', err);
        setError('Error loading blog post database record.');
      } finally {
        setIsLoading(false);
      }
    }
    loadPost();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      showToast('Title and Slug are required.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const postSlug = slug.trim().toLowerCase().replace(/\s+/g, '-');
      
      const tagList = tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      const postData: Omit<BlogPost, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string } = {
        id: id === 'new' ? postSlug : id,
        slug: postSlug,
        title: title.trim(),
        summary: summary.trim(),
        content: content,
        status,
        publishDate,
        heroImage,
        tags: tagList,
        authorName: authorName.trim(),
        createdAt: createdAt || new Date().toISOString()
      };

      await saveBlogPost(postData);
      showToast('Blog article saved successfully!', 'success');
      
      if (id === 'new') {
        router.replace(`/admin/blog/${postSlug}`);
      }
    } catch (err) {
      console.error('Failed to save blog post:', err);
      showToast('Error saving article.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Content Copywriter Generator
  const handleGenerateAICopy = async () => {
    if (!title.trim()) {
      showToast('Please enter an article title first.', 'error');
      return;
    }
    setIsGeneratingCopy(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/admin/blog/generate-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          summary,
          outline: aiOutline,
          instructions: aiInstructions
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate copy');
      }

      setContent(data.markdown || '');
      if (data.imagePrompt) {
        setImagePrompt(data.imagePrompt);
      }
      showToast('AI successfully wrote the article copy and recommended an image prompt!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'AI Copywriter failed.', 'error');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // AI Image Imagen Generator
  const handleGenerateAIImage = async () => {
    if (!imagePrompt.trim()) {
      setImageError('Please enter a detailed prompt.');
      return;
    }
    setIsGeneratingImage(true);
    setImageError('');
    try {
      const token = user ? await user.getIdToken() : '';
      const response = await fetch('/api/admin/blog/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          slug
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      setHeroImage(data.url);
      setImagePrompt('');
      showToast('AI generated lead image successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      setImageError(err.message || 'Image generation failed.');
      showToast('AI Image generation failed.', 'error');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} className="animate-spin" color="#B9783B" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <AlertCircle size={40} color="#ef4444" style={{ marginBottom: '1rem' }} />
        <h3>{error}</h3>
        <Link href="/admin/blog" style={{ textDecoration: 'none', color: '#B9783B', fontWeight: 600, marginTop: '1.5rem' }}>
          Return to Blog Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "var(--font-sans, 'Inter', sans-serif)", padding: '2rem' }}>
      
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 10000,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
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

      <form onSubmit={handleSave} style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Editor Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/admin/blog" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', background: '#1E2124', border: '1px solid rgba(255,255,255,0.08)', color: '#F4F1EA', textDecoration: 'none' }}>
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, fontFamily: "var(--font-heading)" }}>
                {id === 'new' ? 'Create Logbook Entry' : 'Edit Logbook Entry'}
              </h1>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Draft, write, review, and schedule the article.</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            style={{ 
              background: '#B9783B', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '0.6rem 1.5rem', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              cursor: 'pointer', 
              opacity: isSaving ? 0.6 : 1 
            }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Article
          </button>
        </div>

        {/* Two-Column Editor Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
          
          {/* Left Column: Form Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Base Metadata Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontFamily: "var(--font-heading)", fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', margin: 0 }}>
                Base Information
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#D8C7AF' }}>
                  Article Title
                  <AIFieldWrapper promptContext="Blog post title" onGenerate={handleTitleChange} currentValue={title}>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => handleTitleChange(e.target.value)} 
                      placeholder="e.g. 5 Best Snorkeling Spots in Destin, FL"
                      style={{ width: '100%', padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                      required
                    />
                  </AIFieldWrapper>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#D8C7AF' }}>
                    URL Path (Slug)
                    <input 
                      type="text" 
                      value={slug} 
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} 
                      placeholder="5-best-snorkeling-spots"
                      style={{ padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                      required
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#D8C7AF' }}>
                    Author Name
                    <input 
                      type="text" 
                      value={authorName} 
                      onChange={(e) => setAuthorName(e.target.value)} 
                      style={{ padding: '0.65rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.825rem', fontWeight: 600, color: '#D8C7AF' }}>
                  Short Summary (Search snippets / Listing preview)
                  <AIFieldWrapper promptContext="Blog summary snippet" onGenerate={setSummary} currentValue={summary}>
                    <textarea 
                      value={summary} 
                      onChange={(e) => setSummary(e.target.value)} 
                      placeholder="Brief 1-2 sentence preview summary of the post..."
                      rows={2}
                      style={{ width: '100%', padding: '0.65rem', paddingRight: '2.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </AIFieldWrapper>
                </label>
              </div>
            </div>

            {/* Rich Text Editor Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontFamily: "var(--font-heading)", fontWeight: 700, margin: 0 }}>
                  Article Body Copy
                </h2>
                <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Visual WYSIWYG & Markdown modes supported</span>
              </div>
              
              <ToastEditor initialValue={content} onChange={setContent} />
            </div>

          </div>

          {/* Right Column: Settings & AI sidebars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Status & Scheduler Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', margin: 0 }}>
                Publish Controls
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#D8C7AF' }}>
                  Status
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{ padding: '0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.825rem', cursor: 'pointer' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="published">Published Immediately</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#D8C7AF' }}>
                  Publish Date
                  <input 
                    type="date" 
                    value={publishDate} 
                    onChange={(e) => setPublishDate(e.target.value)} 
                    style={{ padding: '0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.825rem' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: '#D8C7AF' }}>
                  Tags (comma separated)
                  <input 
                    type="text" 
                    value={tags} 
                    onChange={(e) => setTags(e.target.value)} 
                    placeholder="yacht, snorkeling, beach"
                    style={{ padding: '0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', outline: 'none', fontSize: '0.825rem' }}
                  />
                </label>
              </div>
            </div>

            {/* Hero Image Selector Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', margin: 0 }}>
                Lead Hero Image
              </h3>

              {heroImage ? (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                  <AdminMediaWrapper
                    type="image"
                    src={heroImage}
                    contextText={[title, summary].filter(Boolean).join('\n')}
                    onSave={(url) => {
                      setHeroImage(url);
                      showToast('Hero image updated with AI refined creative.', 'success');
                    }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                  >
                    <img src={heroImage} alt="Hero preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </AdminMediaWrapper>
                  <button 
                    onClick={() => setHeroImage('')}
                    type="button"
                    style={{ position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 30 }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  style={{ width: '100%', height: '100px', background: '#121416', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '6px', color: '#a1a1aa', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.border = '2px dashed #B9783B'}
                  onMouseLeave={e => e.currentTarget.style.border = '2px dashed rgba(255,255,255,0.08)'}
                >
                  <ImageIcon size={20} />
                  <span style={{ fontSize: '0.78rem' }}>Select from Library</span>
                </button>
              )}

              {/* AI Image Generation field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D8C7AF', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Sparkles size={12} color="#d97706" /> Generate Image with Imagen
                </span>
                <input 
                  type="text"
                  placeholder="e.g. Luxury yacht cruising at sunset, photorealistic, 4k"
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  style={{ padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', fontSize: '0.78rem', outline: 'none' }}
                />
                <button
                  type="button"
                  onClick={handleGenerateAIImage}
                  disabled={isGeneratingImage}
                  style={{ background: 'rgba(217, 119, 6, 0.1)', border: '1px solid rgba(217, 119, 6, 0.25)', borderRadius: '6px', color: '#d97706', fontSize: '0.75rem', padding: '0.4rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                >
                  {isGeneratingImage ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {isGeneratingImage ? 'Generating image...' : 'Generate Image'}
                </button>
                {imageError && (
                  <span style={{ color: '#ef4444', fontSize: '0.68rem', display: 'block', marginTop: '0.2rem' }}>{imageError}</span>
                )}
              </div>
            </div>

            {/* AI Copywriter Sidebar Card */}
            <div style={{ background: '#1E2124', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} color="#d97706" /> AI Writer Assistant
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Target Outline (optional)
                  <textarea 
                    placeholder="e.g. 'Intro, Section 1: Top Snorkeling sites, Section 2: Yacht Comforts, Conclusion'"
                    value={aiOutline}
                    onChange={e => setAiOutline(e.target.value)}
                    rows={2}
                    style={{ padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', fontSize: '0.78rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: '#a1a1aa' }}>
                  Special Writing Instructions
                  <textarea 
                    placeholder="e.g. 'Make it 500 words, mention Crab Island, emphasize safety guidelines for families.'"
                    value={aiInstructions}
                    onChange={e => setAiInstructions(e.target.value)}
                    rows={2}
                    style={{ padding: '0.45rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#F4F1EA', fontSize: '0.78rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleGenerateAICopy}
                  disabled={isGeneratingCopy}
                  style={{ background: 'var(--color-primary, #d97706)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: isGeneratingCopy ? 0.6 : 1 }}
                >
                  {isGeneratingCopy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isGeneratingCopy ? 'Writing article...' : 'Draft Post Content'}
                </button>
              </div>
            </div>

          </div>

        </div>

      </form>

      {/* Media Library Modal integration */}
      {isMediaModalOpen && (
        <AssetLibraryModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onSelect={(url) => {
            setHeroImage(url);
            setIsMediaModalOpen(false);
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
    </div>
  );
}
