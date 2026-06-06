'use client';

import React, { useRef } from 'react';
import * as LucideIcons from 'lucide-react';

interface SwipeScrollContainerProps {
  children: React.ReactNode;
  active: boolean;
  className?: string;
  style?: React.CSSProperties;
  gridTemplateColumns?: string;
  gap?: string;
  arrowColor?: string;
}

export const SwipeScrollContainer = ({
  children,
  active,
  className = '',
  style = {},
  gridTemplateColumns,
  gap = '2rem',
  arrowColor = 'var(--color-primary)'
}: SwipeScrollContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!active) {
    // Normal desktop grid representation
    return (
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplateColumns,
          gap: gap,
          ...style
        }}
      >
        {children}
      </div>
    );
  }

  const handlePrev = () => {
    if (containerRef.current) {
      // Scroll by one card-width chunk
      const container = containerRef.current;
      const scrollAmount = container.clientWidth * 0.82;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (containerRef.current) {
      // Scroll by one card-width chunk
      const container = containerRef.current;
      const scrollAmount = container.clientWidth * 0.82;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="swipe-scroll-wrapper" style={{ position: 'relative', width: '100%' }}>
      {/* Top right control bar visible on mobile only */}
      <div className="swipe-scroll-arrows-container">
        <button
          onClick={handlePrev}
          className="swipe-scroll-arrow-btn prev"
          type="button"
          aria-label="Previous items"
          style={{ borderColor: arrowColor }}
        >
          <LucideIcons.ChevronLeft size={18} style={{ color: arrowColor }} />
        </button>
        <button
          onClick={handleNext}
          className="swipe-scroll-arrow-btn next"
          type="button"
          aria-label="Next items"
          style={{ borderColor: arrowColor }}
        >
          <LucideIcons.ChevronRight size={18} style={{ color: arrowColor }} />
        </button>
      </div>

      <div
        ref={containerRef}
        className={`swipe-scroll-active ${className}`}
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplateColumns,
          gap: gap,
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};
