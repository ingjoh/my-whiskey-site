import os
import datetime

path = r"c:\Users\ingem\MY Whiskey - Site\.next\server\chunks\ssr\src_app_admin_collateral_page_tsx_10qgwy7._.js"
if os.path.exists(path):
    mtime = os.path.getmtime(path)
    date = datetime.datetime.fromtimestamp(mtime)
    print("Found Turbopack chunk:")
    print("  Path:", path)
    print("  Size:", os.path.getsize(path), "bytes")
    print("  Modified:", date)
else:
    print("Chunk file not found at:", path)
    
# Check parent directory contents
parent = r"c:\Users\ingem\MY Whiskey - Site\.next\server\chunks\ssr"
if os.path.exists(parent):
    print(f"\nParent dir {parent} exists. Files matching collateral:")
    for file in os.listdir(parent):
        if "collateral" in file.lower() or "page_tsx" in file.lower():
            p_file = os.path.join(parent, file)
            mtime = os.path.getmtime(p_file)
            date = datetime.datetime.fromtimestamp(mtime)
            print(f"  {file} ({os.path.getsize(p_file)} bytes) - Modified: {date}")
else:
    print("Parent dir does not exist:", parent)
