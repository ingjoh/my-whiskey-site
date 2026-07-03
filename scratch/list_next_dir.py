import os

next_dir = r"c:\Users\ingem\MY Whiskey - Site\.next"
if os.path.exists(next_dir):
    print("Contents of .next:")
    for item in os.listdir(next_dir):
        path = os.path.join(next_dir, item)
        if os.path.isdir(path):
            print(f"  [DIR] {item}/")
        else:
            print(f"  [FILE] {item} ({os.path.getsize(path)} bytes)")
else:
    print(".next directory does not exist!")
