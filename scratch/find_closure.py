file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for "};" near the end
idx = content.find("toasts")
if idx != -1:
    print(repr(content[idx:idx+800]))
