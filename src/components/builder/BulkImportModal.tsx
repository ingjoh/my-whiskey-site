'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X as CloseIcon, Download, FileSpreadsheet, Check, Eye } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: any[], rows: any[]) => void;
  initialText?: string;
}

export default function BulkImportModal({ isOpen, onClose, onImport, initialText }: BulkImportModalProps) {
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    if (isOpen) {
      setText(initialText || '');
    }
  }, [isOpen, initialText]);

  const parsedData = useMemo(() => {
    if (!text.trim()) return { items: [], rows: [] };
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return { items: [], rows: [] };
    
    // Detect delimiter
    const firstLine = lines[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = tabCount >= commaCount ? '\t' : ',';
    
    // Custom split function for commas that handles basic quoting (CSV)
    const splitLine = (line: string) => {
      if (delimiter === '\t') return line.split('\t').map(c => c.trim());
      // For CSV, we split by comma but respect quotes
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (!matches) return line.split(',').map(c => c.trim());
      return matches.map(m => m.replace(/^"|"$/g, '').trim());
    };

    const headerRow = splitLine(lines[0]);
    
    // Group columns
    const entitiesMap = new Map();
    let currentEntity: any = null;
    for (let i = 1; i < headerRow.length; i++) {
      const h = headerRow[i];
      if (!h) continue;
      const lowerH = h.toLowerCase();
      if (lowerH === 'lucide icon' && i === 1) continue;
      
      let entityName = h;
      let type = 'direct';
      if (lowerH.endsWith(' support')) { entityName = h.substring(0, h.length - 8).trim(); type = 'support'; }
      else if (lowerH.endsWith(' icon')) { entityName = h.substring(0, h.length - 5).trim(); type = 'icon'; }
      else if (lowerH.endsWith(' notes')) { entityName = h.substring(0, h.length - 6).trim(); type = 'notes'; }
      
      const isSameEntity = currentEntity && (currentEntity.name.endsWith(entityName) || entityName.endsWith(currentEntity.name));

      if (currentEntity && isSameEntity && (type === 'icon' || type === 'notes')) {
        if (type === 'icon') currentEntity.iconIdx = i;
        if (type === 'notes') currentEntity.notesIdx = i;
      } else {
        currentEntity = { name: entityName, supportIdx: type === 'support' ? i : -1, iconIdx: type === 'icon' ? i : -1, notesIdx: type === 'notes' ? i : -1, directIdx: type === 'direct' ? i : -1 };
        entitiesMap.set(currentEntity.name, currentEntity);
      }
    }
    
    const items = Array.from(entitiesMap.values()).map(e => ({ name: e.name, showIcon: true, showText: true }));
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]);
      const featureName = cols[0]?.trim() || `Row ${i}`;
      let featureIcon = '';
      if (headerRow[1]?.toLowerCase() === 'lucide icon') {
         const rawIcon = cols[1]?.trim() || '';
         if (rawIcon) featureIcon = rawIcon.split('-').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
      }
      
      const values = Array.from(entitiesMap.values()).map(ent => {
        let icon = '';
        let cellText = '';
        
        const resolveSupport = (v: string) => {
          const lowerV = v.toLowerCase();
          if (lowerV === 'fully supported' || lowerV === 'yes' || lowerV === 'included' || lowerV === 'true' || v === '✓') return 'CircleCheck';
          else if (lowerV === 'strongly supported' || lowerV === 'strongly supported / core advantage' || lowerV === 'core advantage') return 'BadgeCheck';
          else if (lowerV === 'partially supported') return 'CircleDot';
          else if (lowerV === 'limited support') return 'CircleMinus';
          else if (lowerV === 'weather/conditions dependent' || lowerV === 'weather dependent') return 'CloudSun';
          else if (lowerV === 'optional/add-on or varies' || lowerV === 'optional' || lowerV === 'varies' || lowerV === 'add-on') return 'CirclePlus';
          else if (lowerV === 'not supported' || lowerV === 'no' || lowerV === 'not included' || lowerV === 'false' || v === '✗') return 'CircleX';
          return '';
        };
        
        if (ent.directIdx !== -1) {
          cellText = cols[ent.directIdx]?.trim() || '';
          icon = resolveSupport(cellText);
        }
        if (ent.supportIdx !== -1) {
          const v = cols[ent.supportIdx]?.trim() || '';
          icon = resolveSupport(v);
        }
        if (ent.iconIdx !== -1) {
          const v = cols[ent.iconIdx]?.trim() || '';
          if (v) icon = v.split('-').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
        }
        if (ent.notesIdx !== -1) {
          cellText = cols[ent.notesIdx]?.trim() || '';
        }
        
        return { text: cellText, icon };
      });
      
      rows.push({ feature: featureName, featureIcon, values });
    }
    
    return { items, rows };
  }, [text]);

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: '2rem', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--color-surface)', width: '100%', maxWidth: '1400px', maxHeight: '90vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--color-border)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileSpreadsheet size={24} color="var(--color-primary)" />
            Bulk Import Data
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            <CloseIcon size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Instructions */}
          <div style={{ background: 'rgba(var(--color-primary-rgb), 0.05)', border: '1px solid rgba(var(--color-primary-rgb), 0.2)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-primary)' }}>How to format your data:</h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--color-muted)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <li>The first column must be the <strong>Feature Name</strong> (e.g., "Best For", "Capacity").</li>
              <li>Optionally, include a column named exactly <strong>Lucide Icon</strong> to assign an icon to the feature.</li>
              <li>Group comparison items by using the exact suffixes: <strong>[Name] Support</strong>, <strong>[Name] Icon</strong>, and <strong>[Name] Notes</strong>.</li>
              <li>For example, name your columns: <em>Pontoon Support, Pontoon Icon, Pontoon Notes</em>. The importer will automatically merge them into a single "Pontoon" item!</li>
            </ul>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button onClick={() => {
                const template = "Feature\tLucide Icon\tPontoon Support\tPontoon Icon\tPontoon Notes\tM/Y Whiskey Support\tM/Y Whiskey Icon\tM/Y Whiskey Notes\nBest For\tUsers\t\t\tSimple, casual Crab Island sandbar days...\t\t\tPrivate coastal adventures...\nExperience Style\tSparkles\t\t\tFun, practical, DIY...\t\t\tPremium private...\nComfort Level\tSofa\t\t\tOpen-air bench seating...\t\t\tPlush seating, climate-controlled...\nRange & Destinations\tMap\t\t\tBest for Crab Island...\t\t\tDestin Harbor, Gulf, Shell Island...\nGulf Capability\tWaves\t\t\tGenerally not intended for open Gulf...\t\t\tBuilt for open water...\nHosted Experience\tConciergeBell\t\t\tTypically self-directed...\t\t\tIncludes professional captain & crew...\nWeather Protection\tCloudSun\t\t\tLimited shade and shelter...\t\t\tFully enclosed salon...";
                const blob = new Blob([template], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'whiskey-comparison-template.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-foreground)', cursor: 'pointer', fontSize: '0.875rem' }}>
                <Download size={16} />
                Download CSV Template
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center' }}>
                Or copy from Google Sheets / Excel
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
            {/* Paste Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Paste your data here:</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste tab-separated or comma-separated values from your spreadsheet here..."
                style={{ 
                  width: '100%', 
                  minHeight: '250px', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--color-border)', 
                  background: 'var(--color-background)', 
                  color: 'var(--color-foreground)', 
                  fontFamily: 'monospace', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  whiteSpace: 'pre'
                }}
              />
            </div>

            {/* Preview Area */}
            {text.trim() && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={18} color="var(--color-primary)" />
                  Data Preview ({parsedData.items.length} items, {parsedData.rows.length} rows):
                </label>
                <div style={{ 
                  width: '100%', 
                  background: 'var(--color-background)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '1rem', 
                  overflow: 'auto',
                  minHeight: '250px'
                }}>
                  {parsedData.items.length > 0 && parsedData.rows.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid var(--color-border)', color: 'var(--color-muted)' }}>Feature</th>
                          {parsedData.items.map((item, i) => (
                            <th key={i} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid var(--color-border)' }}>{item.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {row.featureIcon && (LucideIcons as any)[row.featureIcon] && React.createElement((LucideIcons as any)[row.featureIcon], { size: 16, color: 'var(--color-primary)' })}
                                {row.feature}
                              </div>
                            </td>
                            {parsedData.items.map((_, i) => {
                              const cell = row.values?.[i] || { text: '', icon: '' };
                              const IconComp = cell.icon ? (LucideIcons as any)[cell.icon] : null;
                              return (
                                <td key={i} style={{ padding: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-muted)' }}>
                                    {IconComp && <IconComp size={16} color="var(--color-primary)" />}
                                    <span>{cell.text}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                      Data could not be parsed. Check your format.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', padding: '1.5rem', borderTop: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
          <button 
            onClick={onClose}
            style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-foreground)', borderRadius: 'var(--radius-sm)', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-surface)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              if (parsedData.items.length > 0 && parsedData.rows.length > 0) {
                onImport(parsedData.items, parsedData.rows);
                setText('');
                onClose();
              }
            }}
            disabled={parsedData.items.length === 0 || parsedData.rows.length === 0}
            style={{ 
              padding: '0.75rem 1.5rem', 
              background: 'var(--color-primary)', 
              border: 'none', 
              color: '#fff', 
              borderRadius: 'var(--radius-sm)', 
              fontWeight: 600, 
              cursor: (parsedData.items.length > 0 && parsedData.rows.length > 0) ? 'pointer' : 'not-allowed', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              opacity: (parsedData.items.length > 0 && parsedData.rows.length > 0) ? 1 : 0.5, 
              transition: 'all 0.2s' 
            }}
          >
            <Check size={18} />
            Import & Replace Table
          </button>
        </div>

      </div>
    </div>
  );
}
