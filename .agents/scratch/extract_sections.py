file_path = r"c:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\memory\working-context.md"
output_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\context_sections.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for "ขั้นตอนสำคัญถัดไป", "เป้าหมายปัจจุบัน", "งานที่ต้องทำ"
sections = ["ขั้นตอนสำคัญถัดไป", "เป้าหมายปัจจุบัน", "งานที่ต้องทำ", "Next Steps"]
extracted = []

for sec in sections:
    idx = content.find(sec)
    if idx != -1:
        start = max(0, idx - 100)
        end = min(len(content), idx + 2000)
        extracted.append(f"SECTION: {sec}\n...\n{content[start:end]}\n...\n" + "="*80)

with open(output_path, 'w', encoding='utf-8') as out:
    out.write('\n\n'.join(extracted))

print("Sections extracted successfully!")
