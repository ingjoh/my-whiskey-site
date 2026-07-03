import os

search_dirs = [
    r"c:\Users\ingem\MY Whiskey - Site\.next",
    r"c:\Users\ingem\MY Whiskey - Site\.firebase"
]
matches = []

for s_dir in search_dirs:
    if not os.path.exists(s_dir):
        continue
    for root, dirs, files in os.walk(s_dir):
        for file in files:
            if file.endswith(".js") or file.endswith(".jsx") or file.endswith(".tsx"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        # We only need a portion of the file to check, but since files can be large:
                        content = f.read()
                    if "AdvancedCollateralBuilder" in content:
                        matches.append((path, len(content)))
                except:
                    pass

print("Found matches:")
for path, size in sorted(matches, key=lambda x: x[1]):
    print(f"  {path} (Size: {size} bytes)")
