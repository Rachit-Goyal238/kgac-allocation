import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("{!selectedAuditId ? (", "{!selectedAudit ? (")

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: TeamBuilder selectedAudit fixed.")
