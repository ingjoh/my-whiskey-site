import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":7554' in line:
            obj = json.loads(line)
            content = obj.get("content", "")
            print("Step 7554 Content Length:", len(content))
            print("--- Start ---")
            print(content[:500])
            print("--- End ---")
            print(content[-500:])
            break
