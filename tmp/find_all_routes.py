import os
import re

chunks_dir = r"d:\missai.me\_next\static\chunks"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\found_routes_chunks.txt"

results = []

def search_dir(d):
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith(".js"):
                path = os.path.join(root, file)
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    found_keys = []
                    if '"/home"' in content or "'/home'" in content:
                        found_keys.append("/home")
                    if '"/ai-creator"' in content or "'/ai-creator'" in content:
                        found_keys.append("/ai-creator")
                    if '"/announcements"' in content or "'/announcements'" in content:
                        found_keys.append("/announcements")
                    if '"/settings"' in content or "'/settings'" in content:
                        found_keys.append("/settings")
                    if '"/works"' in content or "'/works'" in content:
                        found_keys.append("/works")
                    if '"/support"' in content or "'/support'" in content:
                        found_keys.append("/support")
                    if '"/favorites"' in content or "'/favorites'" in content:
                        found_keys.append("/favorites")

                    if len(found_keys) >= 2:
                        rel_path = os.path.relpath(path, chunks_dir)
                        results.append(f"Found in {rel_path} with keys: {found_keys}")
                        
                        # Find surrounding context of menu definition
                        # Let's extract lines that contain these routes
                        for key in found_keys:
                            for match in re.finditer(r'"[^"]*' + re.escape(key) + r'[^"]*"', content):
                                results.append(f"  {key} context: {match.group(0)}")
                except Exception as e:
                    pass

search_dir(chunks_dir)

with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print("Search completed. Results written to found_routes_chunks.txt")
