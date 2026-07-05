'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getAssets, saveAsset, deleteAsset, Asset } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { Search, UploadCloud, Loader2, Image as ImageIcon, File as FileIcon, Trash2, EyeOff, Eye, Copy, Check, ArrowLeft } from 'lucide-react';

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'document'>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(24);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredAssets = assets.filter(asset => {
    if (!showHidden && asset.isHidden) return false;
    if (showHidden && !asset.isHidden) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = asset.name?.toLowerCase().includes(q);
      const titleMatch = asset.title?.toLowerCase().includes(q);
      const descMatch = asset.description?.toLowerCase().includes(q);
      const tagsMatch = asset.tags?.some(tag => tag.toLowerCase().includes(q));
      if (!nameMatch && !titleMatch && !descMatch && !tagsMatch) return false;
    }
    if (typeFilter === 'image' && !asset.type.startsWith('image/')) return false;
    if (typeFilter === 'document' && asset.type.startsWith('image/')) return false;
    return true;
  });

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    setVisibleLimit(24);
  }, [searchQuery, typeFilter, showHidden]);

  useEffect(() => {
    if (isLoading || filteredAssets.length <= visibleLimit) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => Math.min(prev + 24, filteredAssets.length));
      }
    }, { threshold: 0.1 });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [isLoading, filteredAssets.length, visibleLimit]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const allAssets = await getAssets();
      setAssets(allAssets);
    } catch (error) {
      console.error('Failed to load assets', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const results = await Promise.allSettled(
        Array.from(files).map(file => uploadFile(file, 'library'))
      );
      
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some uploads failed', failures);
        alert(`Failed to upload ${failures.length} of ${files.length} files`);
      }
      
      await loadAssets(); // Refresh
    } catch (error) {
      console.error('Upload process failed', error);
      alert('Failed to upload files');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleHide = async (asset: Asset) => {
    try {
      const updated = { ...asset, isHidden: !asset.isHidden };
      await saveAsset(updated);
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
    } catch (error) {
      console.error('Failed to toggle hide', error);
      alert('Failed to update asset visibility');
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('WARNING: Permanently deleting this asset will break any page that currently uses it. Are you sure you want to proceed?')) {
      return;
    }
    try {
      await deleteAsset(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (error) {
      console.error('Failed to delete asset', error);
      alert('Failed to delete asset');
    }
  };

  const copyToClipboard = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // filteredAssets moved to top

  return (
    <div style={{ minHeight: '100vh', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Navbar */}
      <nav style={{ background: '#1E2124', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '1.25rem', color: '#B9783B' }}>
          <ImageIcon size={24} /> Media Library Command
        </div>
        <Link 
          href="/admin" 
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#D8C7AF', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back to Main Admin
        </Link>
      </nav>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.02em' }}>Media Assets Directory</h1>
            <p style={{ color: '#D8C7AF', opacity: 0.8, margin: 0 }}>Upload, organize, and copy references for marketing layouts and banner images.</p>
          </div>
          
          <label style={{
            background: '#B9783B',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            transition: 'background 0.2s',
            opacity: isUploading ? 0.7 : 1,
            pointerEvents: isUploading ? 'none' : 'auto'
          }}>
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
            {isUploading ? 'Uploading...' : 'Upload Asset'}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
          </label>
        </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center', background: '#1E2124', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.5rem',
              background: '#121416',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              color: 'white',
              outline: 'none'
            }}
          />
        </div>
        
        <select 
          value={typeFilter} 
          onChange={e => setTypeFilter(e.target.value as any)}
          style={{
            padding: '0.75rem 1rem',
            background: '#121416',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            color: 'white',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </select>

        <div style={{ display: 'flex', background: '#121416', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <button 
            onClick={() => setShowHidden(false)}
            style={{
              padding: '0.75rem 1.25rem',
              background: !showHidden ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              color: !showHidden ? 'white' : '#888',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Active
          </button>
          <button 
            onClick={() => setShowHidden(true)}
            style={{
              padding: '0.75rem 1.25rem',
              background: showHidden ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              color: showHidden ? 'white' : '#888',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Hidden
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: '#D8C7AF' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : filteredAssets.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '4rem', background: '#1E2124', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>No assets found in this view.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '2rem' }}>
            {filteredAssets.slice(0, visibleLimit).map(asset => (
              <div key={asset.id} style={{
                background: '#1E2124',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ height: '160px', background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {asset.type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: asset.isHidden ? 0.5 : 1 }} loading="lazy" />
                  ) : (
                    <FileIcon size={48} color="#D8C7AF" opacity={0.5} />
                  )}
                  
                  {/* Actions overlay */}
                  <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                    <button 
                      onClick={() => copyToClipboard(asset.id, asset.url)}
                      title="Copy URL"
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {copiedId === asset.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                    <button 
                      onClick={() => toggleHide(asset)}
                      title={asset.isHidden ? "Unhide" : "Hide from picker"}
                      style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {asset.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    {asset.isHidden && (
                      <button 
                        onClick={() => handleDelete(asset.id)}
                        title="Permanently Delete"
                        style={{ background: 'rgba(239, 68, 68, 0.8)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }} title={asset.title || asset.name}>
                    {asset.title || asset.name}
                  </p>
                  
                  {asset.description && (
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.76rem', color: '#D8C7AF', opacity: 0.8, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {asset.description}
                    </p>
                  )}

                  {asset.tags && asset.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                      {asset.tags.map((t, idx) => (
                        <span key={idx} style={{ background: 'rgba(185, 120, 59, 0.15)', color: '#D8C7AF', fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(185, 120, 59, 0.25)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {asset.exif?.latitude && asset.exif?.longitude && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                      <span style={{ color: '#B9783B' }}>📍</span> Lat: {asset.exif.latitude.toFixed(4)}, Lon: {asset.exif.longitude.toFixed(4)}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {(asset.size / 1024).toFixed(1)} KB
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                      {asset.exif?.capturedAt ? new Date(asset.exif.capturedAt).toLocaleDateString() : new Date(asset.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredAssets.length > visibleLimit && (
            <div ref={sentinelRef} style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2rem 0' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#B9783B' }} />
            </div>
          )}
        </>
      )}
      </main>
    </div>
  );
}
