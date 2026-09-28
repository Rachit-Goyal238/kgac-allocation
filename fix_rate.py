import re

with open('src/components/admin/VendorResourceImporter.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the rateRaw bug
text = text.replace("r['Default Rate,Contact Email']", "r['Default Rate']")

with open('src/components/admin/VendorResourceImporter.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
