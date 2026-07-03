file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find("toasts.map", 100000)
if idx != -1:
    print(repr(content[idx:idx+800]))
