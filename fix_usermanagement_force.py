import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('placeholder="Zone..."')
if start_idx != -1:
    end_idx = text.find('</TableCell>', start_idx) + 12
    old_block = text[start_idx-160:end_idx]
    
    new_block = old_block + """
                    {isAdmin && (
                    <TableCell>
                      <input 
                        type="number" 
                        className="border rounded p-1 text-xs w-[80px]" 
                        placeholder="Salary..." 
                        defaultValue={profile.monthly_salary || ''}
                        onBlur={e => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          if (val !== profile.monthly_salary) {
                            updateProfile.mutate({ id: profile.id, monthly_salary: val });
                          }
                        }}
                      />
                    </TableCell>
                    )}"""
                    
    text = text.replace(old_block, new_block)
    with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
        print("Success: Injected salary cell.")
else:
    print("Could not find zone cell.")
