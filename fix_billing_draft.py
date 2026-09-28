import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(".lte('audit_date', format(dateRange.end, 'yyyy-MM-dd'));", ".lte('audit_date', format(dateRange.end, 'yyyy-MM-dd'))\n        .neq('status', 'draft');")

with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useBillingMetrics updated.")
