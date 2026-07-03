import json
import os

p = r"c:\Users\ingem\MY Whiskey - Site\.next\server\app\admin\collateral\page.js.nft.json"
if os.path.exists(p):
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Files referenced in page.js.nft.json:")
    files = data.get("files", [])
    chunk_files = []
    for f_path in files:
        if "chunk" in f_path or f_path.endswith(".js"):
            chunk_files.append(f_path)
    print(f"Total chunk/JS files: {len(chunk_files)}")
    for cf in sorted(chunk_files):
        print(f"  {cf}")
else:
    print("nft.json not found!")
