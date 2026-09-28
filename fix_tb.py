import sys

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Delete Audit bug first
text = text.replace("deleteAudit.mutate(selectedAuditId)", "deleteAudit.mutate(selectedAudit)")

old_ui = """                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
                        value={contactPersonId} onChange={e => setContactPersonId(e.target.value)}>
                        <option value="">-- Select Contact Person --</option>
                        {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                      </select>
                      <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save</Button>
                      </div>"""

new_ui = """                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" 
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
                    <div className="flex justify-end mt-2">
                      <Button size="sm" onClick={handleUpdateContactPerson} disabled={updateAudit.isPending}>Save Details</Button>
                    </div>"""

if old_ui in text:
    text = text.replace(old_ui, new_ui)
    with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success: TeamBuilder UI updated.")
else:
    print("Error: Could not find old_ui in TeamBuilder.tsx")
