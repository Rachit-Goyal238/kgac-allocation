import sys

with open('src/hooks/useManDaysMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# I will replace the entire auditTeams loop.
start_idx = text.find('auditTeams?.forEach(t => {')
end_idx = text.find('        });\n\n        return {', start_idx)

if start_idx != -1 and end_idx != -1:
    old_loop = text[start_idx:end_idx]
    
    new_loop = """auditTeams?.forEach(t => {
          if (t.role === 'asset') return;
          
          const audit = t.audit as any;
          if (!audit || !audit.audit_date) return;
          
          const auditDate = new Date(audit.audit_date);
          if (auditDate < dateRange.start || auditDate > dateRange.end) return;
  
          let days = 1;
          if (audit.end_date) {
            const diffTime = Math.abs(new Date(audit.end_date).getTime() - auditDate.getTime());
            days = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }

          totalManDays += days;
          if (t.vendor_id) {
            externalManDays += days;
          } else if (t.user_id) {
            internalManDays += days;
          }
  
          const projId = audit.project_id || 'unassigned_vendor';
          if (!projectMap[projId]) {
            projectMap[projId] = { project_id: projId, project_name: audit.project?.name || 'Audit Project', total: 0, internal: 0, external: 0 };
          }
          projectMap[projId].total += days;
          if (t.vendor_id) {
            projectMap[projId].external += days;
          } else if (t.user_id) {
            projectMap[projId].internal += days;
          }
  
          const monthStr = auditDate.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!monthMap[monthStr]) {
            monthMap[monthStr] = { month: monthStr, total: 0, internal: 0, external: 0 };
          }
          monthMap[monthStr].total += days;
          if (t.vendor_id) {
            monthMap[monthStr].external += days;
          } else if (t.user_id) {
            monthMap[monthStr].internal += days;
          }
"""
    text = text.replace(old_loop, new_loop)
    
    with open('src/hooks/useManDaysMetrics.ts', 'w', encoding='utf-8') as f:
        f.write(text)
        print("Success: useManDaysMetrics updated.")
else:
    print("Could not find loop.")
