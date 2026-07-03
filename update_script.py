import sys

# 1. Update NewBlocks.tsx
target1 = r'c:\Users\ingem\MY Whiskey - Site\src\components\builder\NewBlocks.tsx'
with open(target1, 'r', encoding='utf-8') as f:
    content1 = f.read()

search1 = '''              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {rows.map((row: any, rIndex: number) => (
                  <div key={rIndex} style={{ display: 'grid', gridTemplateColumns: \minmax(200px, 1.5fr) repeat(\, 1fr)\, gap: '1rem', padding: '1rem 0', borderBottom: rIndex < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontWeight: 500 }}>{row.feature}</div>
                    {items.map((item: any, i: number) => {'''

replace1 = '''              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {rows.map((row: any, rIndex: number) => {
                  const FeatureIconComp = row.featureIcon ? (Icons as any)[row.featureIcon] : null;
                  return (
                  <div key={rIndex} style={{ display: 'grid', gridTemplateColumns: \minmax(200px, 1.5fr) repeat(\, 1fr)\, gap: '1rem', padding: '1rem 0', borderBottom: rIndex < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems: 'center' }}>
                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {FeatureIconComp && <FeatureIconComp size={20} color="var(--color-primary)" />}
                      {row.feature}
                    </div>
                    {items.map((item: any, i: number) => {'''

if search1 in content1:
    with open(target1, 'w', encoding='utf-8') as f:
        f.write(content1.replace(search1, replace1))
    print('NewBlocks updated')
else:
    print('Search failed in NewBlocks')

# 2. Update BuilderRightPanel.tsx
target2 = r'c:\Users\ingem\MY Whiskey - Site\src\components\builder\BuilderRightPanel.tsx'
with open(target2, 'r', encoding='utf-8') as f:
    content2 = f.read()

search2 = '''                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (!text) return;
                          const lines = text.split('\\n').filter((line: string) => line.trim());
                          if (lines.length < 2) return;
                          const headerRow = lines[0].split('\\t');
                          const newItems = headerRow.slice(1).map((name: string) => ({ name: name.trim(), showIcon: true, showText: true }));
                          const newRows = [];
                          for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split('\\t');
                            const featureName = cols[0]?.trim() || \Row \\;
                            const values = cols.slice(1).map((val: string) => {
                              const v = val.trim();
                              const lowerV = v.toLowerCase();
                              let icon = '';
                              if (lowerV === 'fully supported' || lowerV === 'yes' || lowerV === 'included' || lowerV === 'true' || v === '?') icon = 'CircleCheck';
                              else if (lowerV === 'strongly supported' || lowerV === 'strongly supported / core advantage' || lowerV === 'core advantage') icon = 'BadgeCheck';
                              else if (lowerV === 'partially supported') icon = 'CircleDot';
                              else if (lowerV === 'limited support') icon = 'CircleMinus';
                              else if (lowerV === 'weather/conditions dependent' || lowerV === 'weather dependent') icon = 'CloudSun';
                              else if (lowerV === 'optional/add-on or varies' || lowerV === 'optional' || lowerV === 'varies' || lowerV === 'add-on') icon = 'CirclePlus';
                              else if (lowerV === 'not supported' || lowerV === 'no' || lowerV === 'not included' || lowerV === 'false' || v === '?') icon = 'CircleX';
                              return { text: v, icon };
                            });
                            newRows.push({ feature: featureName, values });
                          }
                          updateNodeProps(selectedNodeId, { items: newItems, rows: newRows });
                        }}'''

replace2 = '''                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text');
                          if (!text) return;
                          const lines = text.split('\\n').filter((line: string) => line.trim());
                          if (lines.length < 2) return;
                          const headerRow = lines[0].split('\\t').map((h: string) => h.trim());
                          
                          // Group columns by entity
                          const entitiesMap = new Map();
                          let currentEntity: any = null;
                          for (let i = 1; i < headerRow.length; i++) {
                            const h = headerRow[i];
                            const lowerH = h.toLowerCase();
                            if (lowerH === 'lucide icon' && i === 1) continue;
                            
                            let entityName = h;
                            let type = 'direct';
                            if (lowerH.endsWith(' support')) { entityName = h.substring(0, h.length - 8).trim(); type = 'support'; }
                            else if (lowerH.endsWith(' icon')) { entityName = h.substring(0, h.length - 5).trim(); type = 'icon'; }
                            else if (lowerH.endsWith(' notes')) { entityName = h.substring(0, h.length - 6).trim(); type = 'notes'; }
                            
                            if (currentEntity && (currentEntity.name.endsWith(entityName) || entityName.endsWith(currentEntity.name) || type !== 'support')) {
                              if (type === 'icon') currentEntity.iconIdx = i;
                              if (type === 'notes') currentEntity.notesIdx = i;
                              if (type === 'direct' && currentEntity.directIdx === -1) currentEntity.directIdx = i;
                            } else {
                              currentEntity = { name: entityName, supportIdx: type === 'support' ? i : -1, iconIdx: type === 'icon' ? i : -1, notesIdx: type === 'notes' ? i : -1, directIdx: type === 'direct' ? i : -1 };
                              entitiesMap.set(currentEntity.name, currentEntity);
                            }
                          }
                          
                          const newItems = Array.from(entitiesMap.values()).map(e => ({ name: e.name, showIcon: true, showText: true }));
                          const newRows = [];
                          for (let i = 1; i < lines.length; i++) {
                            const cols = lines[i].split('\\t');
                            const featureName = cols[0]?.trim() || \Row \\;
                            
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
                                if (lowerV === 'fully supported' || lowerV === 'yes' || lowerV === 'included' || lowerV === 'true' || v === '?') return 'CircleCheck';
                                else if (lowerV === 'strongly supported' || lowerV === 'strongly supported / core advantage' || lowerV === 'core advantage') return 'BadgeCheck';
                                else if (lowerV === 'partially supported') return 'CircleDot';
                                else if (lowerV === 'limited support') return 'CircleMinus';
                                else if (lowerV === 'weather/conditions dependent' || lowerV === 'weather dependent') return 'CloudSun';
                                else if (lowerV === 'optional/add-on or varies' || lowerV === 'optional' || lowerV === 'varies' || lowerV === 'add-on') return 'CirclePlus';
                                else if (lowerV === 'not supported' || lowerV === 'no' || lowerV === 'not included' || lowerV === 'false' || v === '?') return 'CircleX';
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
                            newRows.push({ feature: featureName, featureIcon, values });
                          }
                          updateNodeProps(selectedNodeId, { items: newItems, rows: newRows });
                        }}'''

if search2 in content2:
    with open(target2, 'w', encoding='utf-8') as f:
        f.write(content2.replace(search2, replace2))
    print('BuilderRightPanel updated (parser)')
else:
    print('Search failed in BuilderRightPanel')
