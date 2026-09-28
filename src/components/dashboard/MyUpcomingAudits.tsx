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
          audit:audits!inner(
            id, store_name, store_code, location, audit_date, end_date, status, audit_type,
            client:clients(name)
          )
        `)
        .eq('user_id', user?.id)
        .gte('audit.audit_date', today)
        .neq('audit.status', 'draft')
        .order('audit(audit_date)', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  const filtered = assignments?.filter(a => {
    const term = searchTerm.toLowerCase();
    const au = a.audit as any;
    return au.store_name?.toLowerCase().includes(term) || 
           au.store_code?.toLowerCase().includes(term) || 
           au.location?.toLowerCase().includes(term) ||
           au.client?.name?.toLowerCase().includes(term);
  }) || [];

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-3 border-b border-blue-100/50 bg-white/50">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              My Upcoming Audits
            </CardTitle>
            <CardDescription className="text-blue-700/70">Your scheduled field assignments</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search store, code, location..."
              className="pl-9 bg-white border-blue-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white/50">
            {searchTerm ? 'No audits match your search.' : 'You have no upcoming audits scheduled.'}
          </div>
        ) : (
          <div className="divide-y divide-blue-100">
            {filtered.map((assignment, i) => {
              const au = assignment.audit as any;
              return (
                <div key={`${au.id}-${i}`} className="p-4 sm:p-6 bg-white hover:bg-blue-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{au.store_name}</h4>
                      {au.store_code && <Badge variant="outline" className="text-xs font-mono bg-slate-50">{au.store_code}</Badge>}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      {au.client?.name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {au.client.name}
                        </span>
                      )}
                      {au.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {au.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                        <Calendar className="h-3.5 w-3.5" />
                        {format(new Date(au.audit_date), 'MMM d, yyyy')}
                        {au.end_date && au.end_date !== au.audit_date && ` - ${format(new Date(au.end_date), 'MMM d')}`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Your Role</p>
                      <p className="text-sm font-medium capitalize text-slate-900">{assignment.role}</p>
                    </div>
                    <Badge className={au.status === 'scheduled' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-green-100 text-green-700 hover:bg-green-100'}>
                      {au.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
