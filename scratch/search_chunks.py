import os

search_dirs = [
    r"c:\Users\ingem\MY Whiskey - Site\.next\static\chunks",
    r"c:\Users\ingem\MY Whiskey - Site\.firebase\my-whiskey-prod\functions\.next\static\chunks"
]
matches = []

for s_dir in search_dirs:
    if not os.path.exists(s_dir):
        continue
    for root, dirs, files in os.walk(s_dir):
        for file in files:
            if file.endswith(".js"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    if "AdvancedCollateralBuilder" in content:
                        matches.append((path, len(content)))
                except:
                    pass

print("Found matches in chunks:")
for path, size in sorted(matches, key=lambda x: x[1]):
    print(f"  {path} (Size: {size} bytes)")
