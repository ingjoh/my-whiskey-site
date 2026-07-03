import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "page.tsx" in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                if step_idx is not None and step_idx >= 6500:
                    continue
                step_type = obj.get("type")
                
                # Check for run_command or other tools
                tcs = obj.get("tool_calls", [])
                tc_info = []
                for tc in tcs:
                    t_name = tc.get("name")
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    tc_info.append(f"{t_name}({list(args.keys())})")
                
                print(f"Line {line_num}: Step {step_idx} | Type: {step_type} | Tools: {', '.join(tc_info)}")
            except Exception as e:
                pass
