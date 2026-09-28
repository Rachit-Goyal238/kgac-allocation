import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("<TableHead>Zone</TableHead>", "<TableHead>Zone</TableHead>\n              <TableHead>Rate (INR)</TableHead>")

old_zone = """<TableCell>
                      <input 
                        type="text" 
                        className="border rounded p-1 text-xs w-[80px]" 
                        placeholder="Zone..." 
                        defaultValue={profile.zone || ''}
                        onBlur={e => {
                          if (e.target.value !== (profile.zone || '')) {
                            updateProfile.mutate({ id: profile.id, zone: e.target.value });
                          }
                        }}
                      />
                    </TableCell>"""

new_zone = """<TableCell>
                      <input 
                        type="text" 
                        className="border rounded p-1 text-xs w-[80px]" 
                        placeholder="Zone..." 
                        defaultValue={profile.zone || ''}
                        onBlur={e => {
                          if (e.target.value !== (profile.zone || '')) {
                            updateProfile.mutate({ id: profile.id, zone: e.target.value });
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <input 
                        type="number" 
                        className="border rounded p-1 text-xs w-[80px]" 
                        placeholder="Rate..." 
                        defaultValue={profile.agreed_rate || ''}
                        onBlur={e => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          if (val !== profile.agreed_rate) {
                            updateProfile.mutate({ id: profile.id, agreed_rate: val });
                          }
                        }}
                      />
                    </TableCell>"""

text = text.replace(old_zone, new_zone)

with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: UserManagement updated.")
