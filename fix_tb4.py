import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add useEffect for initial sync
if "useEffect(() => {" not in text:
    text = text.replace("export function TeamBuilder() {\n  const queryClient = useQueryClient();", "import { useEffect } from 'react';\n\nexport function TeamBuilder() {\n  const queryClient = useQueryClient();")
    
    sync_logic = """  useEffect(() => {
    if (selectedAudit) {
      setContactPersonId(selectedAudit.contact_person_id || '');
      setBillingAmount(selectedAudit.billing_amount ? selectedAudit.billing_amount.toString() : '');
    }
  }, [selectedAuditId, selectedAudit?.contact_person_id, selectedAudit?.billing_amount]);

  const assignedLeads"""
    
    text = text.replace("  const assignedLeads", sync_logic)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useEffect added.")
