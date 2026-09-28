import sys
import re

with open('src/pages/CompletionPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Update fetch query
text = text.replace("let q = supabase.from('allocations').select('*, projects(name), profiles!inner(full_name, zone)')", "let q = supabase.from('allocations').select('*, projects(name), audits(store_name), profiles!inner(full_name, zone)')")

# Update grouping logic
old_group = """  const projectGroups = allocations.reduce((acc: any, a) => {
    const projId = a.project_id;
    if (!acc[projId]) {
      acc[projId] = { name: a.projects?.name || 'Unknown', total: 0, completed: 0, inProgress: 0, notStarted: 0, blocked: 0 };
    }"""

new_group = """  const projectGroups = allocations.reduce((acc: any, a) => {
    const projId = a.audit_id || a.project_id || 'unknown';
    if (!acc[projId]) {
      acc[projId] = { name: a.audits?.store_name || a.projects?.name || 'Unknown', total: 0, completed: 0, inProgress: 0, notStarted: 0, blocked: 0 };
    }"""

text = text.replace(old_group, new_group)

with open('src/pages/CompletionPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: CompletionPage updated.")
