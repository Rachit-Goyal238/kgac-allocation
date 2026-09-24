import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { format } from 'date-fns';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

export function CompletionPage() {
  const [dateRange, setDateRange] = useState({ start: new Date(new Date().setMonth(new Date().getMonth() - 1)), end: new Date() });
  const [zoneFilter, setZoneFilter] = useState('');
  const [allocations, setAllocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllocations = async () => {
      let q = supabase.from('allocations').select('*, projects(name), profiles!inner(full_name, zone)')
        .gte('allocation_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('allocation_date', format(dateRange.end, 'yyyy-MM-dd'));
      if (zoneFilter) q = q.ilike('profiles.zone', `%${zoneFilter}%`);
      const { data, error } = await q;
      if (error) {
        console.error('Failed to fetch allocations:', error);
      } else if (data) {
        setAllocations(data);
      }
    };
    fetchAllocations();
  }, [dateRange, zoneFilter]);

  const total = allocations.length;
  const completed = allocations.filter(a => a.task_status === 'completed').length;
  const inProgress = allocations.filter(a => a.task_status === 'in_progress').length;
  const blocked = allocations.filter(a => a.task_status === 'blocked').length;
  const pendingReview = allocations.filter(a => a.task_status === 'pending_review').length;
  const notStarted = allocations.filter(a => a.task_status === 'not_started').length;

  const pieData = [
    { name: 'Completed', value: completed },
    { name: 'In Progress', value: inProgress },
    { name: 'Pending Review', value: pendingReview },
    { name: 'Blocked', value: blocked },
    { name: 'Not Started', value: notStarted }
  ];

  const mismatches = allocations.filter(a => a.hours > 0 && a.task_status === 'not_started');

  const projectGroups = allocations.reduce((acc: any, a) => {
    const projId = a.project_id;
    if (!acc[projId]) {
      acc[projId] = { name: a.projects?.name || 'Unknown', total: 0, completed: 0, inProgress: 0, notStarted: 0, blocked: 0 };
    }
    acc[projId].total++;
    if (a.task_status === 'completed') acc[projId].completed++;
    if (a.task_status === 'in_progress') acc[projId].inProgress++;
    if (a.task_status === 'not_started') acc[projId].notStarted++;
    if (a.task_status === 'blocked') acc[projId].blocked++;
    return acc;
  }, {});

  const projects = Object.values(projectGroups);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Timesheet Completion & Status</h1>
        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Filter by Zone..." 
            className="border rounded p-2 text-sm max-w-[150px]"
            value={zoneFilter} 
            onChange={e => setZoneFilter(e.target.value)} 
          />
          <DateRangePicker 
            startDate={dateRange.start} 
            endDate={dateRange.end} 
            onChange={(start, end) => setDateRange({ start, end })} 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardHeader><CardTitle>Total Tasks</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Completed %</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{total > 0 ? ((completed/total)*100).toFixed(1) : 0}%</p></CardContent></Card>
        <Card><CardHeader><CardTitle>In Progress</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{inProgress}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Blocked</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{blocked}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Review</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{pendingReview}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Auto-flagged Mismatches</CardTitle></CardHeader>
          <CardContent>
            {mismatches.length > 0 ? (
              <ul className="space-y-2">
                {mismatches.map((m: any) => (
                  <li key={m.id} className="text-red-500 text-sm">
                    <strong>{m.profiles?.full_name || 'Unknown User'}</strong> ({format(new Date(m.allocation_date), 'MMM d, yyyy')}): {m.hours} hours logged but status is 'not_started'
                  </li>
                ))}
              </ul>
            ) : <p>No mismatches found.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By Project</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>In Progress</TableHead>
                <TableHead>Not Started</TableHead>
                <TableHead>Blocked</TableHead>
                <TableHead>Completion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p: any, i) => (
                <TableRow key={i}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.total}</TableCell>
                  <TableCell>{p.completed}</TableCell>
                  <TableCell>{p.inProgress}</TableCell>
                  <TableCell>{p.notStarted}</TableCell>
                  <TableCell>{p.blocked}</TableCell>
                  <TableCell>{p.total > 0 ? ((p.completed/p.total)*100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
