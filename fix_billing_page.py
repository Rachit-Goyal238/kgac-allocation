import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Filter allocations for manual projects
old_query = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'));"
new_query = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'))\n        .eq('is_approved', true);"

text = text.replace(old_query, new_query)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated BillingPage.tsx")
