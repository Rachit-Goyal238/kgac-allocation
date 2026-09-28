import sys

with open('src/pages/ReconciliationPage.tsx', 'rb') as f:
    raw = f.read()

# If it starts with UTF-16 LE BOM (ff fe)
if raw.startswith(b'\xff\xfe'):
    text = raw.decode('utf-16le')
elif raw.startswith(b'\xfe\xff'):
    text = raw.decode('utf-16be')
else:
    text = raw.decode('utf-8', errors='replace')

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Fixed encoding.")
