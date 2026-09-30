import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# We need to insert the Checkbox TableCell inside <TableRow key={profile.id}>
old_str = """                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">"""

new_str = """                <TableRow key={profile.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedUsers.includes(profile.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedUsers([...selectedUsers, profile.id]);
                        else setSelectedUsers(selectedUsers.filter(id => id !== profile.id));
                      }}
                      aria-label={`Select ${profile.full_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">"""

if old_str in text:
    text = text.replace(old_str, new_str)
    with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully inserted checkbox cell!")
else:
    print("Could not find the exact string to replace. Here is what is around TableRow:")
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if "<TableRow key={profile.id}>" in line:
            for j in range(max(0, i-2), min(len(lines), i+5)):
                print(lines[j])
