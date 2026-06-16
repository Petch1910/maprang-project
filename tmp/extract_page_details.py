import os
import re

dir_path = r"d:\missai.me"
html_files = [f for f in os.listdir(dir_path) if f.endswith(".html")]

output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\page_details.txt"
results = []

for file_name in html_files:
    file_path = os.path.join(dir_path, file_name)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Let's search for self.__next_f.push payloads
    matches = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', content)
    payload_text = ""
    for m in matches:
        # Unescape unicode and javascript strings
        s = m.replace('\\"', '"').replace('\\n', '\n').replace('\\t', '\t')
        payload_text += s
        
    # Search for Chinese or English title-like keys
    # e.g., "title","og:title", or Chinese characters in metadata
    title_matches = re.findall(r'"title",\s*"\d+",\s*\{\s*"children"\s*:\s*"(.*?)"\}', payload_text)
    if not title_matches:
        title_matches = re.findall(r'title":"([^"]+)"', payload_text)
    
    results.append(f"\n============================\nFile: {file_name}")
    results.append(f"Title Matches: {title_matches}")
    
    # Find some human-readable strings (alphabetic/chinese)
    clean_strings = []
    # Find substrings that are Chinese characters
    chinese_subs = re.findall(r'[\u4e00-\u9fa5]{2,}', payload_text)
    if chinese_subs:
        clean_strings.append("Chinese words: " + ", ".join(list(set(chinese_subs))[:15]))
        
    results.append("\n".join(clean_strings))

with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print("Results written to page_details.txt")
