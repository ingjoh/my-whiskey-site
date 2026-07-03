import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "collateral/page.tsx" in line:
            try:
                obj = json.loads(line)
                step_idx = obj.get("step_index")
                tool_calls = obj.get("tool_calls", [])
                
                # Check for write_to_file or edit tool call in planner response
                if tool_calls:
                    for tc in tool_calls:
                        name = tc.get("name")
                        args = tc.get("args", {})
                        if isinstance(args, str):
                            try:
                                args = json.loads(args)
                            except:
                                pass
                        target = args.get("TargetFile", args.get("Target", ""))
                        if "collateral/page.tsx" in target:
                            content_len = len(args.get("CodeContent", ""))
                            print(f"Line {line_num}: Step {step_idx} - Tool Call '{name}', Content Len: {content_len}")
                
                # Check for write_to_file or edit in system code action
                if obj.get("type") == "CODE_ACTION":
                    content = obj.get("content", "")
                    # Code actions might not have CodeContent but let's see
                    print(f"Line {line_num}: Step {step_idx} - CODE_ACTION, content length: {len(content)}")
            except Exception as e:
                pass
