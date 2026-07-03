import json
import os

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
file_to_restore = "collateral/page.tsx"

if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

# We want to find all steps that wrote or modified page.tsx
# The final full content of the file can be reconstructed by tracking the initial write and all subsequent modifications.
# Let's read the file line by line.
history = []
with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "collateral/page.tsx" in line:
            try:
                obj = json.loads(line)
                history.append((line_num, obj))
            except Exception as e:
                pass

print(f"Found {len(history)} events in history.")

# Let's inspect the latest event.
# In step 5294: it wrote the initial file (585 lines).
# But wait, did it write the file with 3419 lines later?
# Let's print out what each event was.
for line_num, event in history:
    step_idx = event.get("step_index")
    source = event.get("source")
    etype = event.get("type")
    tool_calls = event.get("tool_calls", [])
    print(f"Line {line_num}: Step {step_idx}, Source {source}, Type {etype}")
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
            print(f"  Tool Call: {name}, Target: {target}")
