import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        if '"step_index":563' in line:
            obj = json.loads(line)
            print("Step 563 Keys:", list(obj.keys()))
            tcs = obj.get("tool_calls", [])
            for tc in tcs:
                name = tc.get("name")
                args = tc.get("args", {})
                if isinstance(args, str):
                    args = json.loads(args)
                print(f"Tool call: {name}")
                print("Target:", args.get("TargetFile", args.get("Target", "")))
                code = args.get("CodeContent", "")
                print("CodeContent Len:", len(code))
                if len(code) > 0:
                    # Save it!
                    with open("scratch/step_563_code.tsx", "w", encoding="utf-8") as out_f:
                        out_f.write(code)
                    print("Saved CodeContent to scratch/step_563_code.tsx")
            break
