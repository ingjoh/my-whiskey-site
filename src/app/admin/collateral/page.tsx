'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Printer, Save, ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown,
  Layers, Settings, Layout, Palette, Phone, Shield, Calendar, MapPin, Users, Clock, Mail,
  FileText, Image as ImageIcon, QrCode, PlusCircle, LayoutGrid, CheckCircle2,
  AlertTriangle, RefreshCw, ZoomIn, ZoomOut, Check, Sparkles, ExternalLink, Compass, Anchor,
  FolderOpen, Search
} from 'lucide-react';
import { usePrintBuilderStore, PRINT_PRESETS, PrintElement, PrintZone, PrintPage } from '@/store/usePrintBuilderStore';
import { getContentItems, ContentItem, loadSiteSettings, savePrintDesign, loadPrintDesign, getAllPrintDesigns, deletePrintDesign, getAllDiscountCodes, DiscountCode } from '@/lib/db';
import AssetLibraryModal from '@/components/admin/AssetLibraryModal';
import { useSiteSettings } from '@/components/SiteSettingsProvider';

function formatMarkdown(text: string): string {
  if (!text) return '';
  
  // First handle headers
  let html = text
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    
  // Handle bold and italic
  html = html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
  // Handle list items: lines starting with *, -, or •
  html = html.replace(/^[•\-\*]\s+(.*?)$/gm, '<li>$1</li>');
    
  // Wrap consecutive <li> tags in a <ul> tag
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  // Replace remaining newlines with <br />
  html = html.replace(/\n/g, '<br />');
  
  // clean up duplicate brs around ul/li/h
  html = html.replace(/<\/(h[1-3]|ul|li)><br \/>/g, '<\/$1>');

  return html;
}

export default function AdvancedCollateralBuilder() {
  const router = useRouter();
  const { settings: contextSettings } = useSiteSettings();

  // Print Builder Store Bindings
  const {
    preset, width, height, gridCols, gridRows, pages, selectedPageId, selectedZoneId, selectedElementId, repeatLayout, printTheme, hideGuides,
    setPreset, setCustomSize, setGridDimensions, setPrintTheme, setHideGuides,
    addPage, removePage, selectPage,
    addZone, updateZoneGrid, updateZoneProps, removeZone, selectZone,
    addElement, updateElementProps, removeElement, selectElement, reorderElement, moveElement,
    updateRepeatConfig, loadDesignState
  } = usePrintBuilderStore();

  // Local Component States
  const [adventures, setAdventures] = useState<ContentItem[]>([]);
  const [vessels, setVessels] = useState<ContentItem[]>([]);
  const [staffList, setStaffList] = useState<ContentItem[]>([]);
  const [companies, setCompanies] = useState<ContentItem[]>([]);
  const [locations, setLocations] = useState<ContentItem[]>([]);
  const [savedDesigns, setSavedDesigns] = useState<any[]>([]);
  const [currentDesignId, setCurrentDesignId] = useState<string>('default-trifold');
  const [designName, setDesignName] = useState<string>('My Custom Tri-Fold');
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [zoomFactor, setZoomFactor] = useState<number>(0.85);
  
  // Selected Grid Cell Coordinates for Snapping
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number } | null>(null);
  
  // Image Uploader states
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isOpenDesignModalOpen, setIsOpenDesignModalOpen] = useState(false);
  const [designSearchQuery, setDesignSearchQuery] = useState('');
  const [mediaTarget, setMediaTarget] = useState<{ zoneId: string; elementId: string | null } | null>(null);
  const [brandColors, setBrandColors] = useState<Array<{ name: string; value: string }>>([
    { name: 'Deep Charcoal', value: '#1F2326' },
    { name: 'Warm Off-White', value: '#F4F1EA' },
    { name: 'Whiskey Amber', value: '#B9783B' },
    { name: 'Deep Navy', value: '#1E3A4C' },
    { name: 'Muted Sand', value: '#D8C7AF' },
    { name: 'Sea Glass', value: '#708C84' }
  ]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [selectedTemplateStaffSlug, setSelectedTemplateStaffSlug] = useState<string>('');

  // Toasts notification state & handler
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Drag over cell coordinates for snap highlight indicators
  const [dragOverCell, setDragOverCell] = useState<{ col: number; row: number } | null>(null);

  // Business default details (loaded dynamically from site settings)
  const [businessDetails, setBusinessDetails] = useState({
    name: 'Motor Yacht Whiskey',
    url: 'https://mywhiskey.com',
    phone: '(850) 555-0199',
    email: 'charters@mywhiskey.com',
    address: 'Destin Harbor, Destin, FL 32541',
    instagram: '',
    facebook: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  });

  // Load Database directories
  useEffect(() => {
    async function loadData() {
      try {
        const [allAdventures, allAssets, allStaff, allCompanies, allLocations, settings, designs, allDiscounts] = await Promise.all([
          getContentItems('adventure'),
          getContentItems('asset'),
          getContentItems('staff'),
          getContentItems('company'),
          getContentItems('location'),
          loadSiteSettings(),
          getAllPrintDesigns(),
          getAllDiscountCodes()
        ]);

        if (settings) {
          setSiteSettings(settings);
        }

        if (settings?.brand?.colors && settings.brand.colors.length > 0) {
          setBrandColors(settings.brand.colors);
        }

        if (settings?.contact) {
          setBusinessDetails({
            name: settings.general?.siteName || 'Motor Yacht Whiskey',
            url: 'https://mywhiskey.com',
            phone: settings.contact.phone || '(850) 555-0199',
            email: settings.contact.email || 'charters@mywhiskey.com',
            address: settings.contact.address || 'Destin Harbor, Destin, FL 32541',
            instagram: settings.social?.instagram || '',
            facebook: settings.social?.facebook || '',
            twitter: settings.social?.twitter || '',
            linkedin: settings.social?.linkedin || '',
            youtube: settings.social?.youtube || ''
          });
        }

        setAdventures(allAdventures.filter(a => a.status === 'published'));
        setVessels(allAssets.filter(a => a.isVessel && a.status === 'published'));
        setStaffList(allStaff.filter(s => s.status === 'published'));
        setCompanies(allCompanies.filter(c => c.status === 'published'));
        setLocations(allLocations.filter(l => l.status === 'published'));
        setSavedDesigns(designs);
        setDiscountCodes(allDiscounts.filter(d => d.active));

        // Load active design
        if (designs.length > 0) {
          let active = designs[0];
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const queryDesignId = params.get('designId');
            if (queryDesignId) {
              const matched = designs.find(d => d.id === queryDesignId);
              if (matched) {
                active = matched;
              }
            }
          }
          setCurrentDesignId(active.id);
          setDesignName(active.name);
          loadDesignState(active);
        }
      } catch (err) {
        console.error('Failed to load database directories for collateral builder:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveDesign = async () => {
    setSaveStatus('saving');
    try {
      const stateObj = {
        preset,
        width,
        height,
        gridCols,
        gridRows,
        pages,
        repeatLayout,
        printTheme
      };
      await savePrintDesign(currentDesignId, designName, stateObj);
      
      // Refresh list
      const designs = await getAllPrintDesigns();
      setSavedDesigns(designs);
      
      setSaveStatus('success');
      showNotification('Design successfully saved.', 'success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Error saving print design:', err);
      setSaveStatus('error');
      showNotification('Failed to save print design.', 'error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCreateNewDesign = () => {
    const newId = `design-${crypto.randomUUID().slice(0, 8)}`;
    setCurrentDesignId(newId);
    setDesignName('New Custom Brochure');
    setPreset('letter-landscape');
    showNotification('Created new print layout.', 'info');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('designId', newId);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSelectDesignChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'new') {
      handleCreateNewDesign();
      return;
    }
    const matched = savedDesigns.find(d => d.id === id);
    if (matched) {
      setCurrentDesignId(id);
      setDesignName(matched.name);
      loadDesignState(matched);
      showNotification(`Loaded design: "${matched.name}".`, 'info');
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('designId', id);
        window.history.pushState({}, '', url.toString());
      }
    }
  };

  // Helper to handle grid cell selection
  const handleCellClick = (col: number, row: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If cell contains an existing zone, select that zone instead
    const activePage = pages.find(p => p.id === selectedPageId);
    const existingZone = activePage?.zones.find(z => 
      col >= z.columnStart && 
      col < z.columnStart + z.columnSpan &&
      row >= z.rowStart && 
      row < z.rowStart + z.rowSpan
    );

    if (existingZone) {
      selectZone(existingZone.id);
      setSelectedCell(null);
    } else {
      setSelectedCell({ col, row });
      selectZone(null);
    }
  };

  // Drag and Drop handlers
  const handleDragOverCell = (e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!dragOverCell || dragOverCell.col !== col || dragOverCell.row !== row) {
      setDragOverCell({ col, row });
    }
  };

  const handleDragLeaveCell = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCell(null);
  };

  const handleDropOnCell = (e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    setDragOverCell(null);
    
    const sourceElementId = e.dataTransfer.getData('sourceElementId');
    const activePage = pages.find(p => p.id === selectedPageId);
    if (!activePage) return;

    // Check if cell is empty
    const existingZone = activePage.zones.find(z => 
      col >= z.columnStart && 
      col < z.columnStart + z.columnSpan &&
      row >= z.rowStart && 
      row < z.rowStart + z.rowSpan
    );

    if (sourceElementId) {
      // MOVE operation (existing element dragged)
      const sourcePageId = e.dataTransfer.getData('sourcePageId');
      const sourceZoneId = e.dataTransfer.getData('sourceZoneId');
      
      if (existingZone) {
        if (sourceZoneId === existingZone.id) return; // Dropped on its own zone
        moveElement(sourcePageId, sourceZoneId, selectedPageId, existingZone.id, sourceElementId);
        showNotification('Moved block to existing zone.', 'success');
      } else {
        const newZoneId = addZone(selectedPageId, col, 1, row, 1);
        moveElement(sourcePageId, sourceZoneId, selectedPageId, newZoneId, sourceElementId);
        showNotification(`Moved block to Col ${col}, Row ${row}.`, 'success');
      }
    } else {
      // ADD operation (new element from sidebar)
      const type = e.dataTransfer.getData('blockType') as PrintElement['type'];
      if (!type) return;

      if (existingZone) {
        addElement(selectedPageId, existingZone.id, type);
        selectZone(existingZone.id);
        showNotification(`Added ${type} block to existing zone.`, 'success');
      } else {
        const newZoneId = addZone(selectedPageId, col, 1, row, 1);
        addElement(selectedPageId, newZoneId, type);
        showNotification(`Placed ${type} block at Col ${col}, Row ${row}.`, 'success');
      }
    }
  };

  const handleDropOnZone = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid dropping on cell underlay
    setDragOverCell(null);
    
    const sourceElementId = e.dataTransfer.getData('sourceElementId');
    if (sourceElementId) {
      // MOVE operation
      const sourcePageId = e.dataTransfer.getData('sourcePageId');
      const sourceZoneId = e.dataTransfer.getData('sourceZoneId');
      if (sourceZoneId === zoneId) return; // Dropped on its own zone
      moveElement(sourcePageId, sourceZoneId, selectedPageId, zoneId, sourceElementId);
      showNotification('Moved block to zone.', 'success');
    } else {
      // ADD operation
      const type = e.dataTransfer.getData('blockType') as PrintElement['type'];
      if (!type) return;

      addElement(selectedPageId, zoneId, type);
      selectZone(zoneId);
      showNotification(`Added ${type} block to zone.`, 'success');
    }
  };

  // Snaps element from block library into grid cells (via click)
  const handleAddBlockToGrid = (type: PrintElement['type']) => {
    const activePage = pages.find(p => p.id === selectedPageId);
    if (!activePage) return;

    if (selectedZoneId) {
      // Append element to selected zone
      addElement(selectedPageId, selectedZoneId, type);
      showNotification(`Added ${type} block to selected zone.`, 'success');
    } else if (selectedCell) {
      // Create new zone snapping into selected grid cell
      const newZoneId = addZone(selectedPageId, selectedCell.col, 1, selectedCell.row, 1);
      addElement(selectedPageId, newZoneId, type);
      setSelectedCell(null);
      showNotification(`Placed ${type} block at Col ${selectedCell.col}, Row ${selectedCell.row}.`, 'success');
    } else {
      // Warn: select cell/zone first
      showNotification('Please select a grid cell on the canvas first to position this block, or drag & drop it directly.', 'warning');
    }
  };

  const activePage = pages.find(p => p.id === selectedPageId);
  const selectedZone = activePage?.zones.find(z => z.id === selectedZoneId);
  const selectedElement = selectedZone?.elements.find(el => el.id === selectedElementId);
  const borderStyle = printTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';
  const renderCardContent = (interactive: boolean) => {
    return (
      <>

            {/* Visual Guide overlays */}
            {interactive && !hideGuides && (
              <>
                {/* Safe Margins (0.125" inside trim) */}
                <div style={{ position: 'absolute', inset: `calc(0.125in * ${zoomFactor})`, border: '1px dotted rgba(59, 130, 246, 0.4)', pointerEvents: 'none', zIndex: 100 }} />
                
                {/* Bleed Guideline boundary */}
                <div style={{ position: 'absolute', inset: `calc(0.25in * ${zoomFactor})`, border: '1px dashed rgba(185, 120, 59, 0.3)', pointerEvents: 'none', zIndex: 100 }} />
                
                {/* Tri-Fold dashed lines */}
                {preset === 'letter-landscape' && gridCols === 3 && (
                  <>
                    <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(239, 68, 68, 0.4)', pointerEvents: 'none', zIndex: 100 }} />
                    <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: '1px', borderLeft: '1px dashed rgba(239, 68, 68, 0.4)', pointerEvents: 'none', zIndex: 100 }} />
                  </>
                )}

                {/* Crop Ticks markers */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '10px', borderLeft: '2px solid #666', borderTop: '2px solid #666' }} />
                <div style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', borderRight: '2px solid #666', borderTop: '2px solid #666' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '10px', height: '10px', borderLeft: '2px solid #666', borderBottom: '2px solid #666' }} />
                <div style={{ position: 'absolute', bottom: 0, right: 0, width: '10px', height: '10px', borderRight: '2px solid #666', borderBottom: '2px solid #666' }} />
              </>
            )}

            {/* Grid Snapping Zones Underlay */}
            {interactive && (
              <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                zIndex: 20
              }}
            >
              {/* Loop cells for grid overlay selection */}
              {Array.from({ length: gridRows }).map((_, rIdx) => {
                const row = rIdx + 1;
                return Array.from({ length: gridCols }).map((__, cIdx) => {
                  const col = cIdx + 1;
                  const isCellSelected = selectedCell?.col === col && selectedCell?.row === row;
                  return (
                    <div 
                      key={`${row}-${col}`}
                      onClick={(e) => handleCellClick(col, row, e)}
                      onDragOver={(e) => handleDragOverCell(e, col, row)}
                      onDragLeave={handleDragLeaveCell}
                      onDrop={(e) => handleDropOnCell(e, col, row)}
                      style={{
                        border: '1px dashed rgba(255,255,255,0.03)',
                        background: dragOverCell?.col === col && dragOverCell?.row === row
                          ? 'rgba(185,120,59,0.18)'
                          : isCellSelected 
                            ? 'rgba(185,120,59,0.06)' 
                            : 'transparent',
                        cursor: 'crosshair',
                        transition: 'all 0.1s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseOver={e => { if (!isCellSelected && !(dragOverCell?.col === col && dragOverCell?.row === row)) e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                      onMouseOut={e => { if (!isCellSelected && !(dragOverCell?.col === col && dragOverCell?.row === row)) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {!hideGuides && (
                        <span style={{ fontSize: '9px', opacity: 0.15, pointerEvents: 'none' }}>Col {col}, Row {row}</span>
                      )}
                    </div>
                  );
                });
              })}
            </div>
            )}

            {/* Placed Zones Layer */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`,
                pointerEvents: 'none',
                zIndex: 30
              }}
            >
              {activePage?.zones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                return (
                  <div
                    key={zone.id}
                    onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}
                    onDragOver={interactive ? (e) => e.preventDefault() : undefined}
                    onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}
                    style={{
                      gridColumn: `${zone.columnStart} / span ${zone.columnSpan}`,
                      gridRow: `${zone.rowStart} / span ${zone.rowSpan}`,
                      border: (interactive && isSelected) ? '2px solid #B9783B' : (interactive ? '1px dashed rgba(185,120,59,0.2)' : 'none'),
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      justifyContent: zone.verticalAlign === 'top' ? 'flex-start' : zone.verticalAlign === 'middle' ? 'center' : zone.verticalAlign === 'bottom' ? 'flex-end' : zone.verticalAlign === 'space-between' ? 'space-between' : 'flex-start',
                      pointerEvents: interactive ? 'auto' : 'none',
                      cursor: interactive ? 'pointer' : 'default',
                      backgroundColor: zone.backgroundColor || ((interactive && isSelected) ? 'rgba(185,120,59,0.03)' : 'transparent'),
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    {/* Snapping Zone background custom visuals */}
                    {zone.backgroundImage && (
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url("${zone.backgroundImage}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          zIndex: 0,
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    {zone.backgroundImage && (
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: `rgba(18, 20, 22, ${(zone.backgroundOverlayOpacity ?? 50) / 100})`,
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}
                      />
                    )}

                    {/* Elements loop inside zone */}
                    {zone.elements.length === 0 ? (
                      interactive ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
                          Empty Zone (Click to select cell)
                        </div>
                      ) : null
                    ) : (
                      zone.elements.map(el => {
                        const isElSelected = selectedElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); } : undefined}
                            draggable={interactive}
                            onDragStart={interactive ? (e) => {
                              e.dataTransfer.setData('sourcePageId', selectedPageId);
                              e.dataTransfer.setData('sourceZoneId', zone.id);
                              e.dataTransfer.setData('sourceElementId', el.id);
                              e.dataTransfer.effectAllowed = 'move';
                            } : undefined}
                            style={{
                              position: el.props.fullPageImage ? 'absolute' : 'relative',
                              ...(el.props.fullPageImage ? { inset: 0, zIndex: 1 } : { zIndex: 2 }),
                              outline: (interactive && isElSelected) ? '2px solid #B9783B' : 'none',
                              outlineOffset: '2px',
                              padding: el.props.fullPageImage ? '0px' : (el.props.style?.padding || '0px'),
                              margin: el.props.fullPageImage ? '0px' : (el.props.style?.margin || '0px'),
                              borderRadius: el.props.fullPageImage ? '0px' : (el.props.style?.borderRadius || '0px'),
                              backgroundColor: el.props.fullPageImage ? 'transparent' : (el.props.style?.backgroundColor || 'transparent'),
                              borderWidth: el.props.fullPageImage ? '0px' : (el.props.style?.borderWidth || '0px'),
                              borderColor: el.props.style?.borderColor || '#B9783B',
                              borderStyle: el.props.style?.borderStyle || 'solid',
                              color: el.props.style?.color || 'inherit',
                              fontFamily: el.props.style?.fontFamily || 'inherit',
                              fontSize: el.props.style?.fontSize || 'inherit',
                              fontWeight: el.props.style?.fontWeight || 'inherit',
                              fontStyle: el.props.style?.fontStyle || 'inherit',
                              textAlign: el.props.style?.textAlign as any || 'inherit',
                              cursor: interactive ? 'grab' : 'default',
                              display: 'block'
                            }}
                          >
                            {/* Element Switch */}
                            {el.type === 'text' && (() => {
                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;
                              return (
                                <div 
                                  className="collateral-text-block"
                                  style={{ 
                                    color: el.props.style?.color || 'inherit', 
                                    fontSize: `calc(${el.props.style?.fontSize || '10pt'} * ${fontScale} * var(--zoom-scale))`, 
                                    textAlign: el.props.style?.textAlign || 'left', 
                                    fontWeight: el.props.style?.fontWeight || 'normal', 
                                    fontStyle: el.props.style?.fontStyle || 'normal', 
                                    fontFamily: el.props.style?.fontFamily || 'inherit', 
                                    lineHeight: el.props.style?.lineHeight || '1.4' 
                                  }}
                                  dangerouslySetInnerHTML={{ __html: formatMarkdown(el.props.text) }}
                                />
                              );
                            })()}

                            {el.type === 'image' && (
                              <div 
                                style={{ 
                                  width: el.props.style?.width || '100%', 
                                  height: el.props.style?.height && el.props.style.height !== 'auto' 
                                    ? `calc(${el.props.style.height} * var(--zoom-scale))` 
                                    : 'auto', 
                                  overflow: 'hidden', 
                                  borderRadius: el.props.style?.borderRadius || '4px',
                                  marginLeft: el.props.style?.marginLeft || '0px',
                                  marginRight: el.props.style?.marginRight || '0px'
                                }}
                              >
                                <img src={el.props.src} style={{ width: '100%', height: '100%', objectFit: el.props.style?.objectFit || 'cover' }} alt="" />
                              </div>
                            )}

                            {el.type === 'qr' && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', color: el.props.style?.color || 'inherit', textAlign: el.props.style?.textAlign || 'center' }}>
                                <div style={{ width: `calc(${el.props.size || '1.1in'} * var(--zoom-scale))`, height: `calc(${el.props.size || '1.1in'} * var(--zoom-scale))`, background: el.props.style?.backgroundColor || 'white', padding: el.props.style?.padding || '4px', borderRadius: el.props.style?.borderRadius || '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <QrCode size={36} color={el.props.style?.color || '#121416'} />
                                </div>
                                <span style={{ fontSize: '8px', opacity: 0.6 }}>{el.props.labelText || 'Scan QR to Book'}</span>
                              </div>
                            )}

                            {el.type === 'divider' && (
                              <div style={{ borderTop: `${el.props.thickness || '1px'} ${el.props.style || 'solid'} ${el.props.color || '#B9783B'}`, margin: el.props.margin || '0.5rem 0' }} />
                            )}

                            {el.type === 'dynamic-excursion' && (() => {
                              const adv = adventures.find(a => a.slug === el.props.slug);
                              const title = adv ? adv.title : 'Excursion Profile Card (Select Slug)';
                              const shortDesc = adv ? (adv.shortDescription || adv.description || '') : 'Select an excursion slug from the settings panel on the right.';
                              const priceText = adv ? (adv.basePrice && Number(adv.basePrice) > 0 ? `From $${Number(adv.basePrice).toLocaleString()}` : 'Rates on Request') : '$2,550';
                              const durationText = adv ? (adv.duration || 'Not specified') : '8 Hours';
                              const capacityText = adv ? (adv.maxGuests ? `Up to ${adv.maxGuests} guests` : '') : 'Up to 6 guests';
                              const coverImg = adv ? adv.heroImage : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80';

                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
                                  
                                  {/* Uppercase Gold Tag */}
                                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
                                    EXCLUSIVE ADVENTURE
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid rgba(185,120,59,0.2)', paddingBottom: '0.2rem' }}>
                                    <h4 className="serif-font" style={{ margin: 0, fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.95rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{title}</h4>
                                    {!el.props.condensedLayout && el.props.showPrice !== false && (
                                      <span style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: '#B9783B' }}>{priceText}</span>
                                    )}
                                  </div>

                                  {el.props.condensedLayout ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', marginTop: '0.15rem' }}>
                                      {/* Left Column: Image */}
                                      {el.props.showImage !== false && coverImg && (
                                        <div style={{ width: '50%', flexShrink: 0, overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', position: 'relative' }}>
                                          <img src={coverImg} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                      )}
                                      {/* Right Column: Stack of Price + Spec boxes */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', justifyContent: 'center' }}>
                                        {el.props.showPrice !== false && (
                                          <div style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: '#B9783B', borderBottom: '1px solid rgba(185,120,59,0.1)', paddingBottom: '0.15rem', marginBottom: '0.1rem' }}>
                                            {priceText}
                                          </div>
                                        )}
                                        {el.props.showDuration !== false && (
                                          <div style={{
                                            background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                            borderLeft: '3px solid #B9783B',
                                            borderRadius: '6px',
                                            padding: '0.25rem 0.4rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                          }}>
                                            <Clock size={11} color="#B9783B" style={{ flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontSize: `calc(0.45rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', lineHeight: 1.1 }}>Duration</span>
                                              <span style={{ fontSize: `calc(0.62rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white', lineHeight: 1.1 }}>{durationText}</span>
                                            </div>
                                          </div>
                                        )}
                                        {adv?.maxGuests && (
                                          <div style={{
                                            background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                            border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                            borderLeft: '3px solid #B9783B',
                                            borderRadius: '6px',
                                            padding: '0.25rem 0.4rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                          }}>
                                            <Users size={11} color="#B9783B" style={{ flexShrink: 0 }} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontSize: `calc(0.45rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em', lineHeight: 1.1 }}>Capacity</span>
                                              <span style={{ fontSize: `calc(0.62rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white', lineHeight: 1.1 }}>{capacityText}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {el.props.showImage !== false && coverImg && (
                                        <div style={{ width: '100%', height: `calc(1.1in * var(--zoom-scale))`, overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                          <img src={coverImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                        </div>
                                      )}

                                      {/* 2-Column Metrics Grid */}
                                      {(el.props.showDuration !== false || adv?.maxGuests) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                                          {el.props.showDuration !== false && (
                                            <div style={{
                                              background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                              border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                              borderLeft: '3px solid #B9783B',
                                              borderRadius: '6px',
                                              padding: '0.35rem 0.5rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.4rem',
                                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                            }}>
                                              <Clock size={12} color="#B9783B" style={{ flexShrink: 0 }} />
                                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Duration</span>
                                                <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{durationText}</span>
                                              </div>
                                            </div>
                                          )}
                                          {adv?.maxGuests && (
                                            <div style={{
                                              background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                              border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                              borderLeft: '3px solid #B9783B',
                                              borderRadius: '6px',
                                              padding: '0.35rem 0.5rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.4rem',
                                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                            }}>
                                              <Users size={12} color="#B9783B" style={{ flexShrink: 0 }} />
                                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Capacity</span>
                                                <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{capacityText}</span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {el.props.showDescription !== false && (
                                    <div 
                                      className="markdown-content"
                                      style={{ fontSize: `calc(0.68rem * ${fontScale} * var(--zoom-scale))`, opacity: 0.85, margin: '0.1rem 0 0 0', lineHeight: '1.35', whiteSpace: 'normal' }}
                                      dangerouslySetInnerHTML={{ __html: formatMarkdown(shortDesc) }}
                                    />
                                  )}

                                  {el.props.showItinerary !== false && adv?.itinerary && adv.itinerary.length > 0 && (
                                    <div style={{ marginTop: '0.25rem' }}>
                                      <span style={{ fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.05em', opacity: 0.6, display: 'block', marginBottom: '0.15rem' }}>ITINERARY HIGHLIGHTS</span>
                                      {(() => {
                                        const highlights = adv.itinerary.filter((step: any) => step.isHighlight);
                                        const displaySteps = highlights.length > 0 ? highlights.slice(0, 3) : adv.itinerary.slice(0, 2);
                                        return displaySteps.map((step: any, sIdx: number) => (
                                          <div key={sIdx} style={{ fontSize: `calc(0.6rem * ${fontScale} * var(--zoom-scale))`, display: 'flex', gap: '0.2rem', marginBottom: '0.1rem', alignItems: 'flex-start', lineHeight: '1.2' }}>
                                            <span style={{ color: '#B9783B', fontWeight: 'bold' }}>•</span>
                                            <span style={{ opacity: 0.8 }}>{step.title}</span>
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'dynamic-vessel' && (() => {
                              const v = vessels.find(item => item.slug === el.props.slug);
                              const title = v ? v.title : 'M/Y Whiskey (Select Vessel)';
                              const shortDesc = v ? (v.shortDescription || v.description || '') : 'Select a fleet asset slug from the settings panel on the right.';
                              const coverImg = v ? v.heroImage : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80';

                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
                                  
                                  {/* Uppercase Gold Tag */}
                                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
                                    PREMIUM YACHT
                                  </div>

                                  <h4 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(1.0rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{title}</h4>
                                  
                                  {el.props.showImage !== false && coverImg && (
                                    <div style={{ width: '100%', height: `calc(1.1in * var(--zoom-scale))`, overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                      <img src={coverImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    </div>
                                  )}

                                  {el.props.showDescription !== false && (
                                    <div 
                                      className="markdown-content"
                                      style={{ fontSize: `calc(0.68rem * ${fontScale} * var(--zoom-scale))`, opacity: 0.85, margin: '0', lineHeight: '1.35', whiteSpace: 'normal' }}
                                      dangerouslySetInnerHTML={{ __html: formatMarkdown(shortDesc) }}
                                    />
                                  )}

                                  {/* 2-Column Metrics Grid */}
                                  {el.props.showSpecs !== false && v?.specifications && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                                      {Object.entries(v.specifications).slice(0, 4).map(([key, val]) => (
                                        <div key={key} style={{
                                          background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                          border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                          borderLeft: '3px solid #B9783B',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.5rem',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                        }}>
                                          <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>{key}</span>
                                          <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{String(val)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'dynamic-staff' && (() => {
                              const staff = staffList.find(s => s.slug === el.props.slug);
                              const name = staff ? staff.title : 'Crew Profile Card (Select Staff)';
                              const role = staff ? (staff.role || (staff.isCaptain ? 'Captain' : 'Crew')) : 'Master Captain';
                              const bio = staff ? (staff.shortBio || '') : 'Select a staff member slug from the settings panel on the right.';
                              const avatar = staff ? staff.heroImage : null;

                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div style={{ 
                                  display: 'flex', 
                                  gap: '0.5rem', 
                                  alignItems: 'flex-start', 
                                  color: el.props.style?.color || 'inherit', 
                                  fontFamily: "'Inter', sans-serif",
                                  background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
                                  border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                                  borderRadius: '8px',
                                  padding: '0.5rem',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                                }}>
                                  {el.props.showAvatar !== false && avatar && (
                                    <img 
                                      src={avatar} 
                                      style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #B9783B', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }} 
                                      alt="" 
                                    />
                                  )}
                                  <div style={{ flex: 1 }}>
                                    <h5 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.85rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{name}</h5>
                                    {el.props.showRole !== false && (
                                      <div style={{ display: 'inline-flex', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.25)', borderRadius: '12px', padding: '0.1rem 0.4rem', fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.06em', color: '#B9783B', textTransform: 'uppercase', marginTop: '0.1rem', marginBottom: '0.2rem' }}>
                                        {role}
                                      </div>
                                    )}
                                    {el.props.showBio !== false && bio && (
                                      <div 
                                        className="markdown-content"
                                        style={{ fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))`, opacity: 0.8, lineHeight: '1.3', margin: '0', whiteSpace: 'normal' }}
                                        dangerouslySetInnerHTML={{ __html: formatMarkdown(bio) }}
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {el.type === 'dynamic-contact' && (() => {
                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.35rem',
                                  color: el.props.style?.color || 'inherit',
                                  fontFamily: "'Inter', sans-serif",
                                  padding: '0.5rem',
                                  background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
                                  border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                                  borderRadius: '6px'
                                }}>
                                  {el.props.showPhone !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))` }}>
                                      <Phone size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                                      <span>{businessDetails.phone}</span>
                                    </div>
                                  )}
                                  {el.props.showEmail !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))` }}>
                                      <Mail size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                                      <span>{businessDetails.email}</span>
                                    </div>
                                  )}
                                  {el.props.showAddress !== false && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))` }}>
                                      <MapPin size={10} color="#B9783B" style={{ flexShrink: 0 }} />
                                      <span>{businessDetails.address}</span>
                                    </div>
                                  )}
                                  {el.props.showSocials !== false && (businessDetails as any).instagram && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))` }}>
                                      <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(8px * ${fontScale} * var(--zoom-scale))`, width: '10px', textAlign: 'center' }}>IG</span>
                                      <span>{(businessDetails as any).instagram.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}</span>
                                    </div>
                                  )}
                                  {el.props.showSocials !== false && (businessDetails as any).facebook && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: `calc(0.65rem * ${fontScale} * var(--zoom-scale))` }}>
                                      <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(8px * ${fontScale} * var(--zoom-scale))`, width: '10px', textAlign: 'center' }}>FB</span>
                                      <span>{(businessDetails as any).facebook.replace('https://facebook.com/', '').replace('https://www.facebook.com/', '')}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'hero' && (() => {
                              const fontScale = ({
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0) * 1.5;

                              const opacityVal = el.props.overlayOpacity !== undefined ? el.props.overlayOpacity : 50;
                              const factor = opacityVal / 50; // 1.0 at 50%
                              const topOpacity = printTheme === 'light' 
                                ? Math.min(1.0, factor * 0.85) 
                                : Math.min(1.0, factor * 0.55);
                              const bottomOpacity = printTheme === 'light' 
                                ? Math.min(1.0, factor * 0.96) 
                                : Math.min(1.0, factor * 0.92);
                              const overlayColor = printTheme === 'light' ? '249,248,246' : '26,28,30';
                              const bgImg = el.props.backgroundImage 
                                ? `linear-gradient(rgba(${overlayColor}, ${topOpacity}), rgba(${overlayColor}, ${bottomOpacity})), url("${el.props.backgroundImage}")` 
                                : 'none';

                              return (
                                <div 
                                  className="collateral-glass-panel"
                                  style={{ 
                                    backgroundImage: bgImg,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    padding: el.props.style?.padding || '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: el.props.style?.textAlign || 'center',
                                    color: el.props.style?.color || 'white',
                                    fontFamily: el.props.style?.fontFamily || 'inherit',
                                    backgroundColor: el.props.glassOpacity !== undefined 
                                      ? (printTheme === 'light' ? `rgba(255,255,255,${el.props.glassOpacity / 100})` : `rgba(18,20,22,${el.props.glassOpacity / 100})`)
                                      : (el.props.style?.backgroundColor || 'transparent'),
                                    '--glass-print-opacity': el.props.glassOpacity !== undefined 
                                      ? Math.max(0.88, el.props.glassOpacity / 100).toString()
                                      : '1',
                                    ...(el.props.fullPageImage ? {
                                      position: 'absolute',
                                      inset: 0,
                                      width: '100%',
                                      height: '100%',
                                      borderRadius: '0px',
                                      border: 'none',
                                      boxShadow: 'none',
                                      zIndex: 1
                                    } : {
                                      width: '100%',
                                      borderRadius: el.props.style?.borderRadius || '8px',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                    }),
                                    backdropFilter: `blur(${el.props.glassOpacity !== undefined ? '8px' : '1px'})`
                                  } as any}
                                >
                                  {el.props.logoType && el.props.logoType !== 'none' && (() => {
                                    const logoUrl = el.props.logoType === 'square'
                                      ? (siteSettings?.brand?.logoSquareUrl || contextSettings?.brand?.logoSquareUrl)
                                      : (siteSettings?.brand?.logoRectUrl || contextSettings?.brand?.logoRectUrl);
                                    
                                    if (!logoUrl) return null;
                                    return (
                                      <img 
                                        src={logoUrl} 
                                        style={{ 
                                          height: `calc(${el.props.logoHeight || '40px'} * var(--zoom-scale))`,
                                          width: 'auto',
                                          objectFit: 'contain',
                                          marginBottom: '0.4rem'
                                        }}
                                        alt=""
                                      />
                                    );
                                  })()}

                                  {el.props.eyebrow && (
                                    <span style={{ display: 'inline-flex', background: el.props.eyebrowColor ? `${el.props.eyebrowColor}1a` : 'rgba(185, 120, 59, 0.1)', border: `1px solid ${el.props.eyebrowColor || '#B9783B'}`, borderRadius: '20px', padding: '0.2rem 0.65rem', fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.18em', color: el.props.eyebrowColor || '#B9783B', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                      {el.props.eyebrow}
                                    </span>
                                  )}
                                  <h1 className="brand-title serif-font" style={{ fontFamily: 'inherit', fontSize: `calc(1.5rem * ${fontScale} * var(--zoom-scale))`, margin: '0.2rem 0', letterSpacing: '0.08em', fontWeight: 600, textShadow: '0 2px 8px rgba(0,0,0,0.6)', color: el.props.headlineColor || 'white' }}>{el.props.headline}</h1>
                                  <div style={{ width: '30px', height: '1.5px', background: '#B9783B', margin: '0.35rem 0' }}></div>
                                  <p className="serif-font" style={{ fontFamily: 'inherit', fontSize: `calc(0.8rem * ${fontScale} * var(--zoom-scale))`, fontStyle: 'italic', opacity: 0.95, margin: '0 0 0.2rem 0', textShadow: '0 1px 4px rgba(0,0,0,0.5)', color: el.props.taglineColor || 'inherit' }}>
                                    {el.props.tagline}
                                  </p>
                                  {el.props.shortText && (
                                    <span style={{ fontFamily: 'inherit', fontSize: `calc(0.6rem * ${fontScale} * var(--zoom-scale))`, letterSpacing: '0.12em', opacity: 0.75, textShadow: '0 1px 3px rgba(0,0,0,0.5)', color: el.props.shortTextColor || 'inherit' }}>{el.props.shortText}</span>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'dynamic-location' && (() => {
                              const loc = locations.find(l => l.slug === el.props.slug);
                              const title = loc ? loc.title : 'Destination Card (Select Location)';
                              const shortDesc = loc ? (loc.shortDescription || '') : '';
                              const fullDesc = loc ? (loc.description || '') : 'Select a location slug from the settings panel on the right.';
                              const coverImg = loc ? loc.heroImage : 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80';
                              
                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: el.props.style?.color || 'inherit', fontFamily: "'Inter', sans-serif" }}>
                                  
                                  {/* Uppercase Gold Tag */}
                                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(185, 120, 59, 0.08)', border: '1px solid rgba(185, 120, 59, 0.3)', borderRadius: '20px', padding: '0.15rem 0.5rem', fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, letterSpacing: '0.08em', color: '#B9783B', textTransform: 'uppercase', marginBottom: '0.05rem' }}>
                                    FEATURED DESTINATION
                                  </div>

                                  <h4 className="serif-font" style={{ margin: '0', fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(1.0rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, color: printTheme === 'light' ? '#1E2124' : 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{title}</h4>
                                  
                                  {el.props.showImage !== false && coverImg && (
                                    <div style={{ width: '100%', height: `calc(1.1in * var(--zoom-scale))`, overflow: 'hidden', borderRadius: '6px', border: '1.5px solid rgba(185, 120, 59, 0.15)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                                      <img src={coverImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    </div>
                                  )}

                                  {el.props.showShortDescription !== false && shortDesc && (
                                    <p style={{ fontSize: `calc(0.72rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, opacity: 0.95, margin: '0', lineHeight: '1.35' }}>
                                      {shortDesc}
                                    </p>
                                  )}

                                  {el.props.showDescription !== false && (
                                    <div 
                                      className="markdown-content"
                                      style={{ fontSize: `calc(0.68rem * ${fontScale} * var(--zoom-scale))`, opacity: 0.85, margin: '0', lineHeight: '1.35', whiteSpace: 'normal' }}
                                      dangerouslySetInnerHTML={{ __html: formatMarkdown(fullDesc) }}
                                    />
                                  )}

                                  {/* Metrics Grid */}
                                  {el.props.showSpecs !== false && loc && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.1rem' }}>
                                      {loc.anchorStatus && (
                                        <div style={{
                                          background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                          border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                          borderLeft: '3px solid #B9783B',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.5rem',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                        }}>
                                          <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Anchor/Dock</span>
                                          <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.anchorStatus}</span>
                                        </div>
                                      )}
                                      {loc.bestTime && (
                                        <div style={{
                                          background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                          border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                          borderLeft: '3px solid #B9783B',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.5rem',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                        }}>
                                          <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Best Time</span>
                                          <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.bestTime}</span>
                                        </div>
                                      )}
                                      {loc.suitability && (
                                        <div style={{
                                          background: printTheme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)',
                                          border: `1px solid ${printTheme === 'light' ? 'rgba(185, 120, 59, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                          borderLeft: '3px solid #B9783B',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.5rem',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                                        }}>
                                          <span style={{ fontSize: `calc(0.5rem * ${fontScale} * var(--zoom-scale))`, textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.05em' }}>Suitability</span>
                                          <span style={{ fontSize: `calc(0.7rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 700, color: printTheme === 'light' ? '#1E2124' : 'white' }}>{loc.suitability}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'contact-card' && (() => {
                              const fontScale = {
                                xs: 0.8,
                                s: 0.9,
                                m: 1.0,
                                l: 1.15,
                                xl: 1.3
                              }[el.props.fontSizePreset as 'xs' | 's' | 'm' | 'l' | 'xl' || 'm'] || 1.0;

                              return (
                                <div 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    gap: '0.5rem',
                                    width: '100%',
                                    color: el.props.style?.color || 'inherit',
                                    fontFamily: "'Inter', sans-serif",
                                    background: printTheme === 'light' ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)',
                                    border: `1px solid ${printTheme === 'light' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'}`,
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                                  }}
                                >
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    {el.props.tagline && (
                                      <span className="gold-accent" style={{ fontFamily: el.props.style?.fontFamily || 'inherit', fontSize: `calc(0.8rem * ${fontScale} * var(--zoom-scale))`, fontWeight: 600, display: 'block', borderBottom: '1px solid rgba(185,120,59,0.15)', paddingBottom: '0.1rem' }}>
                                        {el.props.tagline}
                                      </span>
                                    )}
                                    
                                    <div style={{ fontSize: `calc(0.62rem * ${fontScale} * var(--zoom-scale))`, display: 'flex', flexDirection: 'column', gap: '0.25rem', opacity: 0.9, marginTop: '0.1rem' }}>
                                      {el.props.showPhone !== false && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Phone size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                                          <span>{businessDetails.phone}</span>
                                        </div>
                                      )}
                                      {el.props.showEmail !== false && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <Mail size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                                          <span style={{ fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))` }}>{businessDetails.email}</span>
                                        </div>
                                      )}
                                      {el.props.showAddress !== false && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <MapPin size={9} color="#B9783B" style={{ flexShrink: 0 }} />
                                          <span style={{ fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))`, opacity: 0.6 }}>{businessDetails.address}</span>
                                        </div>
                                      )}
                                      {el.props.showSocials !== false && (businessDetails as any).instagram && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(7px * ${fontScale} * var(--zoom-scale))`, width: '9px', textAlign: 'center' }}>IG</span>
                                          <span style={{ fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))` }}>{(businessDetails as any).instagram.replace('https://instagram.com/', '@').replace('https://www.instagram.com/', '@')}</span>
                                        </div>
                                      )}
                                      {el.props.showSocials !== false && (businessDetails as any).facebook && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                          <span style={{ color: '#B9783B', fontWeight: 'bold', fontSize: `calc(7px * ${fontScale} * var(--zoom-scale))`, width: '9px', textAlign: 'center' }}>FB</span>
                                          <span style={{ fontSize: `calc(0.55rem * ${fontScale} * var(--zoom-scale))` }}>{(businessDetails as any).facebook.replace('https://facebook.com/', '').replace('https://www.facebook.com/', '')}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {el.props.showQr !== false && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', flexShrink: 0 }}>
                                      <div style={{ 
                                        width: `calc(0.95in * var(--zoom-scale))`, 
                                        height: `calc(0.95in * var(--zoom-scale))`, 
                                        background: 'white', 
                                        padding: '4px', 
                                        borderRadius: '6px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        border: '1.5px solid #B9783B',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                      }}>
                                        <QrCode size={34} color="#121416" />
                                      </div>
                                      {el.props.ctaText && (
                                        <span style={{ fontSize: `calc(6px * ${fontScale} * var(--zoom-scale))`, opacity: 0.7, fontWeight: 'bold', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                                          {el.props.ctaText}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {el.type === 'logo' && (() => {
                              const logoType = el.props.logoType || 'rect';
                              const logoUrl = logoType === 'square' 
                                ? (siteSettings?.brand?.logoSquareUrl || contextSettings?.brand?.logoSquareUrl)
                                : (siteSettings?.brand?.logoRectUrl || contextSettings?.brand?.logoRectUrl);
                              const fallbackText = logoType === 'square' ? 'Logo Square' : 'Logo Rect';
                              
                              return (
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: el.props.style?.textAlign === 'center' ? 'center' : el.props.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
                                  width: '100%',
                                  padding: el.props.style?.padding || '0px'
                                }}>
                                  {logoUrl ? (
                                    <img 
                                      src={logoUrl} 
                                      style={{ 
                                        width: `calc(${el.props.style?.width || '120px'} * var(--zoom-scale))`,
                                        height: 'auto',
                                        objectFit: 'contain'
                                      }} 
                                      alt="Logo" 
                                    />
                                  ) : (
                                    <div style={{
                                      fontSize: '9px',
                                      opacity: 0.5,
                                      border: '1px dashed #B9783B',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      display: 'inline-block',
                                      color: 'inherit'
                                    }}>
                                      {fallbackText}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
                </>
    );
  };


  // Styles
  const sidebarHeadingStyle = {
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#B9783B',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '0.5rem',
    marginBottom: '1rem'
  };

  const inputStyle = {
    padding: '0.5rem 0.65rem',
    background: '#121416',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.85rem',
    outline: 'none',
    width: '100%'
  };

  const elementBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px',
    padding: '0.6rem 0.85rem',
    color: '#D8C7AF',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    textAlign: 'left' as const,
    transition: 'all 0.15s'
  };

  const renderHeroColorPicker = (label: string, value: string, onChange: (color: string) => void) => {
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
        {label}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
          <button
            onClick={() => onChange('')}
            title="Inherit"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: !value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
              boxShadow: !value ? '0 0 0 2px #B9783B' : 'none',
              cursor: 'pointer',
              padding: 0,
              color: '#D8C7AF',
              fontSize: '8px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            INH
          </button>
          {brandColors.map(color => (
            <button
              key={color.value}
              onClick={() => onChange(color.value)}
              title={color.name}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: color.value,
                border: value === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                boxShadow: value === color.value ? '0 0 0 2px #B9783B' : 'none',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0
              }}
            />
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
            <div style={{ position: 'relative', width: '20px', height: '20px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', cursor: 'pointer', backgroundColor: value || '#ffffff' }}>
              <input
                type="color"
                value={value && value.startsWith('#') ? value : '#ffffff'}
                onChange={e => onChange(e.target.value)}
                style={{
                  position: 'absolute',
                  top: '-5px',
                  left: '-5px',
                  width: '30px',
                  height: '30px',
                  padding: 0,
                  margin: 0,
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0
                }}
              />
            </div>
            <input
              type="text"
              placeholder="Hex"
              value={value || ''}
              onChange={e => onChange(e.target.value)}
              style={{
                width: '60px',
                background: '#121416',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '4px',
                padding: '0.15rem 0.3rem',
                fontSize: '0.7rem',
                color: '#ffffff',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      </label>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#121416', color: '#F4F1EA', fontFamily: "'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .collateral-text-block h1 {
          font-family: inherit;
          font-size: 1.22em;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #B9783B;
          border-bottom: 1px solid rgba(185, 120, 59, 0.15);
          padding-bottom: 0.2rem;
          margin-top: 0.5rem;
          margin-bottom: 0.3rem;
        }
        .collateral-text-block h2, 
        .collateral-text-block h3 {
          font-family: inherit;
          font-size: 1.08em;
          font-weight: 600;
          color: #B9783B;
          border-left: 3px solid #B9783B;
          padding-left: 0.5rem;
          margin-top: 0.4rem;
          margin-bottom: 0.25rem;
        }
        .collateral-text-block strong {
          font-weight: 700;
        }
        .collateral-text-block em {
          font-style: italic;
        }
        .collateral-text-block ul {
          padding-left: 1.2rem;
          margin: 0.4rem 0;
        }
        .collateral-text-block li {
          list-style-type: none;
          position: relative;
          padding-left: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .collateral-text-block li::before {
          content: "•";
          color: #B9783B;
          position: absolute;
          left: 0;
          font-weight: bold;
        }
      `}} />
      
      {/* 1. Left Elements Panel */}
      <aside style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.08)', background: '#1E2124', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#D8C7AF', fontSize: '0.8rem' }}>
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B9783B', fontWeight: 600 }}>
            <Printer size={18} /> Canvas Print Engine
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Snap Instructions */}
          <div>
            <h4 style={sidebarHeadingStyle}>1. Positioning Guides</h4>
            <p style={{ fontSize: '0.72rem', color: '#D8C7AF', opacity: 0.7, lineHeight: '1.45', margin: '0 0 0.75rem 0' }}>
              Select a grid cell on the canvas sheet, then click an element below to snap it. Alternatively, <strong>drag and drop any block</strong> directly onto a cell or zone.
            </p>
            {selectedCell && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(185,120,59,0.08)', border: '1px solid #B9783B', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                <span>Selected Cell: <strong>Col {selectedCell.col}, Row {selectedCell.row}</strong></span>
                <button onClick={() => setSelectedCell(null)} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
              </div>
            )}
            {selectedZoneId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(185,120,59,0.12)', border: '1px solid #B9783B', padding: '0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                <span>Targeting Selected Zone</span>
                <button onClick={() => selectZone(null)} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer' }}>Deselect</button>
              </div>
            )}
          </div>

          {/* Static Blocks */}
          <div>
            <h4 style={sidebarHeadingStyle}>2. Static Elements</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { type: 'text', label: 'Rich Text Paragraph', icon: <FileText size={14} /> },
                { type: 'image', label: 'Photo Image block', icon: <ImageIcon size={14} /> },
                { type: 'hero', label: 'Hero Section Cover', icon: <Sparkles size={14} /> },
                { type: 'qr', label: 'Attribution QR Code', icon: <QrCode size={14} /> },
                { type: 'divider', label: 'Horizontal Line', icon: <LayoutGrid size={14} /> },
                { type: 'logo', label: 'Brand Logo Block', icon: <Anchor size={14} /> }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleAddBlockToGrid(item.type as any)}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('blockType', item.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  style={elementBtnStyle}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(185,120,59,0.06)'; e.currentTarget.style.color = '#B9783B'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#D8C7AF'; }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Content Blocks */}
          <div>
            <h4 style={sidebarHeadingStyle}>3. Dynamic Blocks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { type: 'dynamic-excursion', label: 'Excursion Profile Card', icon: <Compass size={14} /> },
                { type: 'dynamic-vessel', label: 'Vessel Specification', icon: <Anchor size={14} /> },
                { type: 'dynamic-staff', label: 'Crew Profile Card', icon: <Users size={14} /> },
                { type: 'dynamic-location', label: 'Destination Profile Card', icon: <MapPin size={14} /> },
                { type: 'dynamic-contact', label: 'Contact Details list', icon: <Phone size={14} /> },
                { type: 'contact-card', label: 'Attribution Contact Card', icon: <Phone size={14} /> }
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleAddBlockToGrid(item.type as any)}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('blockType', item.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  style={elementBtnStyle}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(185,120,59,0.06)'; e.currentTarget.style.color = '#B9783B'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#D8C7AF'; }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Center Canvas Workspace */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Workspace Header toolbar */}
        <header style={{ height: '64px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#1E2124', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
          
          {/* Design Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#D8C7AF', opacity: 0.6 }}>Design:</span>
            <input 
              type="text" 
              value={designName}
              onChange={e => setDesignName(e.target.value)}
              style={{ ...inputStyle, width: '180px', fontWeight: 600, background: '#121416' }}
            />
            <select
              value={currentDesignId}
              onChange={handleSelectDesignChange}
              style={{ ...inputStyle, width: '160px', background: '#121416', cursor: 'pointer' }}
            >
              <option value="new">+ Create New Design...</option>
              {savedDesigns.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button
              onClick={() => setIsOpenDesignModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#D8C7AF',
                padding: '0.4rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              title="Open a saved design"
            >
              <FolderOpen size={14} style={{ color: '#B9783B' }} />
              Open...
            </button>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#121416', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setZoomFactor(Math.max(0.4, zoomFactor - 0.05))} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ZoomOut size={14} /></button>
            <span style={{ fontSize: '0.72rem', opacity: 0.6, width: '35px', textAlign: 'center' }}>{Math.round(zoomFactor * 100)}%</span>
            <button onClick={() => setZoomFactor(Math.min(1.2, zoomFactor + 0.05))} style={{ background: 'transparent', border: 'none', color: '#D8C7AF', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ZoomIn size={14} /></button>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={handleSaveDesign}
              disabled={saveStatus === 'saving' || saveStatus === 'success'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: saveStatus === 'success' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : '#1E3A4C',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                minWidth: '120px',
                justifyContent: 'center'
              }}
            >
              {saveStatus === 'idle' && <><Save size={15} /> Save Design</>}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'success' && 'Saved!'}
              {saveStatus === 'error' && 'Error'}
            </button>

            <button 
              onClick={() => {
                const params = new URLSearchParams();
                params.set('designId', currentDesignId);
                params.set('repeatEnabled', repeatLayout.enabled ? 'true' : 'false');
                params.set('repeatCols', String(repeatLayout.cols));
                params.set('repeatRows', String(repeatLayout.rows));
                params.set('repeatPaperPreset', repeatLayout.paperPreset);
                params.set('repeatPaperWidth', repeatLayout.paperWidth);
                params.set('repeatPaperHeight', repeatLayout.paperHeight);
                params.set('repeatMargins', repeatLayout.margins);
                params.set('repeatSpacing', repeatLayout.spacing);
                params.set('hideGuides', hideGuides ? 'true' : 'false');
                params.set('printTheme', printTheme);
                window.open(`/admin/collateral/print?${params.toString()}`, '_blank');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#B9783B',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <Printer size={15} /> Open Print PDF
            </button>
          </div>
        </header>

        {/* Canvas Area wrapper */}
        <div style={{ flex: 1, overflow: 'auto', background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative' }}>
          
          {/* Zoom scaling frame */}
          {repeatLayout.enabled ? (
            /* Paper sheet scaling frame */
            <div
              style={{
                width: `calc(${repeatLayout.paperWidth} * ${zoomFactor})`,
                height: `calc(${repeatLayout.paperHeight} * ${zoomFactor})`,
                padding: `calc(${repeatLayout.margins} * ${zoomFactor})`,
                display: 'grid',
                gridTemplateColumns: `repeat(${repeatLayout.cols}, 1fr)`,
                gridTemplateRows: `repeat(${repeatLayout.rows}, 1fr)`,
                gap: `calc(${repeatLayout.spacing} * ${zoomFactor})`,
                background: printTheme === 'light' ? '#FFFFFF' : '#121416',
                color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                margin: 'auto',
                position: 'relative'
              }}
            >
              {Array.from({ length: repeatLayout.cols * repeatLayout.rows }).map((_, idx) => {
                const isInteractive = idx === 0;
                return (
                  <div
                    key={idx}
                    style={{
                      width: `calc(${width} * ${zoomFactor})`,
                      height: `calc(${height} * ${zoomFactor})`,
                      background: printTheme === 'light' ? '#F9F8F6' : '#1A1C1E',
                      color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(185, 120, 59, 0.15)',
                      margin: 'auto',
                      overflow: 'hidden',
                      position: 'relative',
                      '--zoom-scale': zoomFactor
                    } as React.CSSProperties}
                  >
                    {renderCardContent(isInteractive)}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Normal single card Zoom scaling frame */
            <div 
              style={{
                width: `calc(${width} * ${zoomFactor})`,
                height: `calc(${height} * ${zoomFactor})`,
                position: 'relative',
                background: printTheme === 'light' ? '#F9F8F6' : '#1A1C1E',
                color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                transition: 'all 0.15s ease',
                '--zoom-scale': zoomFactor
              } as React.CSSProperties}
            >
              {renderCardContent(true)}
            </div>
          )}
        </div>

        {/* Bottom Pagination & Page Toolbar */}
        <footer style={{ height: '48px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#1E2124', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0 2rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#D8C7AF', opacity: 0.6 }}>Active Page:</span>
          {pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => selectPage(p.id)}
              style={{
                padding: '0.25rem 0.75rem',
                background: selectedPageId === p.id ? '#B9783B' : 'rgba(255,255,255,0.04)',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              {p.id === 'card-front' ? 'Card Front' : p.id === 'card-back' ? 'Card Back' : `Sheet ${idx + 1}`}
            </button>
          ))}
           <button onClick={() => { addPage(); showNotification('New page sheet added.', 'info'); }} style={{ background: 'transparent', border: 'none', color: '#B9783B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600 }}>
            <PlusCircle size={14} /> Add Sheet
          </button>
          {pages.length > 1 && (
            <button onClick={() => { removePage(selectedPageId); showNotification('Page sheet deleted.', 'info'); }} style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, marginLeft: '1rem' }}>
              <Trash2 size={14} /> Delete Page
            </button>
          )}
        </footer>
      </main>

      {/* 3. Right Styles & Configuration Panel */}
      <aside style={{ width: '320px', borderLeft: '1px solid rgba(255,255,255,0.08)', background: '#1E2124', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B9783B', fontWeight: 600 }}>
          <Settings size={18} /> Settings & Styles
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* A. If Element Selected */}
          {selectedElement ? (
            <div>
              <h4 style={sidebarHeadingStyle}>Edit Block Element</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#D8C7AF', opacity: 0.6, fontWeight: 700 }}>Block Type: {selectedElement.type}</span>
                
                {/* Reordering controls inside selected zone */}
                {selectedZone && selectedZone.elements.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                      onClick={() => {
                        reorderElement(selectedPageId, selectedZoneId!, selectedElement.id, 'up');
                        showNotification('Moved block up.', 'success');
                      }}
                      disabled={selectedZone.elements.findIndex(el => el.id === selectedElement.id) === 0}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        padding: '0.4rem',
                        color: '#D8C7AF',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: selectedZone.elements.findIndex(el => el.id === selectedElement.id) === 0 ? 0.4 : 1
                      }}
                    >
                      <ArrowUp size={12} /> Move Up
                    </button>
                    <button
                      onClick={() => {
                        reorderElement(selectedPageId, selectedZoneId!, selectedElement.id, 'down');
                        showNotification('Moved block down.', 'success');
                      }}
                      disabled={selectedZone.elements.findIndex(el => el.id === selectedElement.id) === selectedZone.elements.length - 1}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        padding: '0.4rem',
                        color: '#D8C7AF',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        opacity: selectedZone.elements.findIndex(el => el.id === selectedElement.id) === selectedZone.elements.length - 1 ? 0.4 : 1
                      }}
                    >
                      <ArrowDown size={12} /> Move Down
                    </button>
                  </div>
                )}

                {/* Element-specific inputs */}
                {selectedElement.type === 'text' && (
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    Markdown Text Content
                    <textarea
                      rows={5}
                      value={selectedElement.props.text}
                      onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { text: e.target.value })}
                      style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </label>
                )}

                {selectedElement.type === 'image' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Image Resource URL
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <input
                          type="text"
                          value={selectedElement.props.src}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { src: e.target.value })}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          onClick={() => {
                            setMediaTarget({ zoneId: selectedZoneId!, elementId: selectedElement.id });
                            setIsMediaModalOpen(true);
                          }}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <ImageIcon size={14} />
                        </button>
                      </div>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Width Preset & Alignment
                      <select
                        value={selectedElement.props.widthPreset || 'full'}
                        onChange={e => {
                          const val = e.target.value;
                          const widthPresets = {
                            'full': { width: '100%', marginLeft: '0px', marginRight: '0px' },
                            'half-left': { width: '50%', marginLeft: '0px', marginRight: 'auto' },
                            'half-center': { width: '50%', marginLeft: 'auto', marginRight: 'auto' },
                            'half-right': { width: '50%', marginLeft: 'auto', marginRight: '0px' },
                            'third-left': { width: '33.33%', marginLeft: '0px', marginRight: 'auto' },
                            'third-center': { width: '33.33%', marginLeft: 'auto', marginRight: 'auto' },
                            'third-right': { width: '33.33%', marginLeft: 'auto', marginRight: '0px' }
                          };
                          const preset = (widthPresets as any)[val];
                          updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            widthPreset: val,
                            style: {
                              ...selectedElement.props.style,
                              width: preset.width,
                              marginLeft: preset.marginLeft,
                              marginRight: preset.marginRight
                            }
                          });
                        }}
                        style={inputStyle}
                      >
                        <option value="full">Full Width</option>
                        <option value="half-left">1/2 Width (Left)</option>
                        <option value="half-center">1/2 Width (Center)</option>
                        <option value="half-right">1/2 Width (Right)</option>
                        <option value="third-left">1/3 Width (Left)</option>
                        <option value="third-center">1/3 Width (Center)</option>
                        <option value="third-right">1/3 Width (Right)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Custom Image Height
                      <input
                        type="text"
                        value={selectedElement.props.style?.height || '1.5in'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                          style: { ...selectedElement.props.style, height: e.target.value }
                        })}
                        style={inputStyle}
                        placeholder="e.g. 1.5in, 120px, auto"
                      />
                    </label>
                  </div>
                )}

                {selectedElement.type === 'qr' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Base Scan Redirect URL
                      <input
                        type="text"
                        value={selectedElement.props.url || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { url: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      QR Label Text
                      <input
                        type="text"
                        value={selectedElement.props.labelText || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { labelText: e.target.value })}
                        style={inputStyle}
                        placeholder="e.g. Scan QR to Book, Scan to Connect"
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Referrer Entity Type
                      <select
                        value={selectedElement.props.partnerType || 'none'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { partnerType: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="none">None (Direct Redirect)</option>
                        <option value="company">Broker / Agency (Company)</option>
                        <option value="staff">Captains & Crew (Staff)</option>
                        <option value="location">Ports / Marina Location</option>
                      </select>
                    </label>

                    {selectedElement.props.partnerType && selectedElement.props.partnerType !== 'none' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        Select Referring Partner
                        <select
                          value={selectedElement.props.partnerSlug || ''}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { partnerSlug: e.target.value })}
                          style={inputStyle}
                        >
                          <option value="">-- Select Partner --</option>
                          {selectedElement.props.partnerType === 'company' && companies.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}
                          {selectedElement.props.partnerType === 'staff' && staffList.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                          {selectedElement.props.partnerType === 'location' && locations.map(l => <option key={l.slug} value={l.slug}>{l.title}</option>)}
                        </select>
                      </label>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Attach Promo / Discount Code
                      <select
                        value={selectedElement.props.promoCode || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { promoCode: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">-- No Discount Code --</option>
                        {discountCodes.map(d => (
                          <option key={d.code} value={d.code}>
                            {d.code} ({d.discountType === 'percent' ? `${d.value}%` : `$${d.value}`} off)
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {selectedElement.type === 'dynamic-excursion' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Select Excursion Profile
                      <select
                        value={selectedElement.props.slug}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { slug: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">-- Choose Adventure --</option>
                        {adventures.map(adv => (
                          <option key={adv.slug} value={adv.slug}>{adv.title}</option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Elements</span>
                      {[
                        { id: 'showImage', label: 'Show Cover Image' },
                        { id: 'showDescription', label: 'Show Description Text' },
                        { id: 'showDuration', label: 'Show Duration Spec' },
                        { id: 'showPrice', label: 'Show Price Spec' },
                        { id: 'showItinerary', label: 'Show Itinerary Highlights' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedElement.props.condensedLayout === true}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { condensedLayout: e.target.checked })}
                          style={{ accentColor: '#B9783B' }}
                        />
                        <strong>Condensed Layout (Image Left, Specs Right)</strong>
                      </label>
                    </div>
                  </div>
                )}

                {selectedElement.type === 'dynamic-vessel' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Select Fleet Asset
                      <select
                        value={selectedElement.props.slug}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { slug: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">-- Choose Vessel --</option>
                        {vessels.map(v => (
                          <option key={v.slug} value={v.slug}>{v.title}</option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Elements</span>
                      {[
                        { id: 'showImage', label: 'Show Cover Image' },
                        { id: 'showDescription', label: 'Show Description Text' },
                        { id: 'showSpecs', label: 'Show Vessel Specs' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedElement.type === 'dynamic-staff' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Select Staff Member
                      <select
                        value={selectedElement.props.slug}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { slug: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">-- Choose Staff --</option>
                        {staffList.map(s => (
                          <option key={s.slug} value={s.slug}>{s.title}</option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Elements</span>
                      {[
                        { id: 'showAvatar', label: 'Show Profile Avatar' },
                        { id: 'showRole', label: 'Show Role / Title' },
                        { id: 'showBio', label: 'Show Short Bio' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedElement.type === 'dynamic-contact' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Details</span>
                      {[
                        { id: 'showPhone', label: 'Show Phone Number' },
                        { id: 'showEmail', label: 'Show Email Address' },
                        { id: 'showAddress', label: 'Show Physical Address' },
                        { id: 'showSocials', label: 'Show Social Handles' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedElement.type === 'hero' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Eyebrow text
                      <input
                        type="text"
                        value={selectedElement.props.eyebrow || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { eyebrow: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Headline text
                      <input
                        type="text"
                        value={selectedElement.props.headline || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { headline: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Tagline text
                      <input
                        type="text"
                        value={selectedElement.props.tagline || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { tagline: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Short Subtext / Location
                      <input
                        type="text"
                        value={selectedElement.props.shortText || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { shortText: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Background Image URL
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <input
                          type="text"
                          value={selectedElement.props.backgroundImage || ''}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { backgroundImage: e.target.value })}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <button
                          onClick={() => {
                            setMediaTarget({ zoneId: selectedZoneId!, elementId: selectedElement.id });
                            setIsMediaModalOpen(true);
                          }}
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          <ImageIcon size={14} />
                        </button>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                      <input
                        type="checkbox"
                        checked={!!selectedElement.props.fullPageImage}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { fullPageImage: e.target.checked })}
                        style={{ accentColor: '#B9783B' }}
                      />
                      Full Zone Background Image
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.25rem' }}>
                      Logo Display (in Hero)
                      <select
                        value={selectedElement.props.logoType || 'none'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { logoType: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="none">None</option>
                        <option value="rect">Rectangular Brand Logo</option>
                        <option value="square">Square Avatar / Logo</option>
                      </select>
                    </label>

                    {selectedElement.props.logoType && selectedElement.props.logoType !== 'none' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        Logo Height
                        <input
                          type="text"
                          value={selectedElement.props.logoHeight || '40px'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { logoHeight: e.target.value })}
                          style={inputStyle}
                          placeholder="e.g. 40px, 0.5in"
                        />
                      </label>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Overlay Darkness / Opacity</span>
                        <span style={{ color: '#B9783B' }}>{selectedElement.props.overlayOpacity !== undefined ? selectedElement.props.overlayOpacity : 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedElement.props.overlayOpacity !== undefined ? selectedElement.props.overlayOpacity : 50}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { overlayOpacity: parseInt(e.target.value, 10) })}
                        style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Glass Background Opacity</span>
                        <span style={{ color: '#B9783B' }}>{selectedElement.props.glassOpacity !== undefined ? selectedElement.props.glassOpacity : 20}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={selectedElement.props.glassOpacity !== undefined ? selectedElement.props.glassOpacity : 20}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { glassOpacity: parseInt(e.target.value, 10) })}
                        style={{ accentColor: '#B9783B', cursor: 'pointer' }}
                      />
                    </label>

                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem', marginTop: '0.5rem' }}>Hero Text Colors</div>

                    {renderHeroColorPicker('Eyebrow Color', selectedElement.props.eyebrowColor || '', (color) => {
                      updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { eyebrowColor: color });
                    })}

                    {renderHeroColorPicker('Headline Color', selectedElement.props.headlineColor || '', (color) => {
                      updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { headlineColor: color });
                    })}

                    {renderHeroColorPicker('Tagline Color', selectedElement.props.taglineColor || '', (color) => {
                      updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { taglineColor: color });
                    })}

                    {renderHeroColorPicker('Short Subtext Color', selectedElement.props.shortTextColor || '', (color) => {
                      updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { shortTextColor: color });
                    })}
                  </div>
                )}

                {selectedElement.type === 'dynamic-location' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Select Location
                      <select
                        value={selectedElement.props.slug}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { slug: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="">-- Choose Location --</option>
                        {locations.map(l => (
                          <option key={l.slug} value={l.slug}>{l.title}</option>
                        ))}
                      </select>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Elements</span>
                      {[
                        { id: 'showImage', label: 'Show Cover Image' },
                        { id: 'showShortDescription', label: 'Show Short Description' },
                        { id: 'showDescription', label: 'Show Description Text' },
                        { id: 'showSpecs', label: 'Show Destination Details' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selectedElement.type === 'contact-card' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Tagline text
                      <input
                        type="text"
                        value={selectedElement.props.tagline || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { tagline: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      CTA Text (QR Scan Label)
                      <input
                        type="text"
                        value={selectedElement.props.ctaText || ''}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { ctaText: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Show Elements</span>
                      {[
                        { id: 'showPhone', label: 'Show Phone Number' },
                        { id: 'showEmail', label: 'Show Email Address' },
                        { id: 'showAddress', label: 'Show Physical Address' },
                        { id: 'showSocials', label: 'Show Social Handles' },
                        { id: 'showQr', label: 'Show QR Code' }
                      ].map(el => (
                        <label key={el.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedElement.props[el.id] !== false}
                            onChange={e => {
                              const updates: any = {};
                              updates[el.id] = e.target.checked;
                              updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, updates);
                            }}
                            style={{ accentColor: '#B9783B' }}
                          />
                          {el.label}
                        </label>
                      ))}
                    </div>

                    {selectedElement.props.showQr !== false && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          Base Scan Redirect URL
                          <input
                            type="text"
                            value={selectedElement.props.qrUrl || ''}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { qrUrl: e.target.value })}
                            style={inputStyle}
                          />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          Referrer Entity Type
                          <select
                            value={selectedElement.props.partnerType || 'none'}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { partnerType: e.target.value })}
                            style={inputStyle}
                          >
                            <option value="none">None (Direct Redirect)</option>
                            <option value="company">Broker / Agency (Company)</option>
                            <option value="staff">Captains & Crew (Staff)</option>
                            <option value="location">Ports / Marina Location</option>
                          </select>
                        </label>

                        {selectedElement.props.partnerType && selectedElement.props.partnerType !== 'none' && (
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            Select Referring Partner
                            <select
                              value={selectedElement.props.partnerSlug || ''}
                              onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { partnerSlug: e.target.value })}
                              style={inputStyle}
                            >
                              <option value="">-- Select Partner --</option>
                              {selectedElement.props.partnerType === 'company' && companies.map(c => <option key={c.slug} value={c.slug}>{c.title}</option>)}
                              {selectedElement.props.partnerType === 'staff' && staffList.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}
                              {selectedElement.props.partnerType === 'location' && locations.map(l => <option key={l.slug} value={l.slug}>{l.title}</option>)}
                            </select>
                          </label>
                        )}

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          Campaign UTM Tag
                          <input
                            type="text"
                            value={selectedElement.props.campaign || ''}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { campaign: e.target.value })}
                            style={inputStyle}
                          />
                        </label>

                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          Attach Promo / Discount Code
                          <select
                            value={selectedElement.props.promoCode || ''}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { promoCode: e.target.value })}
                            style={inputStyle}
                          >
                            <option value="">-- No Discount Code --</option>
                            {discountCodes.map(d => (
                              <option key={d.code} value={d.code}>
                                {d.code} ({d.discountType === 'percent' ? `${d.value}%` : `$${d.value}`} off)
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {selectedElement.type === 'divider' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Divider Color
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                        {brandColors.map(color => (
                          <button
                            key={color.value}
                            onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { color: color.value })}
                            title={color.name}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: color.value,
                              border: (selectedElement.props.color || '#B9783B') === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: (selectedElement.props.color || '#B9783B') === color.value ? '0 0 0 2px #B9783B' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'all 0.15s'
                            }}
                          />
                        ))}
                      </div>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Thickness (e.g. 1px, 3px)
                      <input
                        type="text"
                        value={selectedElement.props.thickness || '1px'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { thickness: e.target.value })}
                        style={inputStyle}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Line Style
                      <select
                        value={selectedElement.props.style || 'solid'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { style: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="solid">Solid</option>
                        <option value="dashed">Dashed</option>
                        <option value="dotted">Dotted</option>
                        <option value="double">Double</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Margin (e.g. 0.5rem 0)
                      <input
                        type="text"
                        value={selectedElement.props.margin || '0.5rem 0'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { margin: e.target.value })}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}

                {selectedElement.type === 'logo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Logo Style
                      <select
                        value={selectedElement.props.logoType || 'rect'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, { logoType: e.target.value })}
                        style={inputStyle}
                      >
                        <option value="rect">Rectangular Brand Logo</option>
                        <option value="square">Square Avatar / Logo</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Logo Display Width
                      <input
                        type="text"
                        value={selectedElement.props.style?.width || '120px'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                          style: { ...selectedElement.props.style, width: e.target.value }
                        })}
                        style={inputStyle}
                        placeholder="e.g. 120px, 1.5in"
                      />
                    </label>
                  </div>
                )}

                {/* Common element formatting (shared with website builder) */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#D8C7AF', opacity: 0.6, fontWeight: 700 }}>Block Formatting & Styles</span>

                  {/* Typography Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>Typography</div>
                    
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                      Font Family
                      <select
                        value={selectedElement.props.style?.fontFamily || "'Inter', sans-serif"}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                          style: { ...selectedElement.props.style, fontFamily: e.target.value }
                        })}
                        style={inputStyle}
                      >
                        <option value="'Inter', sans-serif">Sans-Serif (Inter)</option>
                        <option value="'Cormorant Garamond', serif">Serif (Cormorant Garamond)</option>
                      </select>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {['text', 'hero', 'contact-card', 'dynamic-excursion', 'dynamic-vessel', 'dynamic-staff', 'dynamic-contact', 'dynamic-location'].includes(selectedElement.type) && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                          Font Size Scale
                          <select
                            value={selectedElement.props.fontSizePreset || 'm'}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                              fontSizePreset: e.target.value
                            })}
                            style={inputStyle}
                          >
                            <option value="xs">Extra Small (xs)</option>
                            <option value="s">Small (s)</option>
                            <option value="m">Medium (m - Default)</option>
                            <option value="l">Large (l)</option>
                            <option value="xl">Extra Large (xl)</option>
                          </select>
                        </label>
                      )}

                      {selectedElement.type === 'text' && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                          Base Font Size
                          <input
                            type="text"
                            value={selectedElement.props.style?.fontSize || '10pt'}
                            onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                              style: { ...selectedElement.props.style, fontSize: e.target.value }
                            })}
                            style={inputStyle}
                            placeholder="e.g. 10pt"
                          />
                        </label>
                      )}

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Text Alignment
                        <select
                          value={selectedElement.props.style?.textAlign || 'left'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, textAlign: e.target.value }
                          })}
                          style={inputStyle}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                          <option value="justify">Justify</option>
                        </select>
                      </label>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Font Weight
                        <select
                          value={selectedElement.props.style?.fontWeight || 'normal'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, fontWeight: e.target.value }
                          })}
                          style={inputStyle}
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                          <option value="600">Medium</option>
                          <option value="300">Light</option>
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Font Style
                        <select
                          value={selectedElement.props.style?.fontStyle || 'normal'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, fontStyle: e.target.value }
                          })}
                          style={inputStyle}
                        >
                          <option value="normal">Normal</option>
                          <option value="italic">Italic</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Colors Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>Colors & Background</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Text Color
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <button
                            onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                              style: { ...selectedElement.props.style, color: '' }
                            })}
                            title="Inherit"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: !selectedElement.props.style?.color ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: !selectedElement.props.style?.color ? '0 0 0 2px #B9783B' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: '#D8C7AF',
                              fontSize: '8px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            INH
                          </button>
                          {brandColors.map(color => (
                            <button
                              key={color.value}
                              onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                                style: { ...selectedElement.props.style, color: color.value }
                              })}
                              title={color.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: color.value,
                                border: selectedElement.props.style?.color === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: selectedElement.props.style?.color === color.value ? '0 0 0 2px #B9783B' : 'none',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            />
                          ))}
                        </div>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Background Color
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.2rem' }}>
                          <button
                            onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                              style: { ...selectedElement.props.style, backgroundColor: 'transparent' }
                            })}
                            title="Transparent"
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              border: (!selectedElement.props.style?.backgroundColor || selectedElement.props.style?.backgroundColor === 'transparent') ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: (!selectedElement.props.style?.backgroundColor || selectedElement.props.style?.backgroundColor === 'transparent') ? '0 0 0 2px #B9783B' : 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: '#D8C7AF',
                              fontSize: '8px',
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            TRN
                          </button>
                          {brandColors.map(color => (
                            <button
                              key={color.value}
                              onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                                style: { ...selectedElement.props.style, backgroundColor: color.value }
                              })}
                              title={color.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: color.value,
                                border: selectedElement.props.style?.backgroundColor === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                boxShadow: selectedElement.props.style?.backgroundColor === color.value ? '0 0 0 2px #B9783B' : 'none',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            />
                          ))}
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Spacing Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>Layout & Spacing</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Padding
                        <input
                          type="text"
                          value={selectedElement.props.style?.padding || '0px'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, padding: e.target.value }
                          })}
                          style={inputStyle}
                          placeholder="e.g. 10px"
                        />
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Margin
                        <input
                          type="text"
                          value={selectedElement.props.style?.margin || '0px'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, margin: e.target.value }
                          })}
                          style={inputStyle}
                          placeholder="e.g. 5px"
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                      Border Radius
                      <input
                        type="text"
                        value={selectedElement.props.style?.borderRadius || '0px'}
                        onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                          style: { ...selectedElement.props.style, borderRadius: e.target.value }
                        })}
                        style={inputStyle}
                        placeholder="e.g. 4px, 50%"
                      />
                    </label>
                  </div>

                  {/* Border Settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B9783B', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.2rem' }}>Borders</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Border Style
                        <select
                          value={selectedElement.props.style?.borderStyle || 'solid'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, borderStyle: e.target.value }
                          })}
                          style={inputStyle}
                        >
                          <option value="none">None</option>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                          <option value="double">Double</option>
                        </select>
                      </label>

                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                        Border Thickness
                        <input
                          type="text"
                          value={selectedElement.props.style?.borderWidth || '0px'}
                          onChange={e => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, borderWidth: e.target.value }
                          })}
                          style={inputStyle}
                          placeholder="e.g. 1px"
                        />
                      </label>
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                      Border Color
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                        <button
                          onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                            style: { ...selectedElement.props.style, borderColor: 'transparent' }
                          })}
                          title="None"
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            border: (!selectedElement.props.style?.borderColor || selectedElement.props.style?.borderColor === 'transparent') ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: (!selectedElement.props.style?.borderColor || selectedElement.props.style?.borderColor === 'transparent') ? '0 0 0 2px #B9783B' : 'none',
                            cursor: 'pointer',
                            padding: 0,
                            color: '#D8C7AF',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          NON
                        </button>
                        {brandColors.map(color => (
                          <button
                            key={color.value}
                            onClick={() => updateElementProps(selectedPageId, selectedZoneId!, selectedElement.id, {
                              style: { ...selectedElement.props.style, borderColor: color.value }
                            })}
                            title={color.name}
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: color.value,
                              border: selectedElement.props.style?.borderColor === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              boxShadow: selectedElement.props.style?.borderColor === color.value ? '0 0 0 2px #B9783B' : 'none',
                              cursor: 'pointer',
                              padding: 0
                            }}
                          />
                        ))}
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={() => { removeElement(selectedPageId, selectedZoneId!, selectedElement.id); showNotification('Element removed from zone.', 'info'); }}
                    style={{
                      width: '100%',
                      marginTop: '1.5rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#EF4444',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Trash2 size={12} /> Remove Element
                  </button>
                </div>
              </div>
            </div>
          ) : selectedZone ? (
            /* B. If Zone Selected, but no element */
            <div>
              <h4 style={sidebarHeadingStyle}>Zone Grid Positioning</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>
                    Col Start
                    <input
                      type="number"
                      min={1}
                      max={gridCols}
                      value={selectedZone.columnStart}
                      onChange={e => updateZoneGrid(selectedPageId, selectedZone.id, Number(e.target.value), selectedZone.columnSpan, selectedZone.rowStart, selectedZone.rowSpan)}
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ fontSize: '0.75rem' }}>
                    Col Span
                    <input
                      type="number"
                      min={1}
                      max={gridCols - selectedZone.columnStart + 1}
                      value={selectedZone.columnSpan}
                      onChange={e => updateZoneGrid(selectedPageId, selectedZone.id, selectedZone.columnStart, Number(e.target.value), selectedZone.rowStart, selectedZone.rowSpan)}
                      style={inputStyle}
                    />
                  </label>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#D8C7AF', opacity: 0.6, fontWeight: 700 }}>Zone Background & Visuals</span>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                    Background Color
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <button
                        onClick={() => updateZoneProps(selectedPageId, selectedZone.id, { backgroundColor: 'transparent' })}
                        title="Transparent"
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          border: (!selectedZone.backgroundColor || selectedZone.backgroundColor === 'transparent') ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                          boxShadow: (!selectedZone.backgroundColor || selectedZone.backgroundColor === 'transparent') ? '0 0 0 2px #B9783B' : 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: '#D8C7AF',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        TRN
                      </button>
                      {brandColors.map(color => (
                        <button
                          key={color.value}
                          onClick={() => updateZoneProps(selectedPageId, selectedZone.id, { backgroundColor: color.value })}
                          title={color.name}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: color.value,
                            border: selectedZone.backgroundColor === color.value ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: selectedZone.backgroundColor === color.value ? '0 0 0 2px #B9783B' : 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      ))}
                    </div>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                    Background Image URL
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <input
                        type="text"
                        value={selectedZone.backgroundImage || ''}
                        onChange={e => updateZoneProps(selectedPageId, selectedZone.id, { backgroundImage: e.target.value })}
                        style={{ ...inputStyle, flex: 1 }}
                        placeholder="https://..."
                      />
                      <button
                        onClick={() => {
                          setMediaTarget({ zoneId: selectedZone.id, elementId: null });
                          setIsMediaModalOpen(true);
                        }}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        <ImageIcon size={14} />
                      </button>
                    </div>
                  </label>

                  {selectedZone.backgroundImage && (
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      Darkened Overlay Opacity ({selectedZone.backgroundOverlayOpacity ?? 50}%)
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedZone.backgroundOverlayOpacity ?? 50}
                      onChange={e => updateZoneProps(selectedPageId, selectedZone.id, { backgroundOverlayOpacity: Number(e.target.value) })}
                      style={{ accentColor: '#B9783B', cursor: 'pointer', width: '100%' }}
                    />
                  </label>
                )}

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, marginTop: '0.5rem' }}>
                    Vertical Alignment
                    <select
                      value={selectedZone.verticalAlign || 'top'}
                      onChange={e => updateZoneProps(selectedPageId, selectedZone.id, { verticalAlign: e.target.value as any })}
                      style={inputStyle}
                    >
                      <option value="top">Top</option>
                      <option value="middle">Middle (Center)</option>
                      <option value="bottom">Bottom</option>
                      <option value="space-between">Space Between</option>
                    </select>
                  </label>
                </div>

                <button
                  onClick={() => { removeZone(selectedPageId, selectedZone.id); showNotification('Grid zone deleted.', 'info'); }}
                  style={{
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#EF4444',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <Trash2 size={12} /> Delete Grid Zone
                </button>
              </div>
            </div>
          ) : (
            /* C. If Nothing Selected (Global Canvas Configs) */
            <div>
              <h4 style={sidebarHeadingStyle}>Canvas Properties</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Page Preset Dimensions
                  <select
                    value={preset}
                    onChange={e => setPreset(e.target.value as any)}
                    style={inputStyle}
                  >
                    {Object.entries(PRINT_PRESETS).map(([key, val]) => (
                      <option key={key} value={key}>{val.name}</option>
                    ))}
                  </select>
                </label>

                {preset === 'custom' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem' }}>
                      Width
                      <input
                        type="text"
                        value={width}
                        onChange={e => setCustomSize(e.target.value, height)}
                        style={inputStyle}
                      />
                    </label>
                    <label style={{ fontSize: '0.75rem' }}>
                      Height
                      <input
                        type="text"
                        value={height}
                        onChange={e => setCustomSize(width, e.target.value)}
                        style={inputStyle}
                      />
                    </label>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.75rem' }}>
                    Grid Columns
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={gridCols}
                      onChange={e => setGridDimensions(Number(e.target.value), gridRows)}
                      style={inputStyle}
                    />
                  </label>

                  <label style={{ fontSize: '0.75rem' }}>
                    Grid Rows
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={gridRows}
                      onChange={e => setGridDimensions(gridCols, Number(e.target.value))}
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  Print Theme color overrides
                  <select
                    value={printTheme}
                    onChange={e => setPrintTheme(e.target.value as any)}
                    style={inputStyle}
                  >
                    <option value="dark">Prestige Dark (Rich Background)</option>
                    <option value="light">Ink-Saver Light ( Ivory Off-White )</option>
                  </select>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={hideGuides}
                    onChange={e => setHideGuides(e.target.checked)}
                    style={{ accentColor: '#B9783B' }}
                  />
                  Hide Crop Marks & Safety Guides
                </label>

                {/* Repeating multi-up layout configs */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <span style={sidebarHeadingStyle}>Multi-Up Repeating Print Sheet</span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={repeatLayout.enabled}
                        onChange={e => updateRepeatConfig({ enabled: e.target.checked })}
                        style={{ accentColor: '#B9783B' }}
                      />
                      Enable Multi-Up Duplication
                    </label>

                    {repeatLayout.enabled && (
                      <>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                          Printed Paper size preset
                          <select
                            value={repeatLayout.paperPreset}
                            onChange={e => updateRepeatConfig({ paperPreset: e.target.value as any })}
                            style={inputStyle}
                          >
                            <option value="letter">Letter Size (8.5" x 11")</option>
                            <option value="a4">A4 Sheet (210mm x 297mm)</option>
                            <option value="custom">Custom Paper size...</option>
                          </select>
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem' }}>
                            Repeat Columns
                            <input
                              type="number"
                              min={1}
                              value={repeatLayout.cols}
                              onChange={e => updateRepeatConfig({ cols: Number(e.target.value) })}
                              style={inputStyle}
                            />
                          </label>

                          <label style={{ fontSize: '0.75rem' }}>
                            Repeat Rows
                            <input
                              type="number"
                              min={1}
                              value={repeatLayout.rows}
                              onChange={e => updateRepeatConfig({ rows: Number(e.target.value) })}
                              style={inputStyle}
                            />
                          </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.75rem' }}>
                            Page Margins (e.g., 0.3in)
                            <input
                              type="text"
                              value={repeatLayout.margins}
                              onChange={e => updateRepeatConfig({ margins: e.target.value })}
                              style={inputStyle}
                              placeholder="0.3in"
                            />
                          </label>

                          <label style={{ fontSize: '0.75rem' }}>
                            Item Spacing (e.g., 0.1in)
                            <input
                              type="text"
                              value={repeatLayout.spacing}
                              onChange={e => updateRepeatConfig({ spacing: e.target.value })}
                              style={inputStyle}
                              placeholder="0.1in"
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Generate Staff Business Card template options */}
                {preset === 'business-card' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <span style={sidebarHeadingStyle}>Generate Staff Business Card</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        Select Staff Member
                        <select
                          value={selectedTemplateStaffSlug}
                          onChange={e => setSelectedTemplateStaffSlug(e.target.value)}
                          style={inputStyle}
                        >
                          <option value="">-- Select Crew Profile --</option>
                          {staffList.map(s => (
                            <option key={s.slug} value={s.slug}>{s.title}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const staff = staffList.find(s => s.slug === selectedTemplateStaffSlug);
                          if (!staff) {
                            showNotification('Please select a staff member first.', 'warning');
                            return;
                          }

                          const brandColorVal = siteSettings?.brand?.colors?.[0]?.value || '#B9783B';
                          const headingFont = siteSettings?.typography?.headingFontFamily || "'Cormorant Garamond', serif";

                          loadDesignState({
                            preset: 'business-card',
                            width: '3.5in',
                            height: '2in',
                            gridCols: 2,
                            gridRows: 1,
                            pages: [
                              {
                                id: 'card-front',
                                zones: [
                                  {
                                    id: 'front-left',
                                    columnStart: 1,
                                    columnSpan: 1,
                                    rowStart: 1,
                                    rowSpan: 1,
                                    verticalAlign: 'middle',
                                    elements: [
                                      {
                                        id: `avatar-${Date.now()}`,
                                        type: 'image',
                                        props: {
                                          src: staff.heroImage || '/placeholder-avatar.png',
                                          style: {
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            borderWidth: '2px',
                                            borderColor: brandColorVal,
                                            borderStyle: 'solid',
                                            margin: '0 auto 0.25rem auto'
                                          }
                                        }
                                      },
                                      {
                                        id: `name-${Date.now()}`,
                                        type: 'text',
                                        props: {
                                          text: staff.title,
                                          style: {
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            color: '#FFFFFF',
                                            textAlign: 'center',
                                            fontFamily: headingFont
                                          }
                                        }
                                      },
                                      {
                                        id: `role-${Date.now()}`,
                                        type: 'text',
                                        props: {
                                          text: staff.role || (staff.isCaptain ? 'Captain' : 'Crew'),
                                          style: {
                                            fontSize: '6px',
                                            fontWeight: 'bold',
                                            color: brandColorVal,
                                            textAlign: 'center',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em'
                                          }
                                        }
                                      }
                                    ]
                                  },
                                  {
                                    id: 'front-right',
                                    columnStart: 2,
                                    columnSpan: 1,
                                    rowStart: 1,
                                    rowSpan: 1,
                                    verticalAlign: 'middle',
                                    elements: [
                                      {
                                        id: `qr-${Date.now()}`,
                                        type: 'qr',
                                        props: {
                                          size: '0.8in',
                                          url: 'https://www.motoryachtwhiskey.com',
                                          partnerType: 'staff',
                                          partnerSlug: staff.slug,
                                          campaign: 'business_card',
                                          labelText: 'Scan to Book',
                                          style: {
                                            color: '#121416',
                                            backgroundColor: '#FFFFFF',
                                            padding: '4px',
                                            borderRadius: '4px',
                                            margin: '0 auto 0.4rem auto'
                                          }
                                        }
                                      },
                                      {
                                        id: `contact-${Date.now()}`,
                                        type: 'text',
                                        props: {
                                          text: `${staff.phone || businessDetails.phone}\n${staff.email || businessDetails.email}`,
                                          style: {
                                            fontSize: '6px',
                                            color: '#D8C7AF',
                                            textAlign: 'center',
                                            opacity: 0.8,
                                            lineHeight: '1.4'
                                          }
                                        }
                                      }
                                    ]
                                  }
                                ]
                              },
                              {
                                id: 'card-back',
                                zones: [
                                  {
                                    id: 'back-center',
                                    columnStart: 1,
                                    columnSpan: 2,
                                    rowStart: 1,
                                    rowSpan: 1,
                                    verticalAlign: 'middle',
                                    elements: [
                                      {
                                        id: `logo-${Date.now()}`,
                                        type: 'logo',
                                        props: {
                                          logoType: 'rect',
                                          style: {
                                            width: '110px',
                                            textAlign: 'center',
                                            margin: '0 auto 0.4rem auto'
                                          }
                                        }
                                      },
                                      {
                                        id: `tagline-${Date.now()}`,
                                        type: 'text',
                                        props: {
                                          text: 'DESTIN • FLORIDA',
                                          style: {
                                            fontSize: '6px',
                                            color: '#D8C7AF',
                                            textAlign: 'center',
                                            letterSpacing: '0.15em',
                                            opacity: 0.8
                                          }
                                        }
                                      }
                                    ]
                                  }
                                ]
                              }
                            ],
                            repeatLayout: {
                              enabled: true,
                              paperPreset: 'letter',
                              paperWidth: '8.5in',
                              paperHeight: '11in',
                              rows: 5,
                              cols: 2,
                              margins: '0.3in',
                              spacing: '0.15in'
                            },
                            printTheme: 'dark'
                          });

                          showNotification(`Applied card template for ${staff.title}`, 'success');
                        }}
                        style={{
                          background: '#B9783B',
                          border: 'none',
                          color: 'white',
                          padding: '0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          marginTop: '0.25rem',
                          textAlign: 'center'
                        }}
                      >
                        Apply Staff Template
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Open Saved Design modal popup */}
      {isOpenDesignModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#1E2124',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FolderOpen size={18} style={{ color: '#B9783B' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#D8C7AF' }}>Open Saved Design</h3>
              </div>
              <button 
                onClick={() => setIsOpenDesignModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Search Bar */}
            <div style={{ padding: '1rem 1.5rem 0.5rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#121416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '0.4rem 0.75rem' }}>
                <Search size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search saved designs..."
                  value={designSearchQuery}
                  onChange={e => setDesignSearchQuery(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Modal Content - List of designs */}
            <div style={{
              padding: '0.5rem 1.5rem 1.5rem 1.5rem',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {(() => {
                const filtered = savedDesigns.filter(d => d.name.toLowerCase().includes(designSearchQuery.toLowerCase()));
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      No saved designs found.
                    </div>
                  );
                }
                return filtered.map(d => (
                  <div 
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: d.id === currentDesignId ? 'rgba(185, 120, 59, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: d.id === currentDesignId ? '1px solid #B9783B' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: d.id === currentDesignId ? '#B9783B' : 'white' }}>{d.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {(PRINT_PRESETS as any)[d.preset]?.name || d.preset || 'Custom Layout'} • {d.pages?.length || 0} page(s)
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setCurrentDesignId(d.id);
                          setDesignName(d.name);
                          loadDesignState(d);
                          setIsOpenDesignModalOpen(false);
                          showNotification(`Loaded design: "${d.name}".`, 'info');
                          if (typeof window !== 'undefined') {
                            const url = new URL(window.location.href);
                            url.searchParams.set('designId', d.id);
                            window.history.pushState({}, '', url.toString());
                          }
                        }}
                        style={{
                          background: d.id === currentDesignId ? '#B9783B' : '#1E3A4C',
                          color: 'white',
                          border: 'none',
                          padding: '0.4rem 0.85rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {d.id === currentDesignId ? 'Active' : 'Open'}
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete "${d.name}"?`)) {
                            try {
                              await deletePrintDesign(d.id);
                              const updated = await getAllPrintDesigns();
                              setSavedDesigns(updated);
                              showNotification(`Deleted design "${d.name}".`, 'warning');
                              if (d.id === currentDesignId) {
                                if (updated.length > 0) {
                                  const first = updated[0];
                                  setCurrentDesignId(first.id);
                                  setDesignName(first.name);
                                  loadDesignState(first);
                                  if (typeof window !== 'undefined') {
                                    const url = new URL(window.location.href);
                                    url.searchParams.set('designId', first.id);
                                    window.history.pushState({}, '', url.toString());
                                  }
                                } else {
                                  handleCreateNewDesign();
                                  if (typeof window !== 'undefined') {
                                    const url = new URL(window.location.href);
                                    url.searchParams.delete('designId');
                                    window.history.pushState({}, '', url.toString());
                                  }
                                }
                              }
                            } catch (err) {
                              console.error('Failed to delete design:', err);
                              showNotification('Failed to delete print design.', 'error');
                            }
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#EF4444',
                          padding: '0.4rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Delete design"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Asset Library modal popup */}
      <AssetLibraryModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => {
          if (mediaTarget) {
            if (!mediaTarget.elementId) {
              updateZoneProps(selectedPageId, mediaTarget.zoneId, { backgroundImage: url });
            } else {
              const targetZone = activePage?.zones.find(z => z.id === mediaTarget.zoneId);
              const targetEl = targetZone?.elements.find(el => el.id === mediaTarget.elementId);
              if (targetEl?.type === 'hero') {
                updateElementProps(selectedPageId, mediaTarget.zoneId, mediaTarget.elementId, { backgroundImage: url });
              } else {
                updateElementProps(selectedPageId, mediaTarget.zoneId, mediaTarget.elementId, { src: url });
              }
            }
            setMediaTarget(null);
          }
        }}
      />

      {/* Toast notifications portal container */}
      <div 
        style={{ 
          position: 'fixed', 
          bottom: '2rem', 
          right: '2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.75rem', 
          zIndex: 9999,
          pointerEvents: 'none'
        }}
      >
        {toasts.map(t => (
          <div 
            key={t.id} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              background: t.type === 'success' ? '#10B981' : t.type === 'error' ? '#EF4444' : t.type === 'warning' ? '#F59E0B' : '#3B82F6',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              fontSize: '0.82rem',
              fontWeight: 600,
              minWidth: '280px',
              maxWidth: '360px',
              pointerEvents: 'auto',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            {t.type === 'warning' && <AlertTriangle size={15} style={{ flexShrink: 0 }} />}
            {t.type === 'success' && <CheckCircle2 size={15} style={{ flexShrink: 0 }} />}
            {t.type === 'error' && <AlertTriangle size={15} style={{ flexShrink: 0 }} />}
            {t.type === 'info' && <Layers size={15} style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '10px', padding: '0 0 0 0.5rem', fontWeight: 'bold' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
