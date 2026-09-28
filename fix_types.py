import sys

with open('src/lib/types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("agreed_rate?: number | null;", "agreed_rate?: number | null;\n  monthly_salary?: number | null;")

with open('src/lib/types.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: types.ts updated.")
