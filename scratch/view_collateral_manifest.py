import os
import json

path = r"c:\Users\ingem\MY Whiskey - Site\.next\server\app\admin\collateral\page"
if os.path.exists(path):
    print("Found manifest dir at:", path)
    for file in os.listdir(path):
        if file.endswith(".json"):
            print(f"  {file}:")
            p = os.path.join(path, file)
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # print a summary of the keys or contents
                print("    Keys:", list(data.keys()))
                if "clientPaths" in data or "chunks" in data or "files" in data:
                    print("    Content summary:")
                    for k in ["clientPaths", "chunks", "files"]:
                        if k in data:
                            print(f"      {k}: {data[k]}")
            except Exception as e:
                print("    Error loading:", e)
else:
    print("Directory not found:", path)
