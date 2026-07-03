import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "page.tsx" in line and "write_to_file" in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                tool_calls = obj.get("tool_calls", [])
                for tc in tool_calls:
                    name = tc.get("name")
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    target = args.get("TargetFile", args.get("Target", ""))
                    if "collateral/page.tsx" in target or "collateral\\page.tsx" in target:
                        code_content = args.get("CodeContent", "")
                        print(f"Line {line_num}: Step {step_idx} - write_to_file, Target: {target}, CodeContent Len: {len(code_content)}")
            except Exception as e:
                pass
