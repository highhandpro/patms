import os

for root, dirs, files in os.walk(r"C:\Users\thufl\.gemini\antigravity\scratch\patms\src"):
    for file in files:
        if file.endswith((".ts", ".tsx", ".css")):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if "08d90d" in content:
                print(f"Found in: {path}")
