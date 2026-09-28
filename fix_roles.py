import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(".select('id, full_name, role, department:departments(name)')", ".select('id, full_name, roles, department:departments(name)')")
text = text.replace("role: p.role,", "role: p.roles,")

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed roles TS in AttendancePage")
