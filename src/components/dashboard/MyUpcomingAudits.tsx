import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Building2, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';

export function MyUpcomingAudits() {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');

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
        .order('audit(audit_date)', { ascending: true });

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

  const filteredAssignments = assignments.filter((a: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const audit = a.audit;
    return (
      audit.store_name?.toLowerCase().includes(term) ||
      audit.store_code?.toLowerCase().includes(term) ||
      audit.location?.toLowerCase().includes(term) ||
      audit.client?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <CardTitle>My Upcoming Audits</CardTitle>
          <CardDescription>Your scheduled audit assignments for the upcoming days.</CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search stores, clients, locations..." 
            className="pl-9 h-9 text-sm w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No upcoming audits match your search.
            </div>
          ) : (
            filteredAssignments.map((assignment: any, idx: number) => {
              const audit = assignment.audit;
              return (
                <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border bg-slate-50">
                  <div className="space-y-1">
                    <div className="font-semibold text-base">{audit.store_name} {audit.store_code && <span className="text-muted-foreground font-normal text-sm">({audit.store_code})</span>}</div>
                    <div className="text-sm text-slate-600 flex items-center gap-4">
                      <span className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1" /> {audit.client?.name || 'Unknown Client'}</span>
                      <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {audit.location || 'Location TBD'}</span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex md:flex-col items-center md:items-end gap-3">
                    <div className="flex items-center bg-white border rounded px-3 py-1.5 shadow-sm">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">{format(new Date(audit.audit_date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">{assignment.role}</Badge>
                      <Badge className="bg-slate-900 text-white hover:bg-slate-800 capitalize text-[10px]">{audit.status}</Badge>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
