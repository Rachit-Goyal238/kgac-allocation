import re

with open('src/components/planner/AuditImportTool.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_csv = 'data:text/csv;charset=utf-8,Store Name,Store Code,Location,Audit Date (DD-MM-YYYY),Audit Type,Billing Amount,Required Leads,Required Executives\\nDemo Store,DEMO-001,New York,25-10-2026,General,1500,1,2'
new_csv = 'data:text/csv;charset=utf-8,Store Name,Store Code,Location,Audit Date (DD-MM-YYYY),End Date (DD-MM-YYYY),Audit Type,Billing Amount,Required Leads,Required Executives\\nDemo Store,DEMO-001,New York,25-10-2026,28-10-2026,General,1500,1,2'
text = text.replace(old_csv, new_csv)

with open('src/components/planner/AuditImportTool.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
