file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

print("File length:", len(content))
print("Last 200 characters:")
print(repr(content[-200:]))
