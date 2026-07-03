import json
import os

manifest_path = r"c:\Users\ingem\MY Whiskey - Site\.next\build-manifest.json"
routes_manifest_path = r"c:\Users\ingem\MY Whiskey - Site\.next\app-path-routes-manifest.json"

if os.path.exists(manifest_path):
    print("--- build-manifest.json ---")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    print("Keys in manifest:", list(manifest.keys()))
    # Let's search for pages containing "collateral"
    for page, chunks in manifest.get("pages", {}).items():
        if "collateral" in page:
            print(f"Page: {page}")
            for chunk in chunks:
                print(f"  Chunk: {chunk}")
else:
    print("build-manifest.json not found!")

if os.path.exists(routes_manifest_path):
    print("\n--- app-path-routes-manifest.json ---")
    with open(routes_manifest_path, "r", encoding="utf-8") as f:
        routes = json.load(f)
    for k, v in routes.items():
        if "collateral" in k or "collateral" in v:
            print(f"  {k}: {v}")
else:
    print("app-path-routes-manifest.json not found!")
