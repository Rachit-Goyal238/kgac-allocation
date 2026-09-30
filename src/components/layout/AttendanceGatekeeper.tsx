import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Clock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';

export function AttendanceGatekeeper({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const { data: attendance, isLoading: isLoadingAttendance } = useQuery({
    queryKey: ['attendance', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user && ENABLE_ATTENDANCE_SYSTEM
  });

  const { data: todayLeave, isLoading: isLoadingLeave } = useQuery({
    queryKey: ['today_leave', user?.id, today],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('allocations')
        .select('status, is_approved')
        .eq('user_id', user.id)
        .eq('allocation_date', today)
        .in('status', ['pto', 'sick', 'public_holiday']);
      
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!user && ENABLE_ATTENDANCE_SYSTEM
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('attendance').insert({
        user_id: user?.id,
        date: today,
        clock_in: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('attendance')
        .update({ clock_out: new Date().toISOString() })
        .eq('user_id', user?.id)
        .eq('date', today);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] })
  });

  if (!ENABLE_ATTENDANCE_SYSTEM || !user) return <>{children}</>;
  
  if ((isLoadingAttendance && !attendance) || (isLoadingLeave && !todayLeave)) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  // If they have an approved leave, they can bypass the gatekeeper
  if (todayLeave && todayLeave.is_approved) {
    return (
      <>
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm text-center font-medium flex items-center justify-center gap-2">
          You are marked as on {todayLeave.status.toUpperCase()} today. Enjoy your time off!
        </div>
        {children}
      </>
    );
  }

  // If they haven't clocked in, block access
  if (!attendance) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Good Morning!</CardTitle>
            <CardDescription className="text-base">
              Please clock in to access the KGAC Allocation System.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 pt-4">
            <div className="text-4xl font-light text-slate-800 tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">
              {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            
            <Button 
              size="lg" 
              className="w-full text-lg h-14 bg-blue-600 hover:bg-blue-700"
              onClick={() => clockIn.mutate()}
              disabled={clockIn.isPending}
            >
              {clockIn.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <LogIn className="w-5 h-5 mr-2" />}
              Clock In Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // They are clocked in. Render children, but inject a "Clock Out" button floating somewhere?
  // Or we can just let them use the app, and they clock out from the Dashboard or Sidebar.
  // The user said: "and clock out when they are done for the day"
  // Let's add the Clock Out button to the Sidebar. So we just render children here!
  
  return <>{children}</>;
}
