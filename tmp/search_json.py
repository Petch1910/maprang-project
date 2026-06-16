import json
import os

json_path = r"C:\Users\Phet\.gemini\antigravity\brain\7a66042c-9b2a-46d0-b749-7fc30b3f3403\scratch\missai_all_design.json"
output_path = r"C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\tmp\search_results.txt"

if not os.path.exists(json_path):
    with open(output_path, 'w', encoding='utf-8') as out:
        out.write("Design JSON file not found!")
    exit(1)

with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Chinese keywords for: Favorites, History, Settings, Announcements, Support/Help, Works
keywords = ["收藏", "历史", "设置", "公告", "客服", "帮助", "作品"]
results = []
results.append(f"Total chunks in JSON: {len(data)}")

for item in data:
    found = []
    file_name = item.get("file", "")
    for k in keywords:
        for text in item.get("chinese", []):
            if k in text:
                found.append(f"chinese ({k}): {text}")
    if found:
        results.append(f"\nFile: {file_name}")
        for f_item in found:
            results.append(f"  {f_item}")

with open(output_path, 'w', encoding='utf-8') as out:
    out.write("\n".join(results))

print("Results written to search_results.txt")
