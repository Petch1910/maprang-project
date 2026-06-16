import re
import os

js_path = r"d:\missai.me\_next\static\chunks\9348-327bec45fea8535c.js"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\sidebar_classes_extracted.txt"

if not os.path.exists(js_path):
    print("JS chunk file not found!")
    exit(1)

with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for string literals (e.g. double or single quoted) that contain tailwind classes
tailwind_regex = r'"([^"]*(?:flex|bg-|text-|border-|grid-|hover:|active:|md:|sm:|lg:|rounded-|w-|h-|px-|py-|gap-|justify-)[^"]*)"'
classes = re.findall(tailwind_regex, content)
classes = list(set(classes))

# Let's search for Chinese text/names
chinese_regex = r'[\u4e00-\u9fa5]{2,}'
chinese_words = re.findall(chinese_regex, content)
chinese_words = list(set(chinese_words))

# Find routes / links like href="/something"
href_regex = r'"(/[^"]+)"'
hrefs = re.findall(href_regex, content)
hrefs = list(set(hrefs))

# Let's write results to file
with open(output_path, "w", encoding="utf-8") as out:
    out.write("# Sidebar Chunk Analysis (9348-327bec45fea8535c.js)\n\n")
    out.write("## Routes / URLs:\n")
    for h in sorted(hrefs):
        out.write(f"- `{h}`\n")
    out.write("\n## Tailwind CSS Classes:\n")
    for c in sorted(classes):
        out.write(f"- `{c}`\n")
    out.write("\n## Chinese Words:\n")
    for w in sorted(chinese_words):
        out.write(f"- {w}\n")

print("Analysis written to sidebar_classes_extracted.txt")
