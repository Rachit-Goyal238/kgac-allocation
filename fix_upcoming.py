import sys
import re

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update select query
text = text.replace("id, store_name, store_code, location, audit_date, status, audit_type,", "id, store_name, store_code, location, audit_date, end_date, status, audit_type,")

# Update rendering
old_span = "<span className=\"text-sm font-medium\">{format(new Date(audit.audit_date), 'MMM d, yyyy')}</span>"
new_span = "<span className=\"text-sm font-medium\">{format(new Date(audit.audit_date), 'MMM d')} {audit.end_date && audit.end_date !== audit.audit_date ? `- ${format(new Date(audit.end_date), 'MMM d, yyyy')}` : `, ${format(new Date(audit.audit_date), 'yyyy')}`}</span>"

text = text.replace(old_span, new_span)

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: MyUpcomingAudits updated.")
