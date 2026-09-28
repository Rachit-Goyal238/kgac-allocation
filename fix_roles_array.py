import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix: roles is an array, so join and display nicely
text = text.replace(
    "{row.role.replace('_', ' ')}",
    "{Array.isArray(row.role) ? row.role.join(', ').replace(/_/g, ' ') : String(row.role || '').replace(/_/g, ' ')}"
)

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed role.replace crash")
