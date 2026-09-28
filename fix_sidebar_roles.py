import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("hasAnyRole(profile, ['admin', 'super_admin', 'manager', 'hr'])", "hasAnyRole(roles, ['admin', 'super_admin', 'manager', 'hr'])")

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed hasAnyRole TS issue in Sidebar")
