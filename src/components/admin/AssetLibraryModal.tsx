'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, Search, Image as ImageIcon, File as FileIcon, Loader2 } from 'lucide-react';
import { getAssets, Asset } from '@/lib/db';
import { uploadFile } from '@/lib/storage';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function AssetLibraryModal({ isOpen, onClose, onSelect }: AssetLibraryModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'document'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
    }
  }, [isOpen]);

  const loadAssets = async () => {
    setIsLoading(true);
    try {
      const allAssets = await getAssets();
      // Filter out hidden assets for the picker
      setAssets(allAssets.filter(a => !a.isHidden));
    } catch (error) {
      console.error('Failed to load assets', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // uploadFile handles compression and saving to DB
      const url = await uploadFile(file, 'library');
      await loadAssets(); // Refresh the list
      
      // Auto-select the newly uploaded file? Usually a good UX.
      onSelect(url);
      onClose();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const filteredAssets = assets.filter(asset => {
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (typeFilter === 'image' && !asset.type.startsWith('image/')) return false;
    if (typeFilter === 'document' && asset.type.startsWith('image/')) return false;
    return true;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: '#121416',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '1000px',
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>Media Library</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', alignItems: 'center', background: '#1A1C1E' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                background: '#0F1113',
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
              background: '#0F1113',
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
            {isUploading ? 'Uploading...' : 'Upload New'}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#D8C7AF' }}>
              <Loader2 size={32} className="animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '4rem' }}>
              <ImageIcon size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No assets found.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => {
                    onSelect(asset.url);
                    onClose();
                  }}
                  style={{
                    background: '#1A1C1E',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#B9783B'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                >
                  <div style={{ height: '140px', background: '#0F1113', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {asset.type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <FileIcon size={48} color="#D8C7AF" opacity={0.5} />
                    )}
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {asset.name}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                      {(asset.size / 1024).toFixed(1)} KB • {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
