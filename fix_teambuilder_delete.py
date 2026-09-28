import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_click = """<Button variant="destructive" size="sm" onClick={() => {
                if(confirm('Delete this audit entirely?')) deleteAudit.mutate(selectedAudit);
                }}>"""

new_click = """<Button variant="destructive" size="sm" onClick={() => {
                if(confirm('Delete this audit entirely?')) {
                  deleteAudit.mutate(selectedAudit);
                  setSelectedAuditId(null);
                  sessionStorage.removeItem('teamBuilderAuditId');
                }
                }}>"""

text = text.replace(old_click, new_click)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: TeamBuilder delete logic fixed.")
