path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.read().splitlines()

for i in range(1698, min(1760, len(lines))):
    print(f"{i+1}: {lines[i]}")
