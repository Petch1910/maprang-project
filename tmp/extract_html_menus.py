import os
import re
from bs4 import BeautifulSoup

dir_path = r"d:\missai.me"
html_files = [f for f in os.listdir(dir_path) if f.endswith(".html")]

print(f"Found {len(html_files)} HTML files:")

for file_name in html_files:
    file_path = os.path.join(dir_path, file_name)
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We can try to extract navigation links or headers
    soup = BeautifulSoup(content, "html.parser")
    
    # Let's find links
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True)
        if href and not href.startswith("http") and not href.startswith("#"):
            links.append((href, text))
            
    print(f"\n--- File: {file_name} ---")
    print("Links found:")
    for href, text in list(set(links))[:15]:
        print(f"  {text} -> {href}")
