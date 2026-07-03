import os
import re

original_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"
temp_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx.temp"

with open(original_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Locate start and end of zoom scaling frame content
zoom_comment = "{/* Zoom scaling frame */}"
zoom_start = content.find(zoom_comment)
if zoom_start == -1:
    print("Error: Zoom scaling frame comment not found")
    exit(1)

# The zoom scaling frame starts with the div styling. Let's find '<div' following zoom_comment
zoom_div_start = content.find("<div", zoom_start)
if zoom_div_start == -1:
    print("Error: zoom div start not found")
    exit(1)

# Now, let's find the closing tag. The closing tag is just before the Bottom Pagination comment
bottom_comment = "{/* Bottom Pagination & Page Toolbar */}"
bottom_idx = content.find(bottom_comment)
if bottom_idx == -1:
    print("Error: Bottom pagination comment not found")
    exit(1)

# The closing tag of the zoom scaling frame is the </div> just before the canvas area closing </div>
# In the file, it looks like:
#             </div>
#           </div>
#         </div>
# 
#         {/* Bottom Pagination & Page Toolbar */}
# We need to find the correct </div> matching zoom_div_start.
# Since we know the structure is:
#       <div style={/* canvas wrapper */}>
#         {/* Zoom scaling frame */}
#         <div style={/* zoom style */}>
#           ... inner content ...
#         </div>
#       </div>
# So the closing tags are:
#         </div>  <-- closes zoom scaling frame
#       </div>    <-- closes canvas area wrapper
# So we need to find the second to last </div> before bottom_idx.
# Let's count back.
idx = bottom_idx
div_indices = []
while True:
    idx = content.rfind("</div>", 0, idx)
    if idx == -1 or idx < zoom_div_start:
        break
    div_indices.append(idx)
    if len(div_indices) == 3:
        break

if len(div_indices) < 2:
    print("Error: Could not find zoom frame closing div")
    exit(1)

# div_indices[0] is the 3rd last (which closes placed zones layer container or active page loop)
# div_indices[1] is the 2nd last (which closes zoom scaling frame)
# div_indices[2] is the 3rd last from bottom_idx (which closes canvas area wrapper)
# Wait, let's look at div_indices. The search was rfind from bottom_idx.
# So div_indices[0] is the first </div> going backwards from bottom_idx. That is the canvas area wrapper closing </div>.
# div_indices[1] is the next </div> going backwards. That is the Zoom scaling frame closing </div>.
# div_indices[2] is the next </div> going backwards. That is the Placed Zones Layer closing </div>.
# Let's verify this.
zoom_div_end = div_indices[1] + len("</div>")

print(f"Zoom div start: {zoom_div_start}")
print(f"Zoom div end: {zoom_div_end}")

# Extract inner content of the zoom scaling frame
# The inner content is between the opening <div> tag of the zoom frame and its closing </div>
# The opening <div> tag ends at the first '>' after zoom_div_start
zoom_div_opening_end = content.find(">", zoom_div_start) + 1
inner_content = content[zoom_div_opening_end:div_indices[1]]

print(f"Inner content length: {len(inner_content)} characters")

# 2. Make inner content conditional on `interactive`
inner_restored = inner_content

# Safe guide overlays:
inner_restored = inner_restored.replace(
    "{/* Visual Guide overlays */}\n            {!hideGuides && (",
    "{/* Visual Guide overlays */}\n            {interactive && !hideGuides && ("
)
inner_restored = inner_restored.replace(
    "{/* Visual Guide overlays */}\r\n            {!hideGuides && (",
    "{/* Visual Guide overlays */}\r\n            {interactive && !hideGuides && ("
)

# Underlay:
inner_restored = inner_restored.replace(
    "            {/* Grid Snapping Zones Underlay */}\n            <div",
    "            {/* Grid Snapping Zones Underlay */}\n            {interactive && (\n              <div"
)
inner_restored = inner_restored.replace(
    "            {/* Grid Snapping Zones Underlay */}\r\n            <div",
    "            {/* Grid Snapping Zones Underlay */}\r\n            {interactive && (\r\n              <div"
)

# End of underlay:
# We find:
#                 });
#               })}
#             </div>
# And replace with:
#                 });
#               })}
#             </div>
#             )}
# Note: we need to match it properly.
inner_restored = inner_restored.replace(
    "              })}\n            </div>\n\n            {/* Placed Zones Layer */}",
    "              })}\n            </div>\n            )}\n\n            {/* Placed Zones Layer */}"
)
inner_restored = inner_restored.replace(
    "              })}\r\n            </div>\r\n\r\n            {/* Placed Zones Layer */}",
    "              })}\r\n            </div>\r\n            )}\r\n\r\n            {/* Placed Zones Layer */}"
)

# Placed Zones Layer props:
inner_restored = inner_restored.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}"
)
inner_restored = inner_restored.replace(
    "onDragOver={(e) => e.preventDefault()}",
    "onDragOver={interactive ? (e) => e.preventDefault() : undefined}"
)
inner_restored = inner_restored.replace(
    "onDrop={(e) => handleDropOnZone(e, zone.id)}",
    "onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}"
)
inner_restored = inner_restored.replace(
    "border: isSelected ? '2px solid #B9783B' : '1px dashed rgba(185,120,59,0.2)',",
    "border: (interactive && isSelected) ? '2px solid #B9783B' : (interactive ? '1px dashed rgba(185,120,59,0.2)' : 'none'),"
)
inner_restored = inner_restored.replace(
    "pointerEvents: 'auto',",
    "pointerEvents: interactive ? 'auto' : 'none',"
)
inner_restored = inner_restored.replace(
    "cursor: 'pointer',",
    "cursor: interactive ? 'pointer' : 'default',"
)
inner_restored = inner_restored.replace(
    "backgroundColor: zone.backgroundColor || (isSelected ? 'rgba(185,120,59,0.03)' : 'transparent'),",
    "backgroundColor: zone.backgroundColor || ((interactive && isSelected) ? 'rgba(185,120,59,0.03)' : 'transparent'),"
)

# Empty zones:
inner_restored = inner_restored.replace(
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

# Elements:
inner_restored = inner_restored.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); } : undefined}"
)
inner_restored = inner_restored.replace(
    "draggable={true}",
    "draggable={interactive}"
)
inner_restored = inner_restored.replace(
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
inner_restored = inner_restored.replace(
    "outline: isElSelected ? '2px solid #B9783B' : 'none',",
    "outline: (interactive && isElSelected) ? '2px solid #B9783B' : 'none',"
)
inner_restored = inner_restored.replace(
    "cursor: 'grab',",
    "cursor: interactive ? 'grab' : 'default',"
)

# 3. Create renderCardContent function definition
render_card_content_func = f"""  const renderCardContent = (interactive: boolean) => {{
    return (
      <>
{inner_restored}      </>
    );
  }};

"""

# 4. Inject renderCardContent function definition
return_idx = content.find("  return (")
if return_idx == -1:
    print("Error: return ( statement not found")
    exit(1)

content_with_func = content[:return_idx] + render_card_content_func + content[return_idx:]

# Since we modified the file, let's recalculate the zoom indices on the new content
zoom_idx = content_with_func.find(zoom_comment)
zoom_div_start = content_with_func.find("<div", zoom_idx)
bottom_idx = content_with_func.find(bottom_comment)

idx = bottom_idx
div_indices = []
while True:
    idx = content_with_func.rfind("</div>", 0, idx)
    if idx == -1 or idx < zoom_div_start:
        break
    div_indices.append(idx)
    if len(div_indices) == 3:
        break

# The Zoom scaling frame starts at zoom_div_start and ends at div_indices[1] + len("</div>")
# Let's replace the Zoom scaling frame with our conditional code:
zoom_frame_to_replace = content_with_func[zoom_div_start:div_indices[1]+len("</div>")]

new_zoom_frame = """{repeatLayout.enabled ? (
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
                      position: 'relative',
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
          )}"""

final_content = content_with_func.replace(zoom_frame_to_replace, new_zoom_frame)

with open(temp_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print(f"SUCCESS: Temp file written to {temp_path}")
