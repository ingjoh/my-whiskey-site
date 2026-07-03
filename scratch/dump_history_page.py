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
                if step_idx is None or step_idx >= 8000:
                    continue
                
                # Check for large content/output
                # Look inside tool calls
                tcs = obj.get("tool_calls", [])
                for tc in tcs:
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    
                    # CodeContent in write_to_file
                    code = args.get("CodeContent", "")
                    if len(code) > 20000:
                        out_path = f"scratch/backup_step_{step_idx}_code.tsx"
                        with open(out_path, "w", encoding="utf-8") as out_f:
                            out_f.write(code)
                        print(f"Dumped code content from Step {step_idx} (tool call args) to {out_path} ({len(code)} bytes)")
                
                # Check tool output (for view_file)
                output = obj.get("output", "")
                if len(output) > 20000:
                    out_path = f"scratch/backup_step_{step_idx}_output.tsx"
                    with open(out_path, "w", encoding="utf-8") as out_f:
                        out_f.write(output)
                    print(f"Dumped output content from Step {step_idx} (tool output) to {out_path} ({len(output)} bytes)")
            except Exception as e:
                pass
print("Search complete.")
