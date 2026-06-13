'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useOverlay } from '@/components/GlobalOverlayProvider';

export type LinkTargetBehavior = '_self' | '_blank' | 'overlay';

interface SmartLinkProps {
  href: string;
  target?: LinkTargetBehavior | string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onMouseOver?: React.MouseEventHandler<HTMLAnchorElement>;
  onMouseOut?: React.MouseEventHandler<HTMLAnchorElement>;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

export function SmartLink({ href, target = '_self', children, className, style, onMouseOver, onMouseOut, onClick }: SmartLinkProps) {
  const { openOverlay } = useOverlay();
  
  let searchParams: any = null;
  try {
    searchParams = useSearchParams();
  } catch (e) {
    // Fallback if useSearchParams is unavailable
  }

  const isPeek = href?.includes('peek.com');
  const finalClassName = isPeek ? `${className || ''} peek-book-button-flat`.trim() : className;

  // Propagate tracking parameters to internal links
  const getProcessedHref = (targetHref: string) => {
    if (!targetHref || targetHref.startsWith('http') || targetHref.startsWith('mailto:') || targetHref.startsWith('tel:') || targetHref.startsWith('#')) {
      return targetHref;
    }

    try {
      if (!searchParams) return targetHref;

      const trackingKeys = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'campaign', 'promo', 'discount'];
      const currentTrackingParams: Record<string, string> = {};

      trackingKeys.forEach(key => {
        const val = searchParams.get(key);
        if (val) {
          currentTrackingParams[key] = val;
        }
      });

      if (Object.keys(currentTrackingParams).length === 0) {
        return targetHref;
      }

      const parts = targetHref.split('?');
      const basePath = parts[0];
      const targetParams = new URLSearchParams(parts[1] || '');

      Object.entries(currentTrackingParams).forEach(([key, val]) => {
        if (!targetParams.has(key)) {
          targetParams.set(key, val);
        }
      });

      const newQuery = targetParams.toString();
      return newQuery ? `${basePath}?${newQuery}` : basePath;
    } catch (e) {
      console.warn('Error processing SmartLink href:', e);
      return targetHref;
    }
  };

  const processedHref = getProcessedHref(href);

  if (target === 'overlay') {
    return (
      <a 
        href={processedHref} 
        onClick={(e) => {
          if (onClick) onClick(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          openOverlay(processedHref);
        }}
        className={finalClassName}
        style={style}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      >
        {children}
      </a>
    );
  }

  const isExternal = href.startsWith('http');
  const targetAttr = target === '_blank' || target === 'blank' ? '_blank' : '_self';

  if (isExternal) {
    return (
      <a
        href={href}
        target={targetAttr}
        rel={targetAttr === '_blank' ? 'noopener noreferrer' : undefined}
        className={finalClassName}
        style={style}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={processedHref}
      target={targetAttr}
      rel={targetAttr === '_blank' ? 'noopener noreferrer' : undefined}
      className={finalClassName}
      style={style}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
