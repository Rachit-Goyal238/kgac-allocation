import sys

with open('src/lib/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("zone?: string | null;", "zone?: string | null;\n  agreed_rate?: number | null;")

with open('src/lib/types.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: types.ts updated.")
