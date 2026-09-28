import re

with open('src/components/admin/VendorResourceImporter.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the template string
old_csv = '"Provider Name,Resource Name,Type (man/asset),Default Rate,Contact Email\\nDeloitte,John Smith,man,500\\nDeloitte,Dell Laptop,asset,100\\nFreelance Auditor A,Freelance Auditor A,man,450,freelance@test.com"'
new_csv = '"Provider Name,Resource Name,Type (man/asset),Default Rate,Contact Email\\nDeloitte,John Smith,man,500,\\nDeloitte,Dell Laptop,asset,100,\\nFreelance Auditor A,Freelance Auditor A,man,450,freelance@test.com"'
text = text.replace(old_csv, new_csv)

with open('src/components/admin/VendorResourceImporter.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
