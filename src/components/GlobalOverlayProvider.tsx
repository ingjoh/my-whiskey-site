'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X } from 'lucide-react';

interface GlobalOverlayContextType {
  openOverlay: (url: string) => void;
  closeOverlay: () => void;
}

const GlobalOverlayContext = createContext<GlobalOverlayContextType | undefined>(undefined);

export function GlobalOverlayProvider({ children }: { children: ReactNode }) {
  const [modalUrl, setModalUrl] = useState<string | null>(null);

  const openOverlay = (url: string) => {
    setModalUrl(url);
  };

  const closeOverlay = () => {
    setModalUrl(null);
  };

  return (
    <GlobalOverlayContext.Provider value={{ openOverlay, closeOverlay }}>
      {children}
      {modalUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: '1000px', 
            height: '80vh', 
            background: 'var(--color-surface, #171717)', 
            borderRadius: 'var(--radius-lg, 0.5rem)', 
            overflow: 'hidden', 
            border: '1px solid var(--color-border, #333)' 
          }}>
            <button 
              onClick={closeOverlay}
              style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '1rem', 
                zIndex: 10, 
                background: 'rgba(0,0,0,0.5)', 
                border: 'none', 
                color: 'white', 
                padding: '0.5rem', 
                borderRadius: '50%', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <X size={20} />
            </button>
            <iframe src={modalUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="payment" />
          </div>
        </div>
      )}
    </GlobalOverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(GlobalOverlayContext);
  if (context === undefined) {
    throw new Error('useOverlay must be used within a GlobalOverlayProvider');
  }
  return context;
}
