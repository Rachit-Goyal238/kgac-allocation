import sys

with open('src/hooks/useManDaysMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "audit:audits(id, audit_date, end_date, project_id, project:projects(name))"
new_import = "audit:audits(id, audit_date, end_date, project_id, status, project:projects(name))"
text = text.replace(import_str, new_import)

filter_str = "if (!audit || !audit.audit_date) return;"
new_filter = "if (!audit || !audit.audit_date || audit.status !== 'completed') return;"
text = text.replace(filter_str, new_filter)

with open('src/hooks/useManDaysMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated useManDaysMetrics")
