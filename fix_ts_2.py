import sys

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

picker_str = "<DateRangePicker value={dateRange} onChange={(start, end) => setDateRange({ start, end })} />"
new_picker = "<DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onChange={(start, end) => setDateRange({ start, end })} />"
text = text.replace(picker_str, new_picker)

sort_str = "return report.sort((a: any, b: any) => a.name.localeCompare(b.name));"
new_sort = "return (report as any[]).sort((a: any, b: any) => a.name.localeCompare(b.name));"
text = text.replace(sort_str, new_sort)

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed DateRangePicker props")
