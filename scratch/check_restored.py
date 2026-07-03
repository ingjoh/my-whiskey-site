import os

path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    lines = content.splitlines()
    print("Restored file info:")
    print("  Size:", len(content), "bytes")
    print("  Total lines:", len(lines))
    print("\n--- Start ---")
    print("\n".join(lines[:15]))
    print("\n--- End ---")
    print("\n".join(lines[-15:]))
else:
    print("Restored file not found!")
