file_path = r"c:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\memory\deploy-blockers.md"
output_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\blockers_summary.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for blockers that are NOT resolved or currently active
lines = content.split('\n')
extracted = []
current_blocker = []
recording = False

for line in lines:
    if line.startswith('#'):
        if current_blocker:
            extracted.append('\n'.join(current_blocker))
            current_blocker = []
        extracted.append(line)
    elif '- [ ]' in line or '- [/]' in line or 'blocker' in line.lower() or 'active' in line.lower():
        current_blocker.append(line)

if current_blocker:
    extracted.append('\n'.join(current_blocker))

with open(output_path, 'w', encoding='utf-8') as out:
    out.write('\n'.join(extracted))

print("Blockers summary generated!")
