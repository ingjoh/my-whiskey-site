import os

file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find the start of Block C (Bottom Pagination & Page Toolbar)
bottom_comment = "{/* Bottom Pagination & Page Toolbar */}"
bottom_idx = content.find(bottom_comment)
if bottom_idx == -1:
    print("Could not find bottom comment!")
    exit(1)

# The original file ended right before the appended text.
# The appended text starts after the original closing tags:
# </div>\n    </div>\n  );\n}
# Let's search for this sequence around the end of the file.
original_end_pattern = "</div>\n    </div>\n  );\n}"
end_idx = content.find(original_end_pattern, bottom_idx)
if end_idx == -1:
    # Let's try with different line endings
    original_end_pattern = "</div>\r\n    </div>\r\n  );\r\n}"
    end_idx = content.find(original_end_pattern, bottom_idx)

if end_idx == -1:
    print("Could not find original closing pattern!")
    exit(1)

original_end_idx = end_idx + len(original_end_pattern)

block_a_b = content[:bottom_idx]
block_c = content[bottom_idx:original_end_idx]

print(f"Block C extracted: length {len(block_c)}")

# Let's reverse replacements in Block C
block_c_restored = block_c
block_c_restored = block_c_restored.replace("pointerEvents: interactive ? 'auto' : 'none',", "pointerEvents: 'auto',")
block_c_restored = block_c_restored.replace("cursor: interactive ? 'pointer' : 'default',", "cursor: 'pointer',")
block_c_restored = block_c_restored.replace("onClick={interactive ? (e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); } : undefined}", "onClick={(e) => { e.stopPropagation(); selectZone(zone.id); setSelectedCell(null); }}")
block_c_restored = block_c_restored.replace("onDragOver={interactive ? (e) => e.preventDefault() : undefined}", "onDragOver={(e) => e.preventDefault()}")
block_c_restored = block_c_restored.replace("onDrop={interactive ? (e) => handleDropOnZone(e, zone.id) : undefined}", "onDrop={(e) => handleDropOnZone(e, zone.id)}")
block_c_restored = block_c_restored.replace("cursor: interactive ? 'grab' : 'default',", "cursor: 'grab',")
block_c_restored = block_c_restored.replace("draggable={interactive}", "draggable={true}")

# Let's check if there are other occurrences
print(f"Restored Block C changes.")

# Let's also restore Block B (the zoom scaling frame content).
# Since Block B had the matching brace truncation, let's restore Block B to its original form.
# The original Block B went from start_comment to bottom_idx.
# In the current file, block_a_b is content[:bottom_idx].
# The start of the zoom scaling frame comment is at line 770.
start_comment = "{/* Zoom scaling frame */}"
start_idx = content.find(start_comment)
if start_idx == -1:
    print("Could not find start comment in block_a_b!")
    exit(1)

# The zoom scaling frame opened with:
# <div \n            style={{\n              width: `calc(${width} * ${zoomFactor})` ...
# Let's extract Block B from block_a_b and clean it up.
# Currently, block_a_b has:
# {/* Zoom scaling frame */}
# <div style={...}>
#   {(() => {
#     const renderCardContent = (interactive: boolean) => {
#       return (
#         <>
#           [inner_content]
#         </>
#       );
#     };
#     return repeatLayout.enabled ? ...
#   })()}
# </div>
# Wait, we want to extract the inner_content and restore it back to the original Zoom scaling frame!
# Let's find the start of the inner_content. It starts after `return (\n                  <>` in renderCardContent.
render_start_pattern = "return (\n                  <>\n"
inner_start = block_a_b.find(render_start_pattern)
if inner_start == -1:
    render_start_pattern = "return (\r\n                  <>\r\n"
    inner_start = block_a_b.find(render_start_pattern)

if inner_start == -1:
    print("Could not find renderCardContent start pattern!")
    exit(1)

inner_start_idx = inner_start + len(render_start_pattern)

# The inner_content ends before the closing of renderCardContent:
#                   </>\n                );\n              };
render_end_pattern = "                  </>\n                );\n              };"
inner_end = block_a_b.find(render_end_pattern)
if inner_end == -1:
    render_end_pattern = "                  </>\r\n                );\r\n              };"
    inner_end = block_a_b.find(render_end_pattern)

if inner_end == -1:
    print("Could not find renderCardContent end pattern!")
    exit(1)

inner_content = block_a_b[inner_start_idx:inner_end]

# Let's reverse replacements in inner_content
inner_content_restored = inner_content
inner_content_restored = inner_content_restored.replace("{/* Visual Guide overlays */}\n            {interactive && !hideGuides && (", "{/* Visual Guide overlays */}\n            {!hideGuides && (")
inner_content_restored = inner_content_restored.replace("{/* Visual Guide overlays */}\r\n            {interactive && !hideGuides && (", "{/* Visual Guide overlays */}\r\n            {!hideGuides && (")

# Underlay:
inner_content_restored = inner_content_restored.replace("{interactive && (\n              <div", "<div")
inner_content_restored = inner_content_restored.replace("{interactive && (\r\n              <div", "<div")
# We need to remove the closing `\n            )}` or `\r\n            )}` of the underlay.
# In the original file, the underlay ended with `</div>` right before `{/* Placed Zones Layer */}`.
# So the new content had:
# </div>\n            )}
# Let's replace:
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

# Let's assemble the original Zoom scaling frame
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

# Let's join everything back
original_content = content[:start_idx] + original_zoom_frame + "\n\n" + block_c_restored

with open(file_path, "w", encoding="utf-8") as f:
    f.write(original_content)

print("SUCCESS: Reverted to original page.tsx successfully!")
