import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export function MyUpcomingAudits() {
  const { user } = useAuthContext();

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my_audits', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('audit_teams')
        .select(`
          role,
          audit:audits(
            id, store_name, store_code, location, audit_date, status, audit_type,
            client:clients(name)
          )
        `)
        .eq('user_id', user?.id)
        .gte('audit.audit_date', today)
        .order('audit(audit_date)', { ascending: true })
        .limit(5);

      if (error) throw error;
      // Filter out null audits because inner joins with postgrest can sometimes leave null objects when filtering on the foreign table
      return data.filter(d => d.audit) || [];
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>My Upcoming Audits</CardTitle></CardHeader>
        <CardContent className="flex justify-center p-6"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></CardContent>
      </Card>
    );
  }

  if (!assignments || assignments.length === 0) {
    return null; // Don't show if they have none
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Upcoming Audits</CardTitle>
        <CardDescription>Your scheduled audit assignments for the upcoming days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.map((assignment: any, idx: number) => {
            const audit = assignment.audit;
            return (
              <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border bg-slate-50">
                <div className="space-y-1">
                  <div className="font-semibold text-base">{audit.store_name} <span className="text-muted-foreground font-normal text-sm">({audit.store_code})</span></div>
                  <div className="text-sm text-slate-600 flex items-center gap-4">
                    <span className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1" /> {audit.client?.name || 'Unknown Client'}</span>
                    <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {audit.location || 'Location TBD'}</span>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex md:flex-col items-center md:items-end gap-3">
                  <div className="flex items-center font-medium text-slate-900 bg-white px-3 py-1.5 rounded-md border shadow-sm">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    {format(new Date(audit.audit_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize">{assignment.role}</Badge>
                    <Badge className="capitalize">{audit.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
