file_path = r"d:\missai.me\_next\static\css\9da64f20907973e3.css"
output_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\theme_vars.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for ":root" and print the content inside it.
import re
root_matches = re.findall(r':root\s*\{([^\}]+)\}', content)

with open(output_path, 'w', encoding='utf-8') as out:
    for idx, match in enumerate(root_matches):
        out.write(f"Match {idx+1}:\n{match}\n" + "="*50 + "\n")

print(f"Extracted {len(root_matches)} :root blocks.")
