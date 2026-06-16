import re

file_path = r"c:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\memory\working-context.md"
output_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\context_summary.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's extract the headings and any section with TODOs, list items, or next steps
lines = content.split('\n')
extracted = []
current_section = []
recording = False

for line in lines:
    if line.startswith('#'):
        if current_section:
            extracted.append('\n'.join(current_section))
            current_section = []
        extracted.append(line)
    elif '- [ ]' in line or '- [/]' in line or 'todo' in line.lower() or 'task' in line.lower() or 'priority' in line.lower():
        current_section.append(line)

if current_section:
    extracted.append('\n'.join(current_section))

with open(output_path, 'w', encoding='utf-8') as out:
    out.write('\n'.join(extracted))

print("Context summary generated!")
