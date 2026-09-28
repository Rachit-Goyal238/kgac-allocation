import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("id, store_name, store_code, audit_date, status, billing_amount,", "id, store_name, store_code, audit_date, end_date, status, billing_amount,")

old_date = "date: audit.audit_date,"
new_date = "date: audit.end_date && audit.end_date !== audit.audit_date ? `${audit.audit_date} to ${audit.end_date}` : audit.audit_date,"
text = text.replace(old_date, new_date)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: ReconciliationPage updated.")
