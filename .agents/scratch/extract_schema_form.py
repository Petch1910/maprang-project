file_path = r"d:\missai.me\_next\static\chunks\app\(ai-image)\ai-creator\page-c27e6b1d502d8d9e.js"
output_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\js_schema_form.txt"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for "function T("
start_idx = content.find("function T(e){let{schem")
if start_idx != -1:
    end_idx = min(len(content), start_idx + 4000)
    context = content[start_idx:end_idx]
else:
    context = "Not found"

with open(output_path, 'w', encoding='utf-8') as out:
    out.write(context)

print("Done writing js_schema_form.txt")
