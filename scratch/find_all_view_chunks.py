import json
import os
import re

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "page.tsx" in line and '"type":"VIEW_FILE"' in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                content = obj.get("content", "")
                
                # Search for "Showing lines X to Y"
                match = re.search(r"Showing lines (\d+) to (\d+)", content)
                lines_info = match.group(0) if match else "No lines header found"
                
                # Search for total lines
                match_total = re.search(r"Total Lines: (\d+)", content)
                total_lines = match_total.group(0) if match_total else "No total lines info"
                
                print(f"Line {line_num}: Step {step_idx} | {lines_info} | {total_lines} | Content length: {len(content)}")
            except Exception as e:
                pass
