import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { useAuthContext } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function AuditLogViewer() {
  const { profile } = useAuthContext();
  const isSuperAdmin = profile?.roles?.includes('super_admin');
  const [filters, setFilters] = useState({ action: '', table_name: '', actorSearch: '' });
  const { data, isLoading, page, setPage, totalCount } = useAuditLogs(filters);
  const queryClient = useQueryClient();

  const clearAllLogs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('clear_all_audit_logs');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('All audit logs have been permanently deleted.');
    },
    onError: (error: any) => {
      toast.error(`Failed to clear logs: ${error.message}`);
    }
  });

  const clearOldLogs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('cleanup_old_audit_logs', { days_to_keep: 90 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      toast.success('Logs older than 90 days have been deleted.');
    },
    onError: (error: any) => {
      toast.error(`Failed to clear old logs: ${error.message}`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        
        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={() => {
                if(window.confirm('Are you sure you want to delete all logs older than 90 days?')) clearOldLogs.mutate();
              }}
              disabled={clearOldLogs.isPending}
            >
              Clear &gt;90 Days
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if(window.confirm('WARNING: This will permanently wipe ALL audit logs across the entire system. Are you absolutely sure?')) clearAllLogs.mutate();
              }}
              disabled={clearAllLogs.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Wipe Entire Log
            </Button>
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <Input placeholder="Search actor email..." value={filters.actorSearch} onChange={e => setFilters({...filters, actorSearch: e.target.value})} />
        <Input placeholder="Action type..." value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} />
        <Input placeholder="Table name..." value={filters.table_name} onChange={e => setFilters({...filters, table_name: e.target.value})} />
      </div>

      <Card>
        <CardHeader><CardTitle>Log Entries</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="text-slate-500 p-4">Loading logs...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Changes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.profiles?.email || 'Unknown'}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.table_name}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">{log.record_id}</TableCell>
                      <TableCell>
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:underline">View Changes</summary>
                          <pre className="text-xs bg-slate-50 p-2 mt-1 rounded max-w-xs overflow-auto border">
                            {JSON.stringify(log.after_values || log.before_values || log.metadata, null, 2)}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data || data.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500 py-8">No audit logs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4 text-sm text-slate-600">
                 <span>Total Records: {totalCount}</span>
                 <div className="flex gap-2">
                   <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                   <Button size="sm" variant="outline" disabled={!data || data.length < 25} onClick={() => setPage(page + 1)}>Next</Button>
                 </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
