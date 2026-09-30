import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add Checkbox import
import_str = "import { Checkbox } from '@/components/ui/checkbox';\n"
text = text.replace("import { Input } from '@/components/ui/input';", import_str + "import { Input } from '@/components/ui/input';")

# Add selectedUsers state
old_state = "const [roleFilter, setRoleFilter] = useState('all');"
new_state = "const [roleFilter, setRoleFilter] = useState('all');\n  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);"
text = text.replace(old_state, new_state)

# Add deleteSelected mutation
old_mut = "const deleteUser = useMutation({"
new_mut = """const deleteSelected = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedUsers.map(id => supabase.rpc('delete_user_by_admin', { target_user_id: id })));
    },
    onSuccess: () => {
      toast.success(`${selectedUsers.length} users deleted`);
      setSelectedUsers([]);
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error('Failed to delete some users');
    }
  });

  const deleteUser = useMutation({"""
text = text.replace(old_mut, new_mut)

# Add button next to CSVUploader
old_csv = "<CSVUploader />"
new_csv = """{selectedUsers.length > 0 && (
          <Button variant="destructive" onClick={() => { if(confirm(`Delete ${selectedUsers.length} users?`)) deleteSelected.mutate(); }} disabled={deleteSelected.isPending}>
            {deleteSelected.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete {selectedUsers.length}
          </Button>
        )}
        <CSVUploader />"""
text = text.replace(old_csv, new_csv)

# Add TableHead checkbox
old_thead = "<TableHead>User</TableHead>"
new_thead = """<TableHead className="w-12">
                <Checkbox 
                  checked={activeProfiles.length > 0 && selectedUsers.length === activeProfiles.length}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedUsers(activeProfiles.map(p => p.id));
                    else setSelectedUsers([]);
                  }}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>User</TableHead>"""
text = text.replace(old_thead, new_thead)

# Add TableCell checkbox (find activeProfiles.map(profile => ( \n <TableRow key={profile.id}>)
old_trow = "{activeProfiles.map((profile) => (\n              <TableRow key={profile.id}>"
new_trow = """{activeProfiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedUsers.includes(profile.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedUsers([...selectedUsers, profile.id]);
                      else setSelectedUsers(selectedUsers.filter(id => id !== profile.id));
                    }}
                    aria-label={`Select ${profile.full_name}`}
                  />
                </TableCell>"""
text = text.replace(old_trow, new_trow)

# Some files might not use (profile) => but profile =>
if old_trow not in text:
    old_trow2 = "{activeProfiles.map(profile => (\n              <TableRow key={profile.id}>"
    new_trow2 = """{activeProfiles.map(profile => (
              <TableRow key={profile.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedUsers.includes(profile.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedUsers([...selectedUsers, profile.id]);
                      else setSelectedUsers(selectedUsers.filter(id => id !== profile.id));
                    }}
                    aria-label={`Select ${profile.full_name}`}
                  />
                </TableCell>"""
    text = text.replace(old_trow2, new_trow2)


with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated UserManagement.tsx with multi-select deletion")
