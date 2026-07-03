import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "write_to_file" in line and "page.tsx" in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                tcs = obj.get("tool_calls", [])
                for tc in tcs:
                    if tc.get("name") == "write_to_file":
                        args = tc.get("args", {})
                        if isinstance(args, str):
                            args = json.loads(args)
                        target = args.get("TargetFile", "")
                        if "page.tsx" in target.lower():
                            print(f"Line {line_num}: Step {step_idx} | write_to_file | Target: {target} | CodeContent Len: {len(args.get('CodeContent', ''))}")
            except Exception as e:
                pass
