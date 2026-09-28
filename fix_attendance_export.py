import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix attendance CSV export roles array
old_export = "Role: d.role,"
new_export = "Role: Array.isArray(d.role) ? d.role.join(', ').replace(/_/g, ' ') : String(d.role || ''),"
text = text.replace(old_export, new_export)

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed AttendancePage CSV export roles")
