import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix hasAnyRole check
text = text.replace("hasAnyRole(user, ['admin', 'super_admin', 'manager', 'hr'])", "hasAnyRole(profile, ['admin', 'super_admin', 'manager', 'hr'])")

# Fix ClockOutButton usage
text = text.replace("<ClockOutButton user={user} />", "<ClockOutButton user={profile} />")

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed user variable reference in Sidebar")
