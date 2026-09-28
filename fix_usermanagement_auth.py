import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add useAuthContext to imports
import_stmt = "import { useAuthContext } from '@/contexts/AuthContext';"
if import_stmt not in text:
    text = text.replace("import { Trash2 } from 'lucide-react';", f"import {{ Trash2 }} from 'lucide-react';\n{import_stmt}")

# Get roles and is admin
text = text.replace("const [roleFilter, setRoleFilter] = useState('all');", """const [roleFilter, setRoleFilter] = useState('all');
  
  const { profile: currentUser } = useAuthContext();
  const isAdmin = currentUser?.roles?.includes('admin') || currentUser?.roles?.includes('super_admin');""")

# Replace headers
text = text.replace("<TableHead>Rate (INR)</TableHead>", "{isAdmin && <TableHead>Salary/Mo (INR)</TableHead>}")

# Replace cell
old_rate = """<TableCell>
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

new_rate = """{isAdmin && (
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

text = text.replace(old_rate, new_rate)

with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: UserManagement auth and salary updated.")
