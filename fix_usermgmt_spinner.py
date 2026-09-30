import sys

with open('src/components/admin/UserManagement.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_loading = """  if (profilesLoading || deptsLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;"""
new_loading = """  if ((profilesLoading && !profiles) || (deptsLoading && departments.length === 0)) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;"""

text = text.replace(old_loading, new_loading)

with open('src/components/admin/UserManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed UserManagement spinner")
