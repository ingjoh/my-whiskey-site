import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":5293' in line:
            obj = json.loads(line)
            tcs = obj.get("tool_calls", [])
            for tc in tcs:
                if tc.get("name") == "write_to_file":
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        args = json.loads(args)
                    print(args.get("CodeContent", ""))
            break
