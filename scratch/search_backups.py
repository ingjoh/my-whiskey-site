import os

search_dir = r"c:\Users\ingem\MY Whiskey - Site"
matches = []

for root, dirs, files in os.walk(search_dir):
    # Skip directories that are large and irrelevant
    if any(p in root for p in [".git", "node_modules", ".next", ".firebase"]):
        continue
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts") or file.endswith(".js"):
            path = os.path.join(root, file)
            # Skip the corrupted file itself
            if "collateral\\page.tsx" in path or "collateral/page.tsx" in path:
                continue
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                if "AdvancedCollateralBuilder" in content:
                    matches.append((path, len(content)))
            except:
                pass

print("Found matches:")
for path, size in matches:
    print(f"  {path} (Size: {size} bytes)")
