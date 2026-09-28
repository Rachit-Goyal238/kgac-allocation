import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { LayoutDashboard, CalendarDays, Users, FolderKanban, Settings, LogOut, CheckSquare, Receipt, Calculator, HardHat, FileCheck } from 'lucide-react';"
new_import = "import { LayoutDashboard, CalendarDays, Users, FolderKanban, Settings, LogOut, CheckSquare, Receipt, Calculator, HardHat, FileCheck, Clock } from 'lucide-react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';"
text = text.replace(import_str, new_import)

# Find the bottom section of Sidebar to inject Clock Out
bottom_str = """      <div className="p-4 border-t border-slate-800">
        <Button 
          variant="ghost" """
          
new_bottom = """      <div className="p-4 border-t border-slate-800 space-y-2">
        {ENABLE_ATTENDANCE_SYSTEM && <ClockOutButton user={user} />}
        <Button 
          variant="ghost" """

text = text.replace(bottom_str, new_bottom)

# Add ClockOutButton component at the end
clockout_component = """
function ClockOutButton({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: attendance } = useQuery({
    queryKey: ['attendance', user?.id, today],
    queryFn: async () => {
      const { data } = await supabase.from('attendance').select('*').eq('user_id', user?.id).eq('date', today).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attendance').update({ clock_out: new Date().toISOString() }).eq('id', attendance?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    }
  });

  if (!attendance || attendance.clock_out) return null;

  return (
    <Button 
      variant="outline" 
      className="w-full justify-start text-amber-500 hover:text-amber-600 hover:bg-amber-50/10 border-slate-700 bg-transparent" 
      onClick={() => { if(confirm('Are you sure you want to clock out for the day?')) clockOut.mutate(); }}
      disabled={clockOut.isPending}
    >
      <Clock className="mr-3 h-5 w-5" />
      Clock Out
    </Button>
  );
}
"""

text += clockout_component

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added ClockOutButton to Sidebar")
