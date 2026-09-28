import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('₹', '₹')

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('₹', '₹')

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed Rupee symbol completely.")
