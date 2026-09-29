import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportToCSV, exportToExcel } from '@/lib/export';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, MapPin, Building2, Calendar, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', icon: Clock, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', icon: Clock, className: 'bg-amber-100 text-amber-700 border-amber-200' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
  draft: { label: 'Draft', icon: Clock, className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function AuditsPage() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addMonths(new Date(), 3));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data: audits, isLoading } = useQuery({
    queryKey: ['all_audits_view', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audits')
        .select(`
          id, store_name, store_code, location, audit_date, end_date,
          audit_type, status, billing_amount,
          client:clients(name)
        `)
        .in('status', ['scheduled', 'in_progress', 'completed', 'cancelled'])
        .gte('audit_date', startStr)
        .lte('audit_date', endStr)
        .order('audit_date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  const filtered = (audits || []).filter(a => {
    const matchSearch = !search || 
      a.store_name?.toLowerCase().includes(search.toLowerCase()) ||
      (a.client as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.location?.toLowerCase().includes(search.toLowerCase()) ||
      a.store_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleExport = (fmt: 'csv' | 'excel') => {
    const data = filtered.map(a => ({
      'Client': (a.client as any)?.name || '',
      'Store': a.store_name,
      'Code': a.store_code || '',
      'Location': a.location || '',
      'Type': a.audit_type,
      'Start Date': a.audit_date,
      'End Date': a.end_date || a.audit_date,
      'Status': a.status,
    }));
    const filename = `audits_${startStr}_to_${endStr}`;
    if (fmt === 'csv') exportToCSV(data, `${filename}.csv`);
    else exportToExcel(data, [], `${filename}.xlsx`);
  };

  const counts = {
    all: (audits || []).length,
    scheduled: (audits || []).filter(a => a.status === 'scheduled').length,
    completed: (audits || []).filter(a => a.status === 'completed').length,
    in_progress: (audits || []).filter(a => a.status === 'in_progress').length,
    cancelled: (audits || []).filter(a => a.status === 'cancelled').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Audits</h1>
          <p className="text-sm text-slate-500">View scheduled and completed audits by date range.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker startDate={startDate} endDate={endDate} onChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
          <ExportButton onExport={handleExport} disabled={filtered.length === 0} />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'scheduled', 'in_progress', 'completed', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              statusFilter === s
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by store, client, location or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Calendar className="h-10 w-10 mb-3 opacity-30" />
              <p className="font-medium">No audits found</p>
              <p className="text-sm">Try adjusting the date range or search term.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client / Store</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(audit => {
                  const cfg = STATUS_CONFIG[audit.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.scheduled;
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={audit.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="font-medium text-slate-900">{audit.store_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {(audit.client as any)?.name || '—'}
                          {audit.store_code && <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded font-mono">{audit.store_code}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {audit.location || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm capitalize text-slate-600">{audit.audit_type?.replace(/_/g, ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-slate-800">
                          {format(new Date(audit.audit_date), 'dd MMM yyyy')}
                        </div>
                        {audit.end_date && audit.end_date !== audit.audit_date && (
                          <div className="text-xs text-slate-400">
                            to {format(new Date(audit.end_date), 'dd MMM yyyy')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-semibold gap-1 ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
