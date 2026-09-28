import sys
import re

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Replace any occurrence of the mangled Rupee symbol (either ,1 or â,¹ or anything resembling it before numbers)
# Let's just find where it's used
text = text.replace(',1', '₹')
text = text.replace('â,¹', '₹')

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Fixed Rupee symbol in ReconciliationPage.")
    
with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = text.replace(',1', '₹')
text = text.replace('â,¹', '₹')

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Fixed Rupee symbol in BillingPage.")
