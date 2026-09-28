import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = ".lte('allocation_date', endStr)"
new_str = ".lte('allocation_date', endStr)\n          .eq('is_approved', true)"

text = text.replace(import_str, new_str)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/hooks/useManDaysMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import_str2 = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'));"
new_str2 = ".lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'))\n        .eq('is_approved', true);"

text = text.replace(import_str2, new_str2)

with open('src/hooks/useManDaysMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added is_approved filters")
