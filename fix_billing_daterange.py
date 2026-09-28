import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_range = "useState({ start: subMonths(new Date(), 1), end: new Date() });"
new_range = "useState({ start: subMonths(new Date(), 1), end: addMonths(new Date(), 1) });"

text = text.replace(old_range, new_range)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Fixed dateRange in BillingPage.tsx")
