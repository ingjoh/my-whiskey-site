'use client';

import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { X as CloseIcon, Search } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
}

export default function IconPickerModal({ isOpen, onClose, onSelect, currentIcon }: IconPickerModalProps) {
  const [search, setSearch] = useState('');

  const allIconNames = useMemo(() => {
    return Object.keys(LucideIcons).filter(
      (key) => key !== 'createLucideIcon' && key !== 'default' && key !== 'LucideProps' && !key.endsWith('Icon') && /^[A-Z]/.test(key)
    );
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return allIconNames.slice(0, 100);
    return allIconNames
      .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 100);
  }, [search, allIconNames]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '2rem' }}>
      <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: '600px', maxHeight: '80vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Select Icon</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <CloseIcon size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '2.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }}>
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search icons (e.g. Anchor, Wifi, Coffee)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)', fontSize: '0.95rem' }}
            autoFocus
          />
        </div>

        {/* Icon Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
            {filteredIcons.map((iconName) => {
              const Icon = (LucideIcons as any)[iconName] as React.ComponentType<any>;
              const isSelected = currentIcon === iconName;
              
              return (
                <button
                  key={iconName}
                  onClick={() => onSelect(iconName)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem 0.5rem',
                    background: isSelected ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--color-background)',
                    border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={iconName}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = isSelected ? 'var(--color-primary)' : 'var(--color-border)')}
                >
                  <Icon size={24} />
                  <span style={{ fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                    {iconName}
                  </span>
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 100 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-muted)', fontSize: '0.875rem' }}>
              Showing first 100 results. Keep typing to refine...
            </div>
          )}
          {filteredIcons.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              No icons found for "{search}"
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
