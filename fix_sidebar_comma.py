import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("Monitor\n  CheckSquare", "Monitor,\n  CheckSquare")

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed comma")
