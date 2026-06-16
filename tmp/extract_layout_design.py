import re
import os

js_path = r"d:\missai.me\_next\static\chunks\app\layout-9c195ca71bfe9cd2.js"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\layout_design_extracted.txt"

if not os.path.exists(js_path):
    print("JS layout file not found!")
    exit(1)

with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's search for string literals (e.g. double or single quoted) that contain tailwind classes
# Tailwind classes often contain flex, bg-, text-, border-, grid-, hover:, active:, etc.
tailwind_regex = r'"([^"]*(?:flex|bg-|text-|border-|grid-|hover:|active:|md:|sm:|lg:|rounded-|w-|h-|px-|py-|gap-|justify-)[^"]*)"'
classes = re.findall(tailwind_regex, content)
classes = list(set(classes))

# Let's search for human-readable labels (Chinese text/names)
chinese_regex = r'[\u4e00-\u9fa5]{2,}'
chinese_words = re.findall(chinese_regex, content)
chinese_words = list(set(chinese_words))

# Let's write results to file
with open(output_path, "w", encoding="utf-8") as out:
    out.write("# Layout File Design Analysis\n\n")
    out.write("## Tailwind CSS Classes Found:\n")
    for c in sorted(classes):
        out.write(f"- `{c}`\n")
    out.write("\n## UI Labels Found:\n")
    for w in sorted(chinese_words):
        out.write(f"- {w}\n")

print("Analysis written to layout_design_extracted.txt")
