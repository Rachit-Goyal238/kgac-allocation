import re

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Delete Audit bug
text = text.replace("deleteAudit.mutate(selectedAuditId)", "deleteAudit.mutate(selectedAudit)")

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
