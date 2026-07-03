file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

idx = 198307
print(repr(content[idx-200:idx+200]))
