'use client';

import React from 'react';
import Link from 'next/link';
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
  
  const isPeek = href?.includes('peek.com');
  const finalClassName = isPeek ? `${className || ''} peek-book-button-flat`.trim() : className;

  if (target === 'overlay') {
    return (
      <a 
        href={href} 
        onClick={(e) => {
          if (onClick) onClick(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          openOverlay(href);
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
    </Link>
  );
}
