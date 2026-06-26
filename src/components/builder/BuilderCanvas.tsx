// Force Turbopack HMR
'use client';

import { useBuilderStore, PageNode } from '@/store/useBuilderStore';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { SpecsBlock, HeroBlock, DeckPlanBlock, BookingFormBlock } from './Blocks';
import { DividerBlock, IconBlock, VideoBlock, MapBlock, AccordionBlock, AmenitiesBlock,
  PricingBlock, CrewBlock, ItineraryBlock, TestimonialsBlock, VideoHeroBlock, GalleryWithLightbox, HtmlBlock,
  EnhancedHeroBlock, TextMediaBlock, ExperiencesGridBlock, YachtFeatureBlock, TestimonialsGridBlock, CTABlock, ComparisonTableBlock, TextBlock, ContentGridBlock,
  DynamicCardBlock, DynamicCarousel, BookingWidget, DynamicDetailBlock, DynamicBlogBlock } from './NewBlocks';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const NodeRenderer = ({ id }: { id: string }) => {
  const { nodes, selectedNodeId, selectNode, theme } = useBuilderStore();
  const node = nodes[id];

  const isRoot = id === 'root';
  const isSelected = selectedNodeId === id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: isRoot });

  if (!node) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(id);
  };

  const wrapperStyle: React.CSSProperties = {
    ...node.props.style,
    outline: isSelected ? '2px solid var(--color-primary)' : isRoot ? 'none' : '1px dashed transparent',
    position: 'relative' as const,
    transition: transition || 'outline 0.2s ease',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  let Content = null;
  switch (node.type) {
    case 'Text': {
      Content = <TextBlock node={node} theme={theme} />;
      break;
    }
    case 'Button':
      Content = <button style={node.props.style}>{node.props.text}</button>;
      break;
    case 'Image':
      Content = <img src={node.props.src} alt={node.props.alt} style={node.props.style} />;
      break;
    case 'Section':
      Content = (
        <SortableContext items={node.children} strategy={verticalListSortingStrategy}>
          {node.children.length === 0 && !isRoot && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              Empty Section
            </div>
          )}
          {node.children.map(childId => (
            <NodeRenderer key={childId} id={childId} />
          ))}
        </SortableContext>
      );
      break;
    case 'Specs':
      Content = <SpecsBlock node={node} />;
      break;
    case 'Hero':
      Content = <HeroBlock node={node} />;
      break;
    case 'Gallery':
      Content = <GalleryWithLightbox node={node} isEditorMode={true} />;
      break;
    case 'DeckPlan':
      Content = <DeckPlanBlock node={node} />;
      break;
    case 'BookingForm':
      Content = <BookingFormBlock node={node} />;
      break;
    case 'Divider':
      Content = <DividerBlock node={node} />;
      break;
    case 'Html':
      Content = <HtmlBlock node={node} />;
      break;
    case 'Icon':
      Content = <IconBlock node={node} />;
      break;
    case 'Video':
      Content = <VideoBlock node={node} />;
      break;
    case 'Map':
      Content = <MapBlock node={node} isEditorMode={true} />;
      break;
    case 'Accordion':
      Content = <AccordionBlock node={node} />;
      break;
    case 'Amenities':
      Content = <AmenitiesBlock node={node} />;
      break;
    case 'Pricing':
      Content = <PricingBlock node={node} />;
      break;
    case 'Crew':
      Content = <CrewBlock node={node} />;
      break;
    case 'Itinerary':
      Content = <ItineraryBlock node={node} />;
      break;
    case 'Testimonials':
      Content = <TestimonialsBlock node={node} />;
      break;
    case 'VideoHero':
      Content = <VideoHeroBlock node={node} />;
      break;
    case 'EnhancedHero':
      Content = <EnhancedHeroBlock node={node} />;
      break;
    case 'TextMedia':
      Content = <TextMediaBlock node={node} />;
      break;
    case 'ExperiencesGrid':
      Content = <ExperiencesGridBlock node={node} />;
      break;
    case 'YachtFeature':
      Content = <YachtFeatureBlock node={node} />;
      break;
    case 'TestimonialsGrid':
      Content = <TestimonialsGridBlock node={node} />;
      break;
    case 'CTA':
      Content = <CTABlock node={node} />;
      break;
    case 'ComparisonTable':
      Content = <ComparisonTableBlock node={node} />;
      break;
    case 'ContentGrid':
      Content = <ContentGridBlock node={node} />;
      break;
    case 'DynamicCardBlock':
      Content = <DynamicCardBlock node={node} />;
      break;
    case 'DynamicCarousel':
      Content = <DynamicCarousel node={node} />;
      break;
    case 'BookingWidget':
      Content = <BookingWidget node={node} />;
      break;
    case 'DynamicDetailBlock':
      Content = <DynamicDetailBlock node={node} />;
      break;
    case 'DynamicBlogBlock':
      Content = <DynamicBlogBlock node={node} />;
      break;
  }

  // Prevent overriding the style prop entirely on Text/Button/Image wrappers 
  // since we apply the style to the inner element for those, except Section where wrapper IS the styled element.
  if (node.type === 'Section') {
    return (
      <div 
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick} 
        style={wrapperStyle}
        onMouseOver={(e) => {
          e.stopPropagation();
          if (!isSelected && !isRoot && !isDragging) e.currentTarget.style.outline = '1px dashed var(--color-primary)';
        }}
        onMouseOut={(e) => {
          e.stopPropagation();
          if (!isSelected && !isRoot) e.currentTarget.style.outline = '1px dashed transparent';
        }}
      >
        {Content}
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      style={{
        outline: isSelected ? '2px solid var(--color-primary)' : '1px dashed transparent',
        padding: isSelected ? '2px' : '0',
        display: (['Specs','Hero','Gallery','Image','DeckPlan','BookingForm','Video','Map','Accordion','Amenities','Pricing','Crew','Itinerary','Testimonials','VideoHero','EnhancedHero','TextMedia','ExperiencesGrid','YachtFeature','TestimonialsGrid','CTA','ComparisonTable','ContentGrid','DynamicCardBlock','DynamicCarousel','BookingWidget','DynamicDetailBlock','DynamicBlogBlock'].includes(node.type)) ? 'block' : 'inline-block',
        width: (['Specs','Hero','Gallery','Image','DeckPlan','BookingForm','Video','Map','Accordion','Amenities','Pricing','Crew','Itinerary','Testimonials','VideoHero','EnhancedHero','TextMedia','ExperiencesGrid','YachtFeature','TestimonialsGrid','CTA','ComparisonTable','ContentGrid','DynamicCardBlock','DynamicCarousel','BookingWidget','DynamicDetailBlock','DynamicBlogBlock'].includes(node.type)) ? '100%' : 'auto',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
        cursor: 'grab'
      }}
      onMouseOver={(e) => {
        e.stopPropagation();
        if (!isSelected && !isDragging) e.currentTarget.style.outline = '1px dashed var(--color-primary)';
      }}
      onMouseOut={(e) => {
        e.stopPropagation();
        if (!isSelected) e.currentTarget.style.outline = '1px dashed transparent';
      }}
    >
      {Content}
    </div>
  );
};

export default function BuilderCanvas() {
  const { rootNodeId, selectNode, moveNode } = useBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts, allows clicks to pass through
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      moveNode(active.id as string, over.id as string);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div 
        style={{ 
          width: '100%', 
          minHeight: '100%', 
          background: 'var(--color-background)',
          boxShadow: 'var(--shadow-sm)'
        }}
        onClick={() => selectNode(null)}
      >
        <NodeRenderer id={rootNodeId} />
      </div>
    </DndContext>
  );
}
