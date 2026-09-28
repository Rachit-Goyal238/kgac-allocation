import sys
import re

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Delete Audit bug
text = text.replace("deleteAudit.mutate(selectedAuditId)", "deleteAudit.mutate(selectedAudit)")

# Update handleUpdateContactPerson
text = re.sub(
    r"updateAudit\.mutate\(\{\s*id: selectedAuditId,\s*contact_person_id: contactPersonId \|\| null\s*\}, \{\s*onSuccess: \(\) => toast\.success\('Contact person updated'\)\s*\}\);",
    "updateAudit.mutate({ id: selectedAuditId, contact_person_id: contactPersonId || null, billing_amount: billingAmount ? Number(billingAmount) : 0 }, {\n      onSuccess: () => toast.success('Audit details updated')\n    });",
    text
)

# Replace UI
pattern = r'(<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"\s+value=\{contactPersonId\} onChange=\{e => setContactPersonId\(e\.target\.value\)\}>\s+<option value="">-- Select Contact Person --</option>\s+\{employees\?\.map\(\(emp: any\) => <option key=\{emp\.id\} value=\{emp\.id\}>\{emp\.full_name\}</option>\)\}\s+</select>)\s+<Button size="sm" onClick=\{handleUpdateContactPerson\} disabled=\{updateAudit\.isPending\}>Save</Button>\s+</div>'

new_ui = r"""\1
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

text = re.sub(pattern, new_ui, text)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: TeamBuilder updated.")
