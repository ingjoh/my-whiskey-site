import json
import os
import re

log_path = r"C:\Users\ingem\.gemini\antigravity\brain\b0e742ab-7ad0-4b29-bece-7f655440bb01\.system_generated\logs\transcript.jsonl"
if not os.path.exists(log_path):
    print("Log file does not exist!")
    exit(1)

line_map = {}
max_line = 0

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "page.tsx" in line and '"type":"VIEW_FILE"' in line:
            try:
                obj = json.loads(line)
                content = obj.get("content", "")
                
                # Check line range
                match_range = re.search(r"Showing lines (\d+) to (\d+)", content)
                if not match_range:
                    continue
                
                start_l = int(match_range.group(1))
                end_l = int(match_range.group(2))
                
                # Parse lines from content
                # Lines usually look like: "123: original_line"
                # Let's split content by newlines and find matching patterns
                lines = content.splitlines()
                for l in lines:
                    match_line = re.match(r"^(\d+):\s?(.*)$", l.strip())
                    if match_line:
                        l_num = int(match_line.group(1))
                        l_content = match_line.group(2)
                        
                        # We only want lines from the uncorrupted file versions.
                        # How do we know if it was uncorrupted? 
                        # If the total lines in the view was > 3000, it was uncorrupted.
                        # If total lines was < 2000, it was after corruption.
                        # Let's search for "Total Lines: (\d+)" in this view_file content.
                        match_total = re.search(r"Total Lines: (\d+)", content)
                        total_l = int(match_total.group(1)) if match_total else 0
                        
                        if total_l > 3000:
                            line_map[l_num] = l_content
                            if l_num > max_line:
                                max_line = l_num
            except Exception as e:
                pass

print(f"Collected {len(line_map)} unique lines. Max line index found: {max_line}")

# Check for gaps
gaps = []
in_gap = False
gap_start = 0

for i in range(1, max_line + 1):
    if i not in line_map:
        if not in_gap:
            in_gap = True
            gap_start = i
    else:
        if in_gap:
            in_gap = False
            gaps.append((gap_start, i - 1))

if in_gap:
    gaps.append((gap_start, max_line))

print("Gaps:")
for start, end in gaps:
    print(f"  Lines {start} to {end} (count: {end - start + 1})")

# Write the reconstructed file
reconstructed_lines = []
for i in range(1, max_line + 1):
    if i in line_map:
        reconstructed_lines.append(line_map[i])
    else:
        reconstructed_lines.append(f"// MISSING LINE {i}")

out_path = "scratch/reconstructed_page.tsx"
with open(out_path, "w", encoding="utf-8") as out_f:
    out_f.write("\n".join(reconstructed_lines))

print(f"Saved reconstructed page to {out_path}")
