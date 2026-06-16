import os
import re

dir_path = r"d:\missai.me"
html_files = [f for f in os.listdir(dir_path) if f.endswith(".html")]

print(f"Found {len(html_files)} HTML files:")

for file_name in html_files:
    file_path = os.path.join(dir_path, file_name)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    title_match = re.search(r"<title>(.*?)</title>", content)
    title = title_match.group(1) if title_match else "No Title"
    
    print(f"  {file_name} -> {title}")
