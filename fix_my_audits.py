import sys

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

sig_str = "export function MyUpcomingAudits() {"
new_sig = "export function MyUpcomingAudits({ startDate, endDate }: { startDate?: string, endDate?: string }) {"
text = text.replace(sig_str, new_sig)

query_key_str = "queryKey: ['my_audits', user?.id],"
new_query_key = "queryKey: ['my_audits', user?.id, startDate, endDate],"
text = text.replace(query_key_str, new_query_key)

query_str = """      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('audit_teams')
        .select(`
          role,
          audit:audits!inner(
            id, store_name, store_code, location, audit_date, end_date, status, audit_type,
            client:clients(name)
          )
        `)
        .eq('user_id', user?.id)
        .gte('audit.audit_date', today)"""

new_query_str = """      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('audit_teams')
        .select(`
          role,
          audit:audits!inner(
            id, store_name, store_code, location, audit_date, end_date, status, audit_type,
            client:clients(name)
          )
        `)
        .eq('user_id', user?.id);

      if (startDate) query = query.gte('audit.audit_date', startDate);
      else query = query.gte('audit.audit_date', today);
      
      if (endDate) query = query.lte('audit.audit_date', endDate);
      
      const { data, error } = await query"""

text = text.replace(query_str, new_query_str)

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated MyUpcomingAudits")
