import os
import re

file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Locate the Zoom scaling frame starting index
start_comment = "{/* Zoom scaling frame */}"
start_idx = content.find(start_comment)
if start_idx == -1:
    print("Could not find start comment!")
    exit(1)

# Find the next "<div" after the start comment, which is the zoom scaling frame opening div
zoom_div_start = content.find("<div", start_idx)
# Find the closing tag corresponding to this opening div.
# We will count brace depth to find the matching closing </div>.
# But since React JSX is XML-like, we can find the matching </div>.
# Let's write a parser to find the matching closing tag of the zoom_div.
# It starts at zoom_div_start. Let's scan forward.
idx = zoom_div_start + 4
depth = 1
while depth > 0 and idx < len(content):
    if content[idx:idx+4] == "<div":
        # Check if it is self-closing or regular
        # Simple check: search for next '>' and see if it ends with '/>'
        close_bracket = content.find(">", idx)
        if close_bracket != -1 and content[close_bracket-1] == "/":
            pass # Self-closing, doesn't increase depth
        else:
            depth += 1
        idx = close_bracket + 1
    elif content[idx:idx+6] == "</div":
        depth -= 1
        idx = content.find(">", idx) + 1
    else:
        idx += 1

zoom_div_end = idx
print(f"Zoom scaling frame div bounds: {zoom_div_start} to {zoom_div_end}")

# Let's get the zoom scaling frame opening tag attributes and styling, and the inner JSX content.
# The opening tag ends at the first '>' after zoom_div_start.
opening_tag_end = content.find(">", zoom_div_start) + 1
opening_tag = content[zoom_div_start:opening_tag_end]
inner_content = content[opening_tag_end:zoom_div_end - 6] # zoom_div_end includes </div>

# Let's modify the inner_content to support the 'interactive' flag!
# 1. Guides:
# Replace:
#             {/* Visual Guide overlays */}
#             {!hideGuides && (
# with:
#             {/* Visual Guide overlays */}
#             {interactive && !hideGuides && (
inner_content = inner_content.replace(
    "{/* Visual Guide overlays */}\n            {!hideGuides && (",
    "{/* Visual Guide overlays */}\n            {interactive && !hideGuides && ("
)

# 2. Grid Snapping Zones Underlay:
# Replace:
#             {/* Grid Snapping Zones Underlay */}
#             <div 
# ... [cells mapping] ...
#             </div>
# with:
#             {/* Grid Snapping Zones Underlay */}
#             {interactive && (
#               <div 
# ...
#               </div>
#             )}
# Let's find the Grid Snapping Zones Underlay block
underlay_start = inner_content.find("{/* Grid Snapping Zones Underlay */}")
if underlay_start != -1:
    underlay_div = inner_content.find("<div", underlay_start)
    # Find matching </div> for this underlay div
    idx = underlay_div + 4
    depth = 1
    while depth > 0 and idx < len(inner_content):
        if inner_content[idx:idx+4] == "<div":
            close_bracket = inner_content.find(">", idx)
            if close_bracket != -1 and inner_content[close_bracket-1] == "/":
                pass
            else:
                depth += 1
            idx = close_bracket + 1
        elif inner_content[idx:idx+6] == "</div":
            depth -= 1
            idx = inner_content.find(">", idx) + 1
        else:
            idx += 1
    underlay_end = idx
    original_underlay = inner_content[underlay_div:underlay_end]
    new_underlay = f"{{interactive && (\n              {original_underlay}\n            )}}"
    inner_content = inner_content[:underlay_div] + new_underlay + inner_content[underlay_end:]

# 3. Placed Zones Layer modification:
# Locate the zones mapping:
# activePage?.zones.map((zone) => { ... })
# We want to replace onClick, onDragOver, onDrop, border, backgroundColor, cursor, pointerEvents, empty zone text.
# Let's replace the properties on the zone container div:
# border: isSelected ? '2px solid #B9783B' : '1px dashed rgba(185,120,59,0.2)',
# and
# backgroundColor: zone.backgroundColor || (isSelected ? 'rgba(185,120,59,0.03)' : 'transparent'),
# and
# pointerEvents: 'auto',
# cursor: 'pointer',
inner_content = inner_content.replace(
    "border: isSelected ? '2px solid #B9783B' : '1px dashed rgba(185,120,59,0.2)',",
    "border: (interactive && isSelected) ? '2px solid #B9783B' : (interactive ? '1px dashed rgba(185,120,59,0.2)' : 'none'),"
)
inner_content = inner_content.replace(
    "backgroundColor: zone.backgroundColor || (isSelected ? 'rgba(185,120,59,0.03)' : 'transparent'),",
    "backgroundColor: zone.backgroundColor || ((interactive && isSelected) ? 'rgba(185,120,59,0.03)' : 'transparent'),"
)
inner_content = inner_content.replace(
    "pointerEvents: 'auto',",
    "pointerEvents: interactive ? 'auto' : 'none',"
)
inner_content = inner_content.replace(
    "cursor: 'pointer',",
    "cursor: interactive ? 'pointer' : 'default',"
)
inner_content = inner_content.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}"
)
inner_content = inner_content.replace(
    "onDragOver={(e) => e.preventDefault()}",
    "onDragOver={interactive ? (e) => e.preventDefault() : undefined}"
)
inner_content = inner_content.replace(
    "onDrop={(e) => handleDropOnZone(e, zone.id)}",
    "onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}"
)

# 4. Empty Zone placeholder modification:
# Replace:
#                     {zone.elements.length === 0 ? (
#                       <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
#                         Empty Zone (Click to select cell)
#                       </div>
#                     ) : (
# with conditional on interactive:
inner_content = inner_content.replace(
    """                    {zone.elements.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
                        Empty Zone (Click to select cell)
                      </div>
                    ) : (""",
    """                    {zone.elements.length === 0 ? (
                      interactive ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
                          Empty Zone (Click to select cell)
                        </div>
                      ) : null
                    ) : ("""
)

# 5. Element container click/drag/drop:
# onClick={(e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); }}
# draggable={true}
# onDragStart={...}
# outline: isElSelected ? '2px solid #B9783B' : 'none',
# cursor: 'grab',
inner_content = inner_content.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); } : undefined}"
)
inner_content = inner_content.replace(
    "draggable={true}",
    "draggable={interactive}"
)
inner_content = inner_content.replace(
    """                            onDragStart={(e) => {
                              e.dataTransfer.setData('sourcePageId', selectedPageId);
                              e.dataTransfer.setData('sourceZoneId', zone.id);
                              e.dataTransfer.setData('sourceElementId', el.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}""",
    """                            onDragStart={interactive ? (e) => {
                              e.dataTransfer.setData('sourcePageId', selectedPageId);
                              e.dataTransfer.setData('sourceZoneId', zone.id);
                              e.dataTransfer.setData('sourceElementId', el.id);
                              e.dataTransfer.effectAllowed = 'move';
                            } : undefined}"""
)
inner_content = inner_content.replace(
    "outline: isElSelected ? '2px solid #B9783B' : 'none',",
    "outline: (interactive && isElSelected) ? '2px solid #B9783B' : 'none',"
)
inner_content = inner_content.replace(
    "cursor: 'grab',",
    "cursor: interactive ? 'grab' : 'default',"
)

# Build the new zoom scaling frame markup with repeatLayout support
new_style = """            style={{
              width: repeatLayout.enabled ? `calc(${repeatLayout.paperWidth} * ${zoomFactor})` : `calc(${width} * ${zoomFactor})`,
              height: repeatLayout.enabled ? `calc(${repeatLayout.paperHeight} * ${zoomFactor})` : `calc(${height} * ${zoomFactor})`,
              position: 'relative',
              background: repeatLayout.enabled ? (printTheme === 'light' ? '#EAE8E4' : '#2c2e30') : (printTheme === 'light' ? '#F9F8F6' : '#1A1C1E'),
              color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              transition: 'all 0.15s ease',
              padding: repeatLayout.enabled ? `calc(${repeatLayout.margins} * ${zoomFactor})` : '0',
              boxSizing: 'border-box',
              // Dynamic CSS custom variables for zoom calculations
              '--zoom-scale': zoomFactor
            } as React.CSSProperties}"""

new_frame_content = f"""<div 
{new_style}
          >
            {{(() => {{
              const renderCardContent = (interactive: boolean) => {{
                return (
                  <>
                    {inner_content}
                  </>
                );
              }};

              return repeatLayout.enabled ? (
                <div
                  style={{{{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${{repeatLayout.cols}}, 1fr)`,
                    gridTemplateRows: `repeat(${{repeatLayout.rows}}, 1fr)`,
                    gap: `calc(${{repeatLayout.spacing}} * ${{zoomFactor}})`,
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                    alignItems: 'center',
                    justifyItems: 'center'
                  }}}}
                >
                  {{Array.from({{ length: repeatLayout.cols * repeatLayout.rows }}).map((_, rIdx) => {{
                    const interactive = rIdx === 0;
                    return (
                      <div
                        key={{rIdx}}
                        style={{{{
                          width: `calc(${{width}} * ${{zoomFactor}})`,
                          height: `calc(${{height}} * ${{zoomFactor}})`,
                          position: 'relative',
                          background: printTheme === 'light' ? '#F9F8F6' : '#1A1C1E',
                          color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
                          border: '1px dotted rgba(185, 120, 59, 0.3)',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
                          overflow: 'hidden',
                          margin: 'auto'
                        }}}}
                      >
                        {{renderCardContent(interactive)}}
                      </div>
                    );
                  }})}}
                </div>
              ) : (
                renderCardContent(true)
              );
            }})()}}
          </div>"""

# Replace in content
new_content = content[:zoom_div_start] + new_frame_content + content[zoom_div_end:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESS: page.tsx updated successfully!")
