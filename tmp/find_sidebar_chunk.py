import os
import re

chunks_dir = r"d:\missai.me\_next\static\chunks"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\found_sidebar_chunks.txt"

results = []

def search_dir(d):
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith(".js"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    if "/creative-plaza" in content or "/favorites" in content:
                        # Find occurrences of tailwind classes or URLs
                        rel_path = os.path.relpath(path, chunks_dir)
                        results.append(f"Found in {rel_path}")
                        
                        # Find surrounding characters of /favorites or /creative-plaza
                        for match in re.finditer(r'"[^"]*/favorites[^"]*"', content):
                            results.append(f"  Match: {match.group(0)}")
                except Exception as e:
                    pass

search_dir(chunks_dir)

with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print("Search completed. Results written to found_sidebar_chunks.txt")
