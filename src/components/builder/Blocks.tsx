'use client';

import React from 'react';
import { PageNode } from '@/store/useBuilderStore';
import ReactMarkdown from 'react-markdown';
import { SmartLink } from '@/components/SmartLink';

export const SpecsBlock = ({ node }: { node: PageNode }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '2rem',
      padding: '4rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)',
      ...node.props.style
    }}>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Length</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.length}</ReactMarkdown></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cabins</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.cabins}</ReactMarkdown></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Guests</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.guests}</ReactMarkdown></div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h4 style={{ color: 'var(--color-muted)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Speed</h4>
        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}><ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.speed}</ReactMarkdown></div>
      </div>
    </div>
  );
};

export const HeroBlock = ({ node }: { node: PageNode }) => {
  const opacity = typeof node.props.overlayOpacity === 'number' ? node.props.overlayOpacity : 0.6;
  const fullWidth = node.props.fullWidth !== false;

  return (
    <div style={{
      width: '100%',
      maxWidth: fullWidth ? 'none' : '1200px',
      margin: '0 auto',
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      backgroundImage: `linear-gradient(rgba(0,0,0,${opacity}), rgba(0,0,0,${opacity})), url(${node.props.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      color: 'white',
      padding: '4rem 2rem',
      ...node.props.style
    }}>
      <h1 style={{ marginBottom: '1rem', maxWidth: '800px' }}>
        <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.headline}</ReactMarkdown>
      </h1>
      <p style={{ fontSize: 'var(--p-large-font-size)', fontWeight: 'var(--p-large-font-weight)', color: '#ddd', marginBottom: '2rem', maxWidth: '600px' }}>
        <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.subheadline}</ReactMarkdown>
      </p>
      <SmartLink href={node.props.buttonLink || '#'} target={node.props.buttonTarget} style={{ textDecoration: 'none' }}>
        <button style={{ padding: '1rem 2.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--a-font-size)', fontWeight: 'var(--a-font-weight)', cursor: 'pointer' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.buttonText}</ReactMarkdown>
        </button>
      </SmartLink>
    </div>
  );
};

export const GalleryBlock = ({ node }: { node: PageNode }) => {
  return (
    <div style={{
      padding: '4rem 2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      ...node.props.style
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
        <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}>
        {node.props.images && node.props.images.map((img: string, idx: number) => (
          <div key={idx} style={{ position: 'relative', borderRadius: 'var(--base-radius)', overflow: 'hidden', aspectRatio: '4/3' }}>
            {img ? (
              <img src={img} alt={`Gallery image ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-background)', border: '2px dashed var(--color-border)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DeckPlanBlock = ({ node }: { node: PageNode }) => {
  return (
    <div style={{ ...node.props.style, width: '100%' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>
        <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {node.props.imageUrl ? (
            <img 
              src={node.props.imageUrl} 
              alt="Deck Plan" 
              style={{ width: '100%', borderRadius: 'var(--base-radius)', boxShadow: 'var(--shadow-md)', objectFit: 'cover' }} 
            />
          ) : (
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--base-radius)', backgroundColor: 'var(--color-background)', border: '2px dashed var(--color-border)' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left', fontSize: '1.1rem', lineHeight: 1.6, padding: '2rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ color: 'inherit', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p style={{ margin: '0.5rem 0' }} {...props} />,
                ul: ({node, ...props}) => <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }} {...props} />,
                ol: ({node, ...props}) => <ol style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }} {...props} />,
                li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
              }}
            >
              {node.props.details}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BookingFormBlock = ({ node }: { node: PageNode }) => {
  return (
    <div style={{ ...node.props.style, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ maxWidth: '600px', width: '100%', background: 'var(--color-surface)', padding: '3rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.title}</ReactMarkdown>
        </h2>
        <div style={{ color: 'var(--color-muted)', marginBottom: '2rem' }}>
          <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.subtitle}</ReactMarkdown>
        </div>
        
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'left' }} onSubmit={(e) => e.preventDefault()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              Name
              <input type="text" placeholder="John Doe" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              Email
              <input type="email" placeholder="john@example.com" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </label>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              Preferred Dates
              <input type="date" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              Guests
              <select style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                <option>1-4 Guests</option>
                <option>5-8 Guests</option>
                <option>9-12 Guests</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            Message
            <textarea rows={4} placeholder="Any special requests?" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-background)', color: 'var(--color-foreground)' }} />
          </label>

          <button style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
            <ReactMarkdown components={{ p: (({children}: any) => <>{children}</>) as any }}>{node.props.buttonText}</ReactMarkdown>
          </button>
        </form>
      </div>
    </div>
  );
};

