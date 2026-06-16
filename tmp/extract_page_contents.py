import os
import re

chunks_dir = r"d:\missai.me\_next\static\chunks\app"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\missing_pages_details.txt"

results = []

pages = ["announcements", "creators", "favorites", "works", "support", "settings", "points"]

for page in pages:
    page_dir = os.path.join(chunks_dir, page)
    if not os.path.exists(page_dir):
        results.append(f"\n============================\nPage: {page} (Directory not found)")
        continue
    
    results.append(f"\n============================\nPage: {page}")
    for file in os.listdir(page_dir):
        if file.endswith(".js"):
            path = os.path.join(page_dir, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Find Chinese words
            chinese_subs = re.findall(r'[\u4e00-\u9fa5]{2,}', content)
            chinese_subs = list(set(chinese_subs))
            results.append(f"File: {file}")
            results.append("Text found: " + ", ".join(chinese_subs[:30]))
            
            # Look for Tailwind classes
            tailwind_regex = r'"([^"]*(?:flex|bg-|text-|border-|grid-|hover:|active:|md:|sm:|lg:|rounded-|w-|h-|px-|py-|gap-|justify-)[^"]*)"'
            classes = re.findall(tailwind_regex, content)
            classes = list(set(classes))
            results.append("Classes found: " + ", ".join(classes[:10]))

with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print("Search completed. Results written to missing_pages_details.txt")
