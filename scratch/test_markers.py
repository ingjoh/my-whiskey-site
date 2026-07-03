import os

file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find return (
return_idx = content.find("  return (")
print("return ( index:", return_idx)

# Find Zoom scaling frame comment
zoom_comment = "{/* Zoom scaling frame */}"
zoom_idx = content.find(zoom_comment)
print("Zoom scaling frame comment index:", zoom_idx)

# Find bottom pagination comment
bottom_comment = "{/* Bottom Pagination & Page Toolbar */}"
bottom_idx = content.find(bottom_comment)
print("Bottom Pagination comment index:", bottom_idx)

# Let's inspect the surrounding code around zoom_idx and bottom_idx
if zoom_idx != -1:
    print("\n--- Zoom scaling frame context ---")
    print(content[zoom_idx:zoom_idx+300])

if bottom_idx != -1:
    print("\n--- Bottom Pagination context ---")
    print(content[bottom_idx-200:bottom_idx])
