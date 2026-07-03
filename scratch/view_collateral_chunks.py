import json
import os

p = r"c:\Users\ingem\MY Whiskey - Site\.next\server\app\admin\collateral\page\build-manifest.json"
if os.path.exists(p):
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    pages = data.get("pages", {})
    target_page = "/admin/collateral/page"
    if target_page in pages:
        print(f"Chunks for {target_page}:")
        for chunk in pages[target_page]:
            print(f"  {chunk}")
    else:
        print(f"Page {target_page} not found in build-manifest! Available pages: {list(pages.keys())}")
else:
    print("build-manifest.json not found!")
