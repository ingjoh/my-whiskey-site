import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
steps_to_check = [5293, 5449, 5627]

for step in steps_to_check:
    with open(log_path, "r", encoding="utf-8") as f:
        found = False
        for line in f:
            if f'"step_index":{step}' in line:
                obj = json.loads(line)
                tcs = obj.get("tool_calls", [])
                for tc in tcs:
                    if tc.get("name") == "write_to_file":
                        args = tc.get("args", {})
                        if isinstance(args, str):
                            args = json.loads(args)
                        target = args.get("TargetFile", "")
                        if "collateral/page.tsx" in target or "collateral\\page.tsx" in target:
                            code = args.get("CodeContent", "")
                            print(f"Step {step} write_to_file:")
                            print(f"  Target: {target}")
                            print(f"  CodeContent length: {len(code)}")
                            print("  Start:")
                            print(code[:300])
                            print("  End:")
                            print(code[-300:])
                            found = True
                            
                            # Let's save it to a scratch file so we don't lose it
                            out_name = f"scratch/backup_step_{step}.tsx"
                            with open(out_name, "w", encoding="utf-8") as out_f:
                                out_f.write(code)
                            print(f"  Saved full CodeContent to {out_name}")
                if found:
                    break
