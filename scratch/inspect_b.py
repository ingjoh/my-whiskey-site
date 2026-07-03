file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

start_idx = content.find("const renderCardContent")
if start_idx == -1:
    print("Could not find const renderCardContent")
else:
    # Print 200 chars around it
    print(repr(content[start_idx-100:start_idx+300]))

# Search for "renderCardContent" occurrences
idx = 0
while True:
    idx = content.find("renderCardContent", idx)
    if idx == -1:
         break
    print("Found renderCardContent at:", idx)
    idx += len("renderCardContent")
