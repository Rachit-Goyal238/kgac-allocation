import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

sort_str = "return (report as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name));"
new_sort = "return report;"
text = text.replace(sort_str, new_sort)

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed sort")
