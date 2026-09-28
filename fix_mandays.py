import sys
import re

with open('src/hooks/useManDaysMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add end_date to select
text = text.replace("audit:audits(id, audit_date, project_id, project:projects(name))", "audit:audits(id, audit_date, end_date, project_id, project:projects(name))")

# Update calculation loop
old_loop = """        // Add team man-days (1 assignment = 1 man-day, excluding assets)
        auditTeams?.forEach(t => {
          if (t.role === 'asset') return; // Do not count physical assets as man-days!
          
          const audit = t.audit as any;
          if (!audit || !audit.audit_date) return;
          
          // Check date range
          const auditDate = new Date(audit.audit_date);
          if (auditDate < dateRange.start || auditDate > dateRange.end) return;
  
          totalManDays += 1;
          if (t.vendor_id) {
            externalManDays += 1;
          } else if (t.user_id) {
            internalManDays += 1;
          }"""

new_loop = """        // Add team man-days (excluding assets)
        auditTeams?.forEach(t => {
          if (t.role === 'asset') return; // Do not count physical assets as man-days!
          
          const audit = t.audit as any;
          if (!audit || !audit.audit_date) return;
          
          // Check date range
          const auditDate = new Date(audit.audit_date);
          if (auditDate < dateRange.start || auditDate > dateRange.end) return;
          
          let days = 1;
          if (audit.end_date) {
            const diffTime = Math.abs(new Date(audit.end_date).getTime() - auditDate.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }
  
          totalManDays += days;
          if (t.vendor_id) {
            externalManDays += days;
          } else if (t.user_id) {
            internalManDays += days;
          }"""

text = text.replace(old_loop, new_loop)

# Update map additions
text = text.replace("projectMap[projId].total += 1;", "projectMap[projId].total += days;")
text = text.replace("if (t.vendor_id) projectMap[projId].external += 1;", "if (t.vendor_id) projectMap[projId].external += days;")
text = text.replace("else if (t.user_id) projectMap[projId].internal += 1;", "else if (t.user_id) projectMap[projId].internal += days;")

text = text.replace("monthMap[monthStr].total += 1;", "monthMap[monthStr].total += days;")
text = text.replace("if (t.vendor_id) monthMap[monthStr].external += 1;", "if (t.vendor_id) monthMap[monthStr].external += days;")
text = text.replace("else if (t.user_id) monthMap[monthStr].internal += 1;", "else if (t.user_id) monthMap[monthStr].internal += days;")

with open('src/hooks/useManDaysMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useManDaysMetrics updated.")
