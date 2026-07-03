import os

path = "scratch/backup_step_5627.tsx"
if os.path.exists(path):
    print("File size:", os.path.getsize(path))
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    print("Number of lines:", len(content.splitlines()))
    print("Last 10 lines of file:")
    print("\n".join(content.splitlines()[-10:]))
else:
    print("File does not exist!")
