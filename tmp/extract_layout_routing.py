import os
import re

js_path = r"d:\missai.me\_next\static\chunks\app\layout-9c195ca71bfe9cd2.js"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\layout_routing_details.txt"

if not os.path.exists(js_path):
    print("JS layout file not found!")
    exit(1)

with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's find matches and extract 100 characters before and after
matches = []
for m in re.finditer(r'"/home"|"/support"|"/announcements"|"/settings"|"/works"|"/favorites"|"/history"|"/creators"', content):
    start = max(0, m.start() - 150)
    end = min(len(content), m.end() + 150)
    matches.append(f"Match for {m.group(0)} at position {m.start()}:\nCONTEXT:\n... {content[start:end]} ...\n")

# Let's write results to file
with open(output_path, "w", encoding="utf-8") as out:
    out.write("# Layout Routing Details\n\n")
    out.write("\n\n".join(matches))

print("Results written to layout_routing_details.txt")
