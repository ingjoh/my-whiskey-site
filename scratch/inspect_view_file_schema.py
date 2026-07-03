import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"type":"VIEW_FILE"' in line:
            obj = json.loads(line)
            print("Keys in VIEW_FILE entry:", list(obj.keys()))
            # Print a snippet of keys and values, except we truncate large values
            for k, v in obj.items():
                val_str = str(v)
                if len(val_str) > 100:
                    val_str = val_str[:100] + "..."
                print(f"  {k}: {val_str}")
            break
