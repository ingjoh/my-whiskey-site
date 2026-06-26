'use client';

import { useState } from 'react';
import { ComponentType, useBuilderStore } from '@/store/useBuilderStore';
import { Type, Square, Image as ImageIcon, LayoutTemplate, Anchor, Star, ImagePlus, Layers, Box,
  Minus, Smile, PlayCircle, MapPin, ChevronDown, Grid, DollarSign, Users, Route, MessageSquare, Video, Code, Table, BookOpen
} from 'lucide-react';

const ELEMENTS_LIBRARY: { type: ComponentType; icon: React.ElementType; label: string }[] = [
  { type: 'Section', icon: LayoutTemplate, label: 'Section' },
  { type: 'Text', icon: Type, label: 'Text Block' },
  { type: 'Button', icon: Square, label: 'Button' },
  { type: 'Image', icon: ImageIcon, label: 'Image' },
  { type: 'Divider', icon: Minus, label: 'Divider' },
  { type: 'Icon', icon: Smile, label: 'Icon' },
  { type: 'Video', icon: PlayCircle, label: 'Video' },
  { type: 'Html', icon: Code, label: 'HTML Embed' },
];

const BLOCKS_LIBRARY: { type: ComponentType; icon: React.ElementType; label: string }[] = [
  { type: 'ComparisonTable', icon: Table, label: 'Comparison Table' },
  { type: 'Hero', icon: Star, label: 'Hero Banner' },
  { type: 'VideoHero', icon: Video, label: 'Video Hero' },
  { type: 'Specs', icon: Anchor, label: 'Yacht Specs' },
  { type: 'Gallery', icon: ImagePlus, label: 'Photo Gallery' },
  { type: 'Accordion', icon: ChevronDown, label: 'Accordion / FAQ' },
  { type: 'Amenities', icon: Grid, label: 'Amenities Grid' },
  { type: 'Pricing', icon: DollarSign, label: 'Pricing Table' },
  { type: 'Crew', icon: Users, label: 'Crew Profiles' },
  { type: 'Itinerary', icon: Route, label: 'Itinerary' },
  { type: 'Testimonials', icon: MessageSquare, label: 'Testimonials' },
  { type: 'DeckPlan', icon: MapPin, label: 'Deck Plan' },
  { type: 'BookingForm', icon: Type, label: 'Booking Form' },
  { type: 'EnhancedHero', icon: Star, label: 'Enhanced Hero' },
  { type: 'TextMedia', icon: LayoutTemplate, label: 'Text/Media Split' },
  { type: 'ExperiencesGrid', icon: Layers, label: 'Experiences Grid' },
  { type: 'YachtFeature', icon: Anchor, label: 'Yacht Feature' },
  { type: 'TestimonialsGrid', icon: MessageSquare, label: 'Testimonial Grid' },
  { type: 'CTA', icon: Square, label: 'Call to Action' },
  { type: 'Map', icon: MapPin, label: 'Map' },
  { type: 'ContentGrid', icon: Grid, label: 'Content Grid' },
  { type: 'DynamicCardBlock', icon: Grid, label: 'Dynamic Card Grid' },
  { type: 'DynamicCarousel', icon: Layers, label: 'Featured Carousel' },
  { type: 'BookingWidget', icon: Route, label: 'Booking Search Bar' },
  { type: 'DynamicDetailBlock', icon: LayoutTemplate, label: 'Featured CMS Detail' },
  { type: 'DynamicBlogBlock', icon: BookOpen, label: 'Dynamic Blog Feed' },
];

export default function BuilderLeftPanel() {
  const { addNode, selectedNodeId, nodes } = useBuilderStore();
  const [activeTab, setActiveTab] = useState<'elements' | 'blocks'>('elements');

  const handleAdd = (type: ComponentType) => {
    const parentId = selectedNodeId && nodes[selectedNodeId]?.type === 'Section' ? selectedNodeId : 'root';
    addNode(type, parentId);
  };

  return (
    <aside style={{ width: '280px', background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Anchor size={20} /> MY Whiskey
        </h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <button 
          onClick={() => setActiveTab('elements')}
          style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'elements' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'elements' ? 'var(--color-primary)' : 'var(--color-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Box size={16} /> Elements
        </button>
        <button 
          onClick={() => setActiveTab('blocks')}
          style={{ flex: 1, padding: '1rem', background: 'transparent', border: 'none', borderBottom: activeTab === 'blocks' ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === 'blocks' ? 'var(--color-primary)' : 'var(--color-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Layers size={16} /> Blocks
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {(activeTab === 'elements' ? ELEMENTS_LIBRARY : BLOCKS_LIBRARY).map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => handleAdd(type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-foreground)',
                fontSize: '0.875rem',
                transition: 'all var(--transition-fast)',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--color-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.color = 'var(--color-foreground)';
              }}
            >
              <Icon size={24} />
              <span style={{ textAlign: 'center' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
