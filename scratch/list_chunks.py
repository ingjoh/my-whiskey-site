import os

search_dir = r"c:\Users\ingem\MY Whiskey - Site\.next\static\chunks"
if os.path.exists(search_dir):
    print("Files with 'collateral' in path/name:")
    count = 0
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            path = os.path.join(root, file)
            if "collateral" in file.lower() or "collateral" in root.lower():
                print(f"  {path} (Size: {os.path.getsize(path)} bytes)")
                count += 1
    print(f"Total matching files: {count}")
else:
    print("Chunks directory does not exist at:", search_dir)
