file_path = r"c:\Users\ingem\MY Whiskey - Site\src\app\admin\collateral\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Print last 5000 characters with ascii/ignore encoding to avoid terminal printing crash
print(content[-5000:].encode('ascii', errors='replace').decode('ascii'))
