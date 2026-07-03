import os

path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\tasks\task-8407.log"
if os.path.exists(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    print("Log output length:", len(content))
    print(content)
else:
    print("Log not found!")
