import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if line_num in [5268, 5269]:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                print(f"Line {line_num}: Step {step_idx}")
                tool_calls = obj.get("tool_calls", [])
                for tc in tool_calls:
                    name = tc.get("name")
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    print(f"  Tool: {name}")
                    for k, v in args.items():
                        if k in ["CodeContent", "ReplacementContent"]:
                            print(f"    {k} length: {len(v)}")
                        else:
                            print(f"    {k}: {v}")
            except Exception as e:
                print(e)
