import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(".neq('status', 'draft')", ".eq('status', 'completed')")

with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated useBillingMetrics")
