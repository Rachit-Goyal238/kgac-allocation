import sys

with open('src/pages/CompletionPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix dateRange to addMonths
text = text.replace("end: new Date() });", "end: new Date(new Date().setMonth(new Date().getMonth() + 1)) });")

# Filter out non-billable / leave allocations
old_query = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'));"
new_query = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'))\n          .neq('status', 'pto')\n          .neq('status', 'sick')\n          .neq('status', 'public_holiday');"

text = text.replace(old_query, new_query)

with open('src/pages/CompletionPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed CompletionPage.tsx filters")
