import re

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("{profile.phone_number || \\'-\\'}", "{profile.phone_number || '-'}")

with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
