import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(".neq('status', 'draft')", ".eq('status', 'completed')")

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated ReconciliationPage")
