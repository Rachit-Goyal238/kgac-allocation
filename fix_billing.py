import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("id, store_name, audit_date,", "id, store_name, audit_date, end_date,")

old_date = "audit_date: audit.audit_date,"
new_date = "audit_date: audit.end_date && audit.end_date !== audit.audit_date ? `${audit.audit_date} to ${audit.end_date}` : audit.audit_date,"

text = text.replace(old_date, new_date)

with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useBillingMetrics updated.")
