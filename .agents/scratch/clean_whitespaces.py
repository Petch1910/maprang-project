file_path = r"c:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project\apps\frontend\src\pages\AICreatorPage.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

cleaned_lines = [line.rstrip() + "\n" for line in lines]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(cleaned_lines)

print("Trailing whitespaces removed successfully!")
