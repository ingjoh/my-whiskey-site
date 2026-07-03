import os
import json

next_dir = r"c:\Users\ingem\MY Whiskey - Site\.next"
matches = []

for root, dirs, files in os.walk(next_dir):
    for file in files:
        if file.endswith(".json"):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                if "collateral" in content:
                    matches.append(path)
            except:
                pass

print("JSON files containing 'collateral':")
for p in matches:
    print(f"  {os.path.relpath(p, next_dir)}")
