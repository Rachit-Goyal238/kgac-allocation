import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuditLogs } from '@/hooks/useAuditLogs';

export function AuditLogViewer() {
  const [filters, setFilters] = useState({ action: '', table_name: '', actorSearch: '' });
  const { data, isLoading, page, setPage, totalCount } = useAuditLogs(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      
      <div className="flex gap-4">
        <Input placeholder="Search actor email..." value={filters.actorSearch} onChange={e => setFilters({...filters, actorSearch: e.target.value})} />
        <Input placeholder="Action type..." value={filters.action} onChange={e => setFilters({...filters, action: e.target.value})} />
        <Input placeholder="Table name..." value={filters.table_name} onChange={e => setFilters({...filters, table_name: e.target.value})} />
      </div>

      <Card>
        <CardHeader><CardTitle>Log Entries</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
             <div>Loading logs...</div>
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
                      <TableCell>{log.record_id}</TableCell>
                      <TableCell>
                        <details>
                          <summary>View Changes</summary>
                          <pre className="text-xs bg-gray-100 p-2 mt-1 rounded max-w-xs overflow-auto">{JSON.stringify(log.changes, null, 2)}</pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                 <span>Total: {totalCount}</span>
                 <div className="flex gap-2">
                   <Button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                   <Button disabled={!data || data.length < 25} onClick={() => setPage(page + 1)}>Next</Button>
                 </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
