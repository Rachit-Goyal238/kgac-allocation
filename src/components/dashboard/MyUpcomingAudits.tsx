import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Building2, Calendar, Search } from 'lucide-react';
import { format } from 'date-fns';
import { DateRangePicker } from '@/components/shared/DateRangePicker';

interface MyUpcomingAuditsProps {
  startDate?: string;
  endDate?: string;
  pickerStartDate?: Date;
  pickerEndDate?: Date;
  onDateChange?: (start: Date, end: Date) => void;
}

export function MyUpcomingAudits({ 
  startDate, 
  endDate,
  pickerStartDate,
  pickerEndDate,
  onDateChange
}: MyUpcomingAuditsProps) {
  const { user } = useAuthContext();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['my_audits', user?.id, startDate, endDate],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
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
      
      const { data, error } = await query
        .neq('audit.status', 'draft')
        .neq('audit.status', 'cancelled')
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
    <Card className="border-blue-100 bg-blue-50/30 shadow-sm">
      <CardHeader className="pb-3 border-b border-blue-100/50 bg-white/70 rounded-t-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
          <div>
            <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              My Upcoming Audits
            </CardTitle>
            <CardDescription className="text-blue-700/70">Your scheduled field assignments</CardDescription>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {pickerStartDate && pickerEndDate && onDateChange && (
              <div className="bg-white p-0.5 rounded-lg border border-blue-100 shadow-xs">
                <DateRangePicker 
                  startDate={pickerStartDate}
                  endDate={pickerEndDate}
                  onChange={onDateChange}
                />
              </div>
            )}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search store, code, location..."
                className="pl-9 bg-white border-blue-200 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white/50">
            {searchTerm ? 'No audits match your search.' : 'You have no upcoming audits scheduled.'}
          </div>
        ) : (
          <div className="divide-y divide-blue-100/40 bg-white">
            {filtered.map((item, index) => {
              const au = item.audit as any;
              const formattedDate = format(new Date(au.audit_date), 'EEE, MMM d, yyyy');
              const hasMultiDay = au.end_date && au.end_date !== au.audit_date;
              const formattedEndDate = hasMultiDay ? format(new Date(au.end_date), 'EEE, MMM d, yyyy') : '';

              return (
                <div key={index} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-base">{au.store_name}</span>
                      {au.store_code && (
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 font-mono">
                          {au.store_code}
                        </Badge>
                      )}
                      <Badge className={
                        item.role === 'lead' 
                          ? 'bg-amber-100 text-amber-800 border-amber-200' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }>
                        {item.role ? item.role.toUpperCase() : 'MEMBER'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      {au.client?.name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{au.client.name}</span>
                        </div>
                      )}
                      {au.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{au.location}</span>
                        </div>
                      )}
                      {au.audit_type && (
                        <div className="capitalize text-slate-400">
                          • {au.audit_type} Audit
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-900 flex items-center gap-1.5 justify-end">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span>{formattedDate}</span>
                      </div>
                      {hasMultiDay && (
                        <div className="text-xs text-slate-500">to {formattedEndDate}</div>
                      )}
                    </div>
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
