import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("const timeline = [];", "const timeline: any[] = [];")

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed TS error in AttendancePage")
