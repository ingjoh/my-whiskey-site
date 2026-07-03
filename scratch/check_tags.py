import re

def check_brackets_and_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    braces = 0
    parens = 0
    brackets = 0
    
    # Simple tag matching (just looking for common tags in JSX)
    open_tags = []
    
    # We will search for tags like <div>, <p>, <span>, <section>, <a>, <button>, etc.
    # and their closing versions.
    tag_pattern = re.compile(r'<(/?[a-zA-Z0-9]+)(?:\s+[^>]*?)?>')
    
    for i, line in enumerate(lines, 1):
        # strip comments to avoid false matches
        cleaned = re.sub(r'{\s*/\*.*?\*/\s*}', '', line)
        cleaned = re.sub(r'//.*', '', cleaned)
        
        # Check brackets
        for char in cleaned:
            if char == '{':
                braces += 1
            elif char == '}':
                braces -= 1
                if braces < 0:
                    print(f"Excess '}}' on line {i}")
                    braces = 0
            elif char == '(':
                parens += 1
            elif char == ')':
                parens -= 1
                if parens < 0:
                    print(f"Excess ')' on line {i}")
                    parens = 0
            elif char == '[':
                brackets += 1
            elif char == ']':
                brackets -= 1
                if brackets < 0:
                    print(f"Excess ']' on line {i}")
                    brackets = 0
                    
        # Check HTML/JSX tags
        for match in tag_pattern.finditer(cleaned):
            tag = match.group(1)
            # Ignore self-closing tags like <img />, <input />, <hr />, <br />
            if match.group(0).endswith('/>') or tag.lower() in ['img', 'input', 'br', 'hr', 'link', 'meta']:
                continue
            
            if tag.startswith('/'):
                # Closing tag
                closed_tag = tag[1:]
                if not open_tags:
                    print(f"Unexpected closing tag </{closed_tag}> on line {i}")
                else:
                    last_open = open_tags.pop()
                    if last_open != closed_tag:
                        print(f"Mismatched closing tag </{closed_tag}> for <{last_open}> on line {i}")
                        # Put it back to keep tracking if possible
                        open_tags.append(last_open)
            else:
                # Opening tag
                open_tags.append(tag)
                
    print("\n--- Final Counts ---")
    print(f"Open braces ({{): {braces}")
    print(f"Open parens ((): {parens}")
    print(f"Open brackets ([): {brackets}")
    print("Unclosed tags:", open_tags)

if __name__ == '__main__':
    check_brackets_and_tags('c:/Users/ingem/MY Whiskey - Site/src/components/public/AdventureDetailView.tsx')
