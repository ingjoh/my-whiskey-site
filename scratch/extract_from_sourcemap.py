import json
import os

map_path = r"c:\Users\ingem\MY Whiskey - Site\.next\server\chunks\ssr\src_app_admin_collateral_page_tsx_10qgwy7._.js.map"
output_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

if not os.path.exists(map_path):
    print("Source map not found at:", map_path)
    exit(1)

with open(map_path, "r", encoding="utf-8") as f:
    data = json.load(f)

sources = data.get("sources", [])
sources_content = data.get("sourcesContent", [])

print("Found sources in map:")
for idx, s in enumerate(sources):
    # Print source name if it looks like our file
    if "page.tsx" in s or "collateral" in s:
        print(f"  Index {idx}: {s}")

target_indices = [idx for idx, s in enumerate(sources) if "app/admin/collateral/page.tsx" in s or s.endswith("collateral/page.tsx")]

if target_indices:
    idx = target_indices[0]
    print(f"\nUsing source at index {idx}: {sources[idx]}")
    content = sources_content[idx]
    
    # Let's save a backup first
    backup_path = output_path + ".corrupted_backup"
    if os.path.exists(output_path):
        os.rename(output_path, backup_path)
        print(f"Moved existing corrupted file to {backup_path}")
        
    with open(output_path, "w", encoding="utf-8") as out_f:
        out_f.write(content)
        
    print(f"SUCCESS: Successfully restored collateral page.tsx from source map! ({len(content)} bytes)")
else:
    print("\nCould not find the target source in the map. Showing all sources:")
    for idx, s in enumerate(sources):
        print(f"  Index {idx}: {s}")
