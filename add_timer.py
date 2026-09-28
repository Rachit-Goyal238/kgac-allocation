import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';"
new_import = "import { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';\nimport { useState, useEffect } from 'react';"
text = text.replace(import_str, new_import)

# Find the ClockOutButton component and replace it
clockout_search = """function ClockOutButton({ user }: { user: any }) {
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
}"""

clockout_replace = """function ClockOutButton({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];
  const [elapsed, setElapsed] = useState('');

  const { data: attendance } = useQuery({
    queryKey: ['attendance', user?.id, today],
    queryFn: async () => {
      const { data } = await supabase.from('attendance').select('*').eq('user_id', user?.id).eq('date', today).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (!attendance || !attendance.clock_in || attendance.clock_out) return;
    
    const interval = setInterval(() => {
      const start = new Date(attendance.clock_in).getTime();
      const now = new Date().getTime();
      const diff = now - start;
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [attendance]);

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
    <div className="flex flex-col space-y-2 mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center text-slate-300 text-sm">
        <span className="flex items-center"><Clock className="w-4 h-4 mr-2 text-emerald-400" /> Working</span>
        <span className="font-mono font-medium tracking-wider">{elapsed || '00:00:00'}</span>
      </div>
      <Button 
        variant="outline" 
        className="w-full text-amber-500 hover:text-amber-600 hover:bg-amber-50/10 border-slate-600 bg-transparent h-8 text-xs" 
        onClick={() => { if(confirm('Are you sure you want to clock out for the day?')) clockOut.mutate(); }}
        disabled={clockOut.isPending}
      >
        Clock Out
      </Button>
    </div>
  );
}"""

text = text.replace(clockout_search, clockout_replace)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added running timer to ClockOutButton")
