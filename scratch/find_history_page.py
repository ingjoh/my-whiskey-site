import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "collateral/page.tsx" in line or "collateral\\page.tsx" in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                if step_idx is None or step_idx >= 8000:
                    continue
                
                # Check what type of step it is
                step_type = obj.get("type")
                
                # Look for tool calls in planner response
                tcs = obj.get("tool_calls", [])
                tc_names = [tc.get("name") for tc in tcs]
                
                # Look for tool outputs
                output_keys = ["output", "result"]
                has_output = any(k in obj for k in output_keys)
                
                # Check for large content/output
                arg_len = 0
                for tc in tcs:
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    for val in args.values():
                        if isinstance(val, str) and len(val) > arg_len:
                            arg_len = len(val)
                
                content_len = len(str(obj.get("content", "")))
                
                output_len = 0
                for k in output_keys:
                    if k in obj:
                        output_len = len(str(obj[k]))
                
                print(f"Line {line_num}: Step {step_idx} | Type: {step_type} | Tools: {tc_names} | ArgMaxLen: {arg_len} | ContentLen: {content_len} | OutputLen: {output_len}")
            except Exception as e:
                pass
