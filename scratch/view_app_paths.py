import json
import os

paths = [
    r"c:\Users\ingem\MY Whiskey - Site\.next\server\app-paths-manifest.json",
    r"c:\Users\ingem\MY Whiskey - Site\.next\dev\server\app-paths-manifest.json"
]

for p in paths:
    if os.path.exists(p):
        print(f"--- {p} ---")
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        for k, v in data.items():
            if "collateral" in k:
                print(f"  {k}: {v}")
    else:
        print(f"{p} not found!")
