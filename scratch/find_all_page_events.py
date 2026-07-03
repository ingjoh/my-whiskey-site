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
                step_type = obj.get("type")
                tool_calls = obj.get("tool_calls", [])
                
                # Check for tool calls
                tc_info = []
                for tc in tool_calls:
                    t_name = tc.get("name")
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    len_code = len(args.get("CodeContent", ""))
                    len_rep = len(args.get("ReplacementContent", ""))
                    tc_info.append(f"{t_name}(code={len_code}, rep={len_rep})")
                
                # Check for output/content
                content_len = len(obj.get("content", ""))
                output_len = 0
                if "output" in obj:
                    output_len = len(str(obj["output"]))
                elif "result" in obj:
                    output_len = len(str(obj["result"]))
                
                print(f"Line {line_num}: Step {step_idx} | Type: {step_type} | Tools: {', '.join(tc_info)} | Content: {content_len} | Output: {output_len}")
            except Exception as e:
                pass
