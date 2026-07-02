with open(r"C:\Users\thufl\.gemini\antigravity\scratch\patms\src\pages\Standings.tsx", 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.splitlines()
for idx, line in enumerate(lines):
    if "tournaments" in line.lower() or "points" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
