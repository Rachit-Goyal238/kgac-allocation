import re

with open('src/pages/PlannerPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# First we need to make sure end_date is selected
text = text.replace("store_name,\n            audit_date,\n            created_at,", "store_name,\n            audit_date,\n            end_date,\n            created_at,")

# Then update the display logic
old_line = "{audit.clients?.name} | {format(new Date(audit.audit_date), 'MMM d, yyyy')}"
new_line = "{audit.clients?.name} | {format(new Date(audit.audit_date), 'MMM d')} {audit.end_date && audit.end_date !== audit.audit_date ? `- ${format(new Date(audit.end_date), 'MMM d, yyyy')}` : `, ${format(new Date(audit.audit_date), 'yyyy')}`}"
text = text.replace(old_line, new_line)

with open('src/pages/PlannerPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
