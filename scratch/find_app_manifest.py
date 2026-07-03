import os

next_dir = r"c:\Users\ingem\MY Whiskey - Site\.next"
if os.path.exists(next_dir):
    print("Manifest files in .next:")
    for root, dirs, files in os.walk(next_dir):
        for file in files:
            if "manifest" in file.lower() and file.endswith(".json"):
                print(f"  {os.path.relpath(os.path.join(root, file), next_dir)}")
else:
    print(".next directory does not exist!")
