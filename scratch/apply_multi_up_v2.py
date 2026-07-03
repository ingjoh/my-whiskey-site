import os

original_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx.bak"
target_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(original_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Find the zoom scaling frame content
zoom_comment = "{/* Zoom scaling frame */}"
zoom_start = content.find(zoom_comment)
if zoom_start == -1:
    print("Error: zoom comment not found")
    exit(1)

zoom_div_start = content.find("<div", zoom_start)
if zoom_div_start == -1:
    print("Error: zoom div start not found")
    exit(1)

bottom_comment = "{/* Bottom Pagination & Page Toolbar */}"
bottom_idx = content.find(bottom_comment)
if bottom_idx == -1:
    print("Error: bottom comment not found")
    exit(1)

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
    print("Error: Could not find closing div for zoom scaling frame")
    exit(1)

zoom_div_end = div_indices[1] + len("</div>")

# Extract the exact inner content between the first zoom div's opening tag end and the zoom closing tag
zoom_div_opening_end = content.find(">", zoom_div_start) + 1
inner_content = content[zoom_div_opening_end:div_indices[1]]

# Apply transformations to inner_content for the conditional renderCardContent function
inner_restored = inner_content

# Safe guide overlays:
inner_restored = inner_restored.replace(
    "{/* Visual Guide overlays */}\n            {!hideGuides && (",
    "{/* Visual Guide overlays */}\n            {interactive && !hideGuides && ("
).replace(
    "{/* Visual Guide overlays */}\r\n            {!hideGuides && (",
    "{/* Visual Guide overlays */}\r\n            {interactive && !hideGuides && ("
)

# Underlay:
inner_restored = inner_restored.replace(
    "            {/* Grid Snapping Zones Underlay */}\n            <div",
    "            {/* Grid Snapping Zones Underlay */}\n            {interactive && (\n              <div"
).replace(
    "            {/* Grid Snapping Zones Underlay */}\r\n            <div",
    "            {/* Grid Snapping Zones Underlay */}\r\n            {interactive && (\r\n              <div"
)

# End of underlay:
inner_restored = inner_restored.replace(
    "              })}\n            </div>\n\n            {/* Placed Zones Layer */}",
    "              })}\n            </div>\n            )}\n\n            {/* Placed Zones Layer */}"
).replace(
    "              })}\r\n            </div>\r\n\r\n            {/* Placed Zones Layer */}",
    "              })}\r\n            </div>\r\n            )}\r\n\r\n            {/* Placed Zones Layer */}"
)

# Placed Zones Layer properties:
inner_restored = inner_restored.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}"
).replace(
    "onDragOver={(e) => e.preventDefault()}",
    "onDragOver={interactive ? (e) => e.preventDefault() : undefined}"
).replace(
    "onDrop={(e) => handleDropOnZone(e, zone.id)}",
    "onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}"
).replace(
    "border: isSelected ? '2px solid #B9783B' : '1px dashed rgba(185,120,59,0.2)',",
    "border: (interactive && isSelected) ? '2px solid #B9783B' : (interactive ? '1px dashed rgba(185,120,59,0.2)' : 'none'),"
).replace(
    "pointerEvents: 'auto',",
    "pointerEvents: interactive ? 'auto' : 'none',"
).replace(
    "cursor: 'pointer',",
    "cursor: interactive ? 'pointer' : 'default',"
).replace(
    "backgroundColor: zone.backgroundColor || (isSelected ? 'rgba(185,120,59,0.03)' : 'transparent'),",
    "backgroundColor: zone.backgroundColor || ((interactive && isSelected) ? 'rgba(185,120,59,0.03)' : 'transparent'),"
)

# Empty zones:
inner_restored = inner_restored.replace(
    "                    {zone.elements.length === 0 ? (\n                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>\n                        Empty Zone (Click to select cell)\n                      </div>\n                    ) : (",
    "                    {zone.elements.length === 0 ? (\n                      interactive ? (\n                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>\n                          Empty Zone (Click to select cell)\n                        </div>\n                      ) : null\n                    ) : ("
).replace(
    "                    {zone.elements.length === 0 ? (\r\n                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>\r\n                        Empty Zone (Click to select cell)\r\n                      </div>\r\n                    ) : (",
    "                    {zone.elements.length === 0 ? (\r\n                      interactive ? (\r\n                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>\r\n                          Empty Zone (Click to select cell)\r\n                        </div>\r\n                      ) : null\r\n                    ) : ("
)

# Elements:
inner_restored = inner_restored.replace(
    "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); }}",
    "onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); } : undefined}"
).replace(
    "draggable={true}",
    "draggable={interactive}"
).replace(
    "                            onDragStart={(e) => {\n                              e.dataTransfer.setData('sourcePageId', selectedPageId);\n                              e.dataTransfer.setData('sourceZoneId', zone.id);\n                              e.dataTransfer.setData('sourceElementId', el.id);\n                              e.dataTransfer.effectAllowed = 'move';\n                            }}",
    "                            onDragStart={interactive ? (e) => {\n                              e.dataTransfer.setData('sourcePageId', selectedPageId);\n                              e.dataTransfer.setData('sourceZoneId', zone.id);\n                              e.dataTransfer.setData('sourceElementId', el.id);\n                              e.dataTransfer.effectAllowed = 'move';\n                            } : undefined}"
).replace(
    "                            onDragStart={(e) => {\r\n                              e.dataTransfer.setData('sourcePageId', selectedPageId);\r\n                              e.dataTransfer.setData('sourceZoneId', zone.id);\r\n                              e.dataTransfer.setData('sourceElementId', el.id);\r\n                              e.dataTransfer.effectAllowed = 'move';\r\n                            }}",
    "                            onDragStart={interactive ? (e) => {\r\n                              e.dataTransfer.setData('sourcePageId', selectedPageId);\r\n                              e.dataTransfer.setData('sourceZoneId', zone.id);\r\n                              e.dataTransfer.setData('sourceElementId', el.id);\r\n                              e.dataTransfer.effectAllowed = 'move';\r\n                            } : undefined}"
).replace(
    "outline: isElSelected ? '2px solid #B9783B' : 'none',",
    "outline: (interactive && isElSelected) ? '2px solid #B9783B' : 'none',"
).replace(
    "cursor: 'grab',",
    "cursor: interactive ? 'grab' : 'default',"
)

# Function definition:
render_card_content_func = f"""
  const renderCardContent = (interactive: boolean) => {{
    return (
      <>
{inner_restored}      </>
    );
  }};
"""

# Let's locate the borderStyle line to inject right after it:
border_line = "  const borderStyle = printTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';"
border_idx = content.find(border_line)
if border_idx == -1:
    print("Error: borderStyle line not found")
    exit(1)

injection_point = border_idx + len(border_line)
content_with_func = content[:injection_point] + render_card_content_func + content[injection_point:]

# Now replace the original zoom scaling frame div in the output content
# Since we injected the function earlier, we should recalculate the indices of zoom scaling frame in content_with_func
zoom_start = content_with_func.find(zoom_comment)
zoom_div_start = content_with_func.find("<div", zoom_start)
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

zoom_div_end = div_indices[1] + len("</div>")

zoom_frame_to_replace = content_with_func[zoom_div_start:zoom_div_end]

# Verify zoom_frame_to_replace looks correct
print(f"Replacing zoom frame starting with: {zoom_frame_to_replace[:150]}")

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

with open(target_path, "w", encoding="utf-8") as f:
    f.write(final_content)

print("SUCCESS: page.tsx successfully generated!")
