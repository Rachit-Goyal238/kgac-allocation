import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { exportToCSV, exportToExcel } from '@/lib/export';
import {
  Loader2,
  Download,
  Search,
  Laptop,
  Smartphone,
  Mouse,
  Tablet,
  Monitor,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
  Building2,
  Filter
} from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';

export function AssetHistoryReport() {
  const { profile } = useAuthContext();
  const today = new Date().toISOString().split('T')[0];

  const isAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'hr'].includes(r));
  const isManager = profile?.roles?.some(r => r === 'manager');

  const { data: departments = [] } = useDepartments();

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Fetch asset history scoped to hierarchy
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['asset_history_report', profile?.id, profile?.roles, profile?.department_id],
    queryFn: async () => {
      let query = supabase
        .from('asset_requests')
        .select(`
          *,
          asset:internal_assets(id, name, type, serial_number),
          user:profiles!asset_requests_user_id_fkey(
            id, full_name, email, department_id,
            department:departments(name)
          )
        `)
        .order('created_at', { ascending: false });

      // Manager hierarchy: only see requests for users in their department
      if (!isAdmin) {
        if (isManager && profile?.department_id) {
          const { data: deptProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('department_id', profile.department_id);

          const userIds = deptProfiles?.map(p => p.id) || [];
          if (userIds.length > 0) {
            query = query.in('user_id', userIds);
          } else {
            query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
          }
        } else {
          query = query.eq('manager_id', profile?.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Filtered dataset
  const filteredHistory = useMemo(() => {
    return history.filter((item: any) => {
      // Search term
      if (search) {
        const term = search.toLowerCase();
        const userName = item.user?.full_name?.toLowerCase() || '';
        const userEmail = item.user?.email?.toLowerCase() || '';
        const assetName = item.asset?.name?.toLowerCase() || '';
        const serial = item.asset?.serial_number?.toLowerCase() || '';
        const notes = item.return_notes?.toLowerCase() || '';
        const matchesSearch =
          userName.includes(term) ||
          userEmail.includes(term) ||
          assetName.includes(term) ||
          serial.includes(term) ||
          notes.includes(term);

        if (!matchesSearch) return false;
      }

      // Department filter
      if (selectedDept !== 'all') {
        if (item.user?.department_id !== selectedDept) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (item.status !== selectedStatus) return false;
      }

      // Type filter
      if (selectedType !== 'all') {
        if (item.asset?.type !== selectedType) return false;
      }

      // Overdue filter
      if (overdueOnly) {
        const isOverdue =
          item.status === 'approved' && item.end_date && item.end_date < today;
        if (!isOverdue) return false;
      }

      return true;
    });
  }, [history, search, selectedDept, selectedStatus, selectedType, overdueOnly, today]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = history.length;
    const active = history.filter((h: any) => h.status === 'approved').length;
    const pendingReturn = history.filter((h: any) => h.status === 'return_pending').length;
    const returned = history.filter((h: any) => h.status === 'returned').length;
    const overdue = history.filter(
      (h: any) => h.status === 'approved' && h.end_date && h.end_date < today
    ).length;

    return { total, active, pendingReturn, returned, overdue };
  }, [history, today]);

  // Export handlers
  const handleExportCSV = () => {
    const exportData = filteredHistory.map((item: any) => {
      const isOverdue =
        item.status === 'approved' && item.end_date && item.end_date < today;
      const deptName =
        departments.find(d => d.id === item.user?.department_id)?.name ||
        item.user?.department?.name ||
        'None';

      return {
        'Employee Name': item.user?.full_name || 'Unknown',
        'Employee Email': item.user?.email || 'N/A',
        Department: deptName,
        'Asset Name': item.asset?.name || 'N/A',
        'Asset Type': item.asset?.type || 'N/A',
        'Serial / Tag': item.asset?.serial_number || 'N/A',
        'Checkout Date': item.start_date || 'N/A',
        'Due Date': item.end_date || 'Ongoing',
        Status: item.status,
        'Is Overdue': isOverdue ? 'Yes' : 'No',
        'Return Requested Date': item.return_requested_at
          ? format(new Date(item.return_requested_at), 'yyyy-MM-dd HH:mm')
          : 'N/A',
        'Return Notes': item.return_notes || '',
        'Request Date': item.created_at
          ? format(new Date(item.created_at), 'yyyy-MM-dd')
          : 'N/A',
      };
    });

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    exportToCSV(exportData, `asset_history_report_${dateStr}.csv`);
  };

  const handleExportExcel = async () => {
    const exportData = filteredHistory.map((item: any) => {
      const isOverdue =
        item.status === 'approved' && item.end_date && item.end_date < today;
      const deptName =
        departments.find(d => d.id === item.user?.department_id)?.name ||
        item.user?.department?.name ||
        'None';

      return {
        employee: item.user?.full_name || 'Unknown',
        email: item.user?.email || 'N/A',
        department: deptName,
        asset: item.asset?.name || 'N/A',
        type: item.asset?.type || 'N/A',
        serial: item.asset?.serial_number || 'N/A',
        startDate: item.start_date || 'N/A',
        endDate: item.end_date || 'Ongoing',
        status: item.status,
        overdue: isOverdue ? 'Yes' : 'No',
        returnDate: item.return_requested_at
          ? format(new Date(item.return_requested_at), 'yyyy-MM-dd HH:mm')
          : 'N/A',
        notes: item.return_notes || '',
      };
    });

    const columns = [
      { header: 'Employee', key: 'employee', width: 22 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Department', key: 'department', width: 18 },
      { header: 'Asset Name', key: 'asset', width: 24 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Serial / Tag', key: 'serial', width: 18 },
      { header: 'Start Date', key: 'startDate', width: 14 },
      { header: 'Due Date', key: 'endDate', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Overdue', key: 'overdue', width: 12 },
      { header: 'Return Requested', key: 'returnDate', width: 20 },
      { header: 'Return Notes', key: 'notes', width: 30 },
    ];

    const dateStr = format(new Date(), 'yyyy-MM-dd');
    await exportToExcel(exportData, columns, `asset_history_report_${dateStr}.xlsx`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'laptop':
        return <Laptop className="h-4 w-4 text-slate-500" />;
      case 'phone':
        return <Smartphone className="h-4 w-4 text-slate-500" />;
      case 'mouse':
        return <Mouse className="h-4 w-4 text-slate-500" />;
      case 'hht':
        return <Tablet className="h-4 w-4 text-slate-500" />;
      case 'monitor':
        return <Monitor className="h-4 w-4 text-slate-500" />;
      default:
        return <Package className="h-4 w-4 text-slate-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scope info banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h3 className="font-semibold text-slate-900 text-base">Asset Checkout History & Audit Log</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Organization-wide asset checkout, assignment, and return records.'
              : `Asset records for your department (${departments.find(d => d.id === profile?.department_id)?.name || 'Your Department'}).`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={handleExportExcel} className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Checkouts</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">Currently In Use</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{stats.active}</p>
        </div>
        <div className="bg-amber-50/50 border border-amber-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">Returns Pending</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">{stats.pendingReturn}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] font-medium text-slate-600 uppercase tracking-wider">Historical Returns</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.returned}</p>
        </div>
        <div className="bg-red-50/50 border border-red-200 p-3.5 rounded-xl shadow-sm">
          <p className="text-[11px] font-medium text-red-700 uppercase tracking-wider">Currently Overdue</p>
          <p className="text-2xl font-bold text-red-800 mt-1">{stats.overdue}</p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search employee, email, asset, serial number, return notes..."
              className="pl-9 h-9 text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved (In Use)</option>
              <option value="return_pending">Return Pending</option>
              <option value="returned">Returned</option>
              <option value="pending">Borrow Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Type Filter */}
            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">All Equipment Types</option>
              <option value="laptop">Laptops</option>
              <option value="monitor">Monitors</option>
              <option value="phone">Phones</option>
              <option value="hht">HHT / Tablets</option>
              <option value="mouse">Mice</option>
              <option value="other">Other</option>
            </select>

            {/* Department Filter (Only for admins/HR) */}
            {isAdmin && (
              <select
                className="border rounded-md px-2.5 py-1.5 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Overdue Checkbox */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-md border">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={e => setOverdueOnly(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-3.5 w-3.5"
              />
              <span className={overdueOnly ? 'font-medium text-red-700' : ''}>Overdue Only</span>
            </label>
          </div>
        </div>

        {/* Filter results summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
          <span>
            Showing <strong className="text-slate-800">{filteredHistory.length}</strong> of{' '}
            <strong className="text-slate-800">{history.length}</strong> records
          </span>
          {(search || selectedDept !== 'all' || selectedStatus !== 'all' || selectedType !== 'all' || overdueOnly) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedDept('all');
                setSelectedStatus('all');
                setSelectedType('all');
                setOverdueOnly(false);
              }}
              className="text-blue-600 hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Serial / Tag</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Return Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No asset checkout records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item: any) => {
                  const isOverdue =
                    item.status === 'approved' && item.end_date && item.end_date < today;
                  const daysOverdue = isOverdue
                    ? differenceInCalendarDays(new Date(), new Date(item.end_date))
                    : 0;

                  const deptName =
                    departments.find(d => d.id === item.user?.department_id)?.name ||
                    item.user?.department?.name ||
                    '—';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Employee */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.user?.full_name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400">{item.user?.email || 'N/A'}</div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Building2 className="w-3 h-3 mr-1 text-slate-500" />
                          {deptName}
                        </span>
                      </td>

                      {/* Asset */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-slate-100 border">{getIcon(item.asset?.type)}</span>
                          <div>
                            <div className="font-medium text-slate-900">{item.asset?.name || 'Unknown Asset'}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{item.asset?.type || 'Device'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Serial Number */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 text-[11px]">
                          {item.asset?.serial_number || '—'}
                        </span>
                      </td>

                      {/* Borrow Period */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div>{item.start_date}</div>
                        <div className="text-[10px] text-slate-400">
                          to {item.end_date || 'Ongoing'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.status === 'return_pending' ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                            <Clock className="w-3 h-3 mr-1" /> Return Pending
                          </Badge>
                        ) : isOverdue ? (
                          <Badge className="bg-red-600 text-white text-[10px]">
                            Overdue ({daysOverdue}d)
                          </Badge>
                        ) : item.status === 'approved' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> In Use
                          </Badge>
                        ) : item.status === 'returned' ? (
                          <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                            Returned
                          </Badge>
                        ) : item.status === 'rejected' ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px]">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
                            Pending Borrow
                          </Badge>
                        )}
                      </td>

                      {/* Return Activity & Notes */}
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {item.return_requested_at ? (
                          <div>
                            <span className="text-slate-400">Submitted: </span>
                            <span>{format(new Date(item.return_requested_at), 'MMM d, h:mm a')}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {item.return_notes && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 truncate max-w-xs" title={item.return_notes}>
                            "{item.return_notes}"
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
