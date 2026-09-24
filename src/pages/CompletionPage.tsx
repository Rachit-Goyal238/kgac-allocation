import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/shared/DateRangePicker';
import { format } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ListTodo, TrendingUp } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

// Circular progress ring for completion %
function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <svg width={72} height={72} className="rotate-[-90deg]">
      <circle cx={36} cy={36} r={r} strokeWidth={6} stroke="#e2e8f0" fill="none" />
      <circle
        cx={36} cy={36} r={r} strokeWidth={6} fill="none"
        stroke="#10b981"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

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
  const completionPct = total > 0 ? (completed / total) * 100 : 0;

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet Completion</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track task progress and surface anomalies across the team.</p>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Filter by Zone..."
            className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm w-36"
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-slate-400" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Tasks</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{total}</p>
            </div>
            <span className="rounded-lg bg-slate-100 p-2">
              <ListTodo className="h-5 w-5 text-slate-500" />
            </span>
          </div>
        </div>

        {/* Completed % — special ring card */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-emerald-500" />
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">Completed</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">{completionPct.toFixed(1)}%</p>
              <p className="text-xs text-emerald-600 mt-1">{completed}/{total} tasks</p>
            </div>
            <ProgressRing pct={completionPct} />
          </div>
        </div>

        {/* In Progress */}
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60 p-5 shadow-sm">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-blue-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600">In Progress</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{inProgress}</p>
            </div>
            <span className="rounded-lg bg-blue-100 p-2">
              <Clock className="h-5 w-5 text-blue-500" />
            </span>
          </div>
        </div>

        {/* Blocked */}
        <div className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-red-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-600">Blocked</p>
              <p className="mt-2 text-3xl font-bold text-red-700">{blocked}</p>
            </div>
            <span className="rounded-lg bg-red-100 p-2">
              <XCircle className="h-5 w-5 text-red-500" />
            </span>
          </div>
        </div>

        {/* Pending Review */}
        <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
          <div className="absolute top-0 left-0 h-full w-1 rounded-l-xl bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Pending Review</p>
              <p className="mt-2 text-3xl font-bold text-amber-700">{pendingReview}</p>
            </div>
            <span className="rounded-lg bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </span>
          </div>
        </div>
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
