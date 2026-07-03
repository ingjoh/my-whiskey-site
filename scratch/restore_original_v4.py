import os

file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the bottom comment
bottom_comment = "{/* Bottom Pagination & Page Toolbar */}"
bottom_idx = content.find(bottom_comment)
if bottom_idx == -1:
    print("Could not find bottom comment!")
    exit(1)

# Find the start of the appended block
appended_marker = "            )}"
appended_idx = content.find(appended_marker, bottom_idx + 1000)

if appended_idx == -1:
    appended_marker = "            )"
    appended_idx = content.find(appended_marker, bottom_idx + 1000)

if appended_idx == -1:
    print("Could not find appended block marker!")
    exit(1)

block_a_b = content[:bottom_idx]
# Block C goes from bottom_comment to appended_idx
block_c = content[bottom_idx:appended_idx].rstrip()

# Find start of inner_content in block_a_b
render_start_pattern = "return (\n                  <>\n"
inner_start = block_a_b.find(render_start_pattern)
if inner_start == -1:
    render_start_pattern = "return (\r\n                  <>\r\n"
    inner_start = block_a_b.find(render_start_pattern)

if inner_start == -1:
    print("Could not find renderCardContent start pattern!")
    exit(1)

inner_start_idx = inner_start + len(render_start_pattern)

# Since renderCardContent wasn't closed in block_a_b, inner_content goes to the end of block_a_b.
# But block_a_b ends with the closing </div> of the Zoom scaling frame, so we want to strip that.
# Let's find the last "</div>" in block_a_b
last_div = block_a_b.rfind("</div>")
if last_div == -1:
    print("Could not find closing div of zoom frame in block_a_b!")
    exit(1)

inner_content = block_a_b[inner_start_idx:last_div]
print(f"Inner content length: {len(inner_content)}")

# Reverse replacements in inner_content
inner_content_restored = inner_content
inner_content_restored = inner_content_restored.replace("{/* Visual Guide overlays */}\n            {interactive && !hideGuides && (", "{/* Visual Guide overlays */}\n            {!hideGuides && (")
inner_content_restored = inner_content_restored.replace("{/* Visual Guide overlays */}\r\n            {interactive && !hideGuides && (", "{/* Visual Guide overlays */}\r\n            {!hideGuides && (")

# Underlay:
inner_content_restored = inner_content_restored.replace("{interactive && (\n              <div", "<div")
inner_content_restored = inner_content_restored.replace("{interactive && (\r\n              <div", "<div")
inner_content_restored = inner_content_restored.replace("</div>\n            )}", "</div>")
inner_content_restored = inner_content_restored.replace("</div>\r\n            )}", "</div>")

# Placed Zones:
inner_content_restored = inner_content_restored.replace("border: (interactive && isSelected) ? '2px solid #B9783B' : (interactive ? '1px dashed rgba(185,120,59,0.2)' : 'none'),", "border: isSelected ? '2px solid #B9783B' : '1px dashed rgba(185,120,59,0.2)',")
inner_content_restored = inner_content_restored.replace("backgroundColor: zone.backgroundColor || ((interactive && isSelected) ? 'rgba(185,120,59,0.03)' : 'transparent'),", "backgroundColor: zone.backgroundColor || (isSelected ? 'rgba(185,120,59,0.03)' : 'transparent'),")
inner_content_restored = inner_content_restored.replace("pointerEvents: interactive ? 'auto' : 'none',", "pointerEvents: 'auto',")
inner_content_restored = inner_content_restored.replace("cursor: interactive ? 'pointer' : 'default',", "cursor: 'pointer',")
inner_content_restored = inner_content_restored.replace("onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}", "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}")
inner_content_restored = inner_content_restored.replace("onDragOver={interactive ? (e) => e.preventDefault() : undefined}", "onDragOver={(e) => e.preventDefault()}")
inner_content_restored = inner_content_restored.replace("onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}", "onDrop={(e) => handleDropOnZone(e, zone.id)}")

# Empty Zones:
inner_content_restored = inner_content_restored.replace(
    """                    {zone.elements.length === 0 ? (
                      interactive ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
                          Empty Zone (Click to select cell)
                        </div>
                      ) : null
                    ) : (""",
    """                    {zone.elements.length === 0 ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', opacity: 0.4, position: 'relative', zIndex: 2 }}>
                        Empty Zone (Click to select cell)
                      </div>
                    ) : ("""
)

# Elements:
inner_content_restored = inner_content_restored.replace("onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); } : undefined}", "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); selectElement(el.id); }}")
inner_content_restored = inner_content_restored.replace("draggable={interactive}", "draggable={true}")
inner_content_restored = inner_content_restored.replace(
    """                            onDragStart={interactive ? (e) => {
                              e.dataTransfer.setData('sourcePageId', selectedPageId);
                              e.dataTransfer.setData('sourceZoneId', zone.id);
                              e.dataTransfer.setData('sourceElementId', el.id);
                              e.dataTransfer.effectAllowed = 'move';
                            } : undefined}""",
    """                            onDragStart={(e) => {
                              e.dataTransfer.setData('sourcePageId', selectedPageId);
                              e.dataTransfer.setData('sourceZoneId', zone.id);
                              e.dataTransfer.setData('sourceElementId', el.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}"""
)
inner_content_restored = inner_content_restored.replace("outline: (interactive && isElSelected) ? '2px solid #B9783B' : 'none',", "outline: isElSelected ? '2px solid #B9783B' : 'none',")
inner_content_restored = inner_content_restored.replace("cursor: interactive ? 'grab' : 'default',", "cursor: 'grab',")

# Reverse replacements in Block C
block_c_restored = block_c
block_c_restored = block_c_restored.replace("pointerEvents: interactive ? 'auto' : 'none',", "pointerEvents: 'auto',")
block_c_restored = block_c_restored.replace("cursor: interactive ? 'pointer' : 'default',", "cursor: 'pointer',")
block_c_restored = block_c_restored.replace("onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}", "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}")
block_c_restored = block_c_restored.replace("onDragOver={interactive ? (e) => e.preventDefault() : undefined}", "onDragOver={(e) => e.preventDefault()}")
block_c_restored = block_c_restored.replace("onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}", "onDrop={(e) => handleDropOnZone(e, zone.id)}")
block_c_restored = block_c_restored.replace("cursor: interactive ? 'grab' : 'default',", "cursor: 'grab',")
block_c_restored = block_c_restored.replace("draggable={interactive}", "draggable={true}")

# Reconstruct original Zoom scaling frame
start_comment = "{/* Zoom scaling frame */}"
start_idx = block_a_b.find(start_comment)

original_zoom_frame = f"""{start_comment}
          <div 
            style={{{{
              width: `calc(${{width}} * ${{zoomFactor}})`,
              height: `calc(${{height}} * ${{zoomFactor}})`,
              position: 'relative',
              background: printTheme === 'light' ? '#F9F8F6' : '#1A1C1E',
              color: printTheme === 'light' ? '#1E2124' : '#F4F1EA',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              transition: 'all 0.15s ease',
              // Dynamic CSS custom variables for zoom calculations
              '--zoom-scale': zoomFactor
            }}}}
          >
{inner_content_restored}          </div>"""

# Reconstruct original content
original_content = content[:start_idx] + original_zoom_frame + "\n\n" + block_c_restored + "\n  );\n}\n"

with open(file_path, "w", encoding="utf-8") as f:
    f.write(original_content)

print("SUCCESS: Reverted to original page.tsx successfully!")
