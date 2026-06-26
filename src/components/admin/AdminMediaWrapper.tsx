'use client';

import React, { useState } from 'react';
import { Sparkles, Video, Image as ImageIcon } from 'lucide-react';
import AIImageEditor from './AIImageEditor';
import AIVideoBuilder from './AIVideoBuilder';

interface AdminMediaWrapperProps {
  type: 'image' | 'video';
  src: string;
  contextText?: string;
  onSave: (url: string) => void;
  children: React.ReactNode;
  initialCampaignName?: string;
  style?: React.CSSProperties;
  overlayStyle?: React.CSSProperties;
}

export default function AdminMediaWrapper({
  type,
  src,
  contextText,
  onSave,
  children,
  initialCampaignName,
  style,
  overlayStyle
}: AdminMediaWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleOpenEditor = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: '100%',
        height: '100%',
        ...style
      }}
    >
      {/* Wrapped original media element */}
      {children}

      {/* AI Edit Hover Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 10, 11, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          transition: 'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 20,
          ...overlayStyle
        }}
      >
        <button
          onClick={handleOpenEditor}
          type="button"
          style={{
            background: 'var(--color-primary, #d97706)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 0.9rem',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3), 0 0 15px rgba(217, 119, 6, 0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary-hover, #b45309)';
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.boxShadow = 'var(--shadow-glow, 0 0 20px rgba(217, 119, 6, 0.45))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-primary, #d97706)';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(217, 119, 6, 0.3), 0 0 15px rgba(217, 119, 6, 0.2)';
          }}
        >
          {type === 'video' ? (
            <>
              <Video size={14} />
              <span>AI Video Studio</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>AI Edit &amp; Refine</span>
            </>
          )}
        </button>
      </div>

      {/* Image Editor Modal */}
      {isOpen && type === 'image' && (
        <AIImageEditor
          currentImageUrl={src}
          contextText={contextText}
          onClose={() => setIsOpen(false)}
          onSelectImage={(url) => {
            onSave(url);
            setIsOpen(false);
          }}
        />
      )}

      {/* Video Builder Modal */}
      {isOpen && type === 'video' && (
        <AIVideoBuilder
          initialCampaignName={initialCampaignName}
          contextText={contextText}
          onClose={() => setIsOpen(false)}
          onSelectVideo={(url) => {
            onSave(url);
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
