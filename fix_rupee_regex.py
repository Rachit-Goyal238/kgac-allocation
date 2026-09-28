import sys
import re

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace any non-ascii before {totals.
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.revenue\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.cost\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.margin\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.billing\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.teamCost\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.grossMargin\.toLocaleString\(\)\})', r'₹\2', text)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.revenue\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.cost\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.margin\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.revenue\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.cost\.toLocaleString\(\)\})', r'₹\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.margin\.toLocaleString\(\)\})', r'₹\2', text)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed using regex.")
