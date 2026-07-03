import os
import datetime

path = r"c:\Users\ingem\MY Whiskey - Site\.next\server\app\admin\collateral\page.js"
if os.path.exists(path):
    mtime = os.path.getmtime(path)
    date = datetime.datetime.fromtimestamp(mtime)
    print("Found compiled page.js:")
    print("  Path:", path)
    print("  Size:", os.path.getsize(path), "bytes")
    print("  Modified:", date)
else:
    print("Compiled page.js not found at:", path)
    
# Let's also check in .firebase directory
print("\nChecking in .firebase directory...")
for root, dirs, files in os.walk(r"c:\Users\ingem\MY Whiskey - Site\.firebase"):
    for file in files:
        if file == "page.js" and "collateral" in root:
            p = os.path.join(root, file)
            mtime = os.path.getmtime(p)
            date = datetime.datetime.fromtimestamp(mtime)
            print(f"Found {p}:")
            print("  Size:", os.path.getsize(p), "bytes")
            print("  Modified:", date)
