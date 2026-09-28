import sys
import re

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Replace any sequence of non-ascii and comma/1 before {totals.
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.revenue\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.cost\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.margin\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.billing\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.teamCost\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{audit\.grossMargin\.toLocaleString\(\)\})', '\u20B9\\2', text)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.revenue\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.cost\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{totals\.margin\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.revenue\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.cost\.toLocaleString\(\)\})', '\u20B9\\2', text)
text = re.sub(r'([^\x00-\x7F]+),?1?(\{proj\.margin\.toLocaleString\(\)\})', '\u20B9\\2', text)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed using safe unicode replacement.")
