import re

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add state for billing amount
text = text.replace("const [contactPersonId, setContactPersonId] = useState<string>('');", "const [contactPersonId, setContactPersonId] = useState<string>('');\n  const [billingAmount, setBillingAmount] = useState<string>('');")

# Initialize it
init_old = """    if (selectedAuditId && audits) {
      const a = audits.find((a: any) => a.id === selectedAuditId);
      if (a && a.contact_person_id) {
        setContactPersonId(a.contact_person_id);
      } else {
        setContactPersonId('');
      }
    }"""
init_new = """    if (selectedAuditId && audits) {
      const a = audits.find((a: any) => a.id === selectedAuditId);
      if (a) {
        setContactPersonId(a.contact_person_id || '');
        setBillingAmount(a.billing_amount ? a.billing_amount.toString() : '');
      } else {
        setContactPersonId('');
        setBillingAmount('');
      }
    }"""
text = text.replace(init_old, init_new)

# Add save handler
handler_old = """  const handleUpdateContactPerson = async () => {
    if (!selectedAuditId) return;
    updateAudit.mutate({ id: selectedAuditId, contact_person_id: contactPersonId || null }, {
      onSuccess: () => toast.success('Contact person updated')
    });
  };"""
handler_new = """  const handleUpdateContactPerson = async () => {
    if (!selectedAuditId) return;
    updateAudit.mutate({ 
      id: selectedAuditId, 
      contact_person_id: contactPersonId || null,
      billing_amount: billingAmount ? Number(billingAmount) : 0
    }, {
      onSuccess: () => toast.success('Audit details updated')
    });
  };"""
text = text.replace(handler_old, handler_new)

# Update UI
ui_old = """                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-muted-foreground w-1/4">Contact Person</label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                        value={contactPersonId} onChange={e => setContactPersonId(e.target.value)}>
                        <option value="">-- Select Contact Person --</option>
                        {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                      </select>
                      <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save</Button>
                      </div>
                      <div className="pt-2 mt-2 border-t flex justify-end">"""
ui_new = """                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-muted-foreground w-1/4">Contact Person</label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                        value={contactPersonId} onChange={e => setContactPersonId(e.target.value)}>
                        <option value="">-- Select Contact Person --</option>
                        {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-muted-foreground w-1/4">Client Revenue (₹)</label>
                      <div className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm items-center">
                        <span className="text-muted-foreground mr-2">₹</span>
                        <input type="number" className="bg-transparent border-0 outline-none w-full" 
                          value={billingAmount} onChange={e => setBillingAmount(e.target.value)} placeholder="0.00" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save Details</Button>
                    </div>
                    <div className="pt-2 mt-2 border-t flex justify-end">"""
text = text.replace(ui_old, ui_new)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
