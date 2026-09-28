import re

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update sidebar dates
old_sidebar_date = "{format(new Date(audit.audit_date), 'MMM d, yyyy')}"
new_sidebar_date = "{format(new Date(audit.audit_date), 'MMM d')} {audit.end_date && audit.end_date !== audit.audit_date ? `- ${format(new Date(audit.end_date), 'MMM d, yyyy')}` : `, ${format(new Date(audit.audit_date), 'yyyy')}`}"
text = text.replace(old_sidebar_date, new_sidebar_date)

# Update header date
old_header_date = "Audit Date: {format(new Date(selectedAudit?.audit_date || new Date()), 'MMMM d, yyyy')}"
new_header_date = "Date(s): {format(new Date(selectedAudit?.audit_date || new Date()), 'MMM d, yyyy')} {selectedAudit?.end_date && selectedAudit.end_date !== selectedAudit.audit_date ? `- ${format(new Date(selectedAudit.end_date), 'MMM d, yyyy')}` : ''}"
text = text.replace(old_header_date, new_header_date)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
