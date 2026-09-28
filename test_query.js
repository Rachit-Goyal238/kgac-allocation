import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zzhgooxsuljipydztzfg.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aGdvb3hzdWxqaXB5ZHp0emZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNjE3NTEsImV4cCI6MjEwMzczNzc1MX0.RK9zh4ZZch4swc2dI8L9che88ZAvxdAjMM1PcMxvP2g";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('allocations')
    .select(`
      *,
      profile:profiles!inner(full_name, email, role),
      project:projects(name),
      audit:audits(store_name)
    `)
    .eq('is_approved', false)
    .lte('allocation_date', '2026-09-28');
    
  console.log("Data:", data);
  console.log("Error:", error);
}

check();
