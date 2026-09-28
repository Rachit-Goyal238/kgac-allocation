import sys

with open('src/components/planner/AuditImportTool.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("status: 'scheduled',", "status: 'draft',")

with open('src/components/planner/AuditImportTool.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: AuditImportTool status updated to draft.")
