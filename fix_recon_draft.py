import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(".lte('audit_date', endStr)", ".lte('audit_date', endStr)\n        .neq('status', 'draft')")

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: ReconciliationPage updated.")
