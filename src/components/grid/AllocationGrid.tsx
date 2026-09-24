import React, { useState, useDeferredValue } from 'react';
import { useAllocationsQuery } from '@/hooks/useAllocations';
import { useRealtimeAllocations } from '@/hooks/useRealtime';

import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { GridFilters } from '@/lib/types';
import { getWeekRange, formatHours } from '@/lib/utils';
import { GridToolbar } from './GridToolbar';
import { GridCell } from './GridCell';
import { OfflineIndicator } from '../shared/OfflineIndicator';
import { format, parseISO, isWeekend } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

export function AllocationGrid() {
  const [filters, setFilters] = useState<GridFilters>(() => {
    const { start, end } = getWeekRange(new Date());
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    return { 
      departmentId: null, 
      projectId: null, 
      searchQuery: '', 
      dateRange: { start: startStr, end: endStr },
      startDate: startStr,
      endDate: endStr,
    };
  });

  const deferredFilters = useDeferredValue(filters);
  const { data, isLoading } = useAllocationsQuery(deferredFilters);
  
  useRealtimeAllocations();
  useOfflineQueue();
  const { profile } = useAuthContext();

  const [editingCell, setEditingCell] = useState<{ date: string, userId: string } | null>(null);

  if (isLoading) return <div className="p-8">Loading grid...</div>;

  const dates = data?.gridRows[0]?.cells.map(c => c.date) || [];

  return (
    <div className="flex flex-col h-full bg-white relative rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <GridToolbar 
        filters={filters} 
        onFiltersChange={setFilters} 
        onExport={() => {
          import('@/lib/utils').then(m => m.exportGridToCSV(data?.gridRows || [], dates));
        }} 
      />
      
      <div className="flex-1 overflow-auto border-t">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 font-medium text-slate-600 border-b border-r w-64 min-w-[16rem]">
                Employee
              </th>
              {dates.map(dateStr => {
                const date = parseISO(dateStr);
                const isWe = date.getDay() === 0;
                const isHol = false;
                return (
                  <th key={dateStr} className={`px-2 py-3 border-b border-r text-center font-medium ${isWe || isHol ? 'bg-slate-100 text-slate-400' : 'text-slate-600'} min-w-[8rem]`}>
                    <div className="flex flex-col items-center">
                      <span className="text-xs uppercase">{format(date, 'EEE')}</span>
                      <span className="text-lg">{format(date, 'd')}</span>
                    </div>
                  </th>
                );
              })}
              <th className="px-4 py-3 font-medium text-slate-600 border-b w-32 min-w-[8rem] text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.gridRows.map(row => (
              <tr key={row.user.id} className="border-b group hover:bg-slate-50">
                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-4 py-3 border-r flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-100 font-bold overflow-hidden shrink-0 shadow-sm">
                    {row.user.avatar_url ? (
                      <img src={row.user.avatar_url} alt={row.user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      (row.user.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 truncate">{row.user.full_name}</span>
                      </div>
                    <span className="text-xs text-slate-500 truncate">{row.user.roles?.[0] || 'Audit Exec'}</span>
                  </div>
                </td>
                {row.cells.map(cell => (
                  <td key={cell.date} className="border-r p-1">
                    <GridCell 
                      cellData={cell as any} 
                      allocation={cell.allocations[0] || null} 
                      date={cell.date} 
                      userId={row.user.id}
                      isEditing={editingCell?.date === cell.date && editingCell?.userId === row.user.id}
                      onEdit={(d, u) => setEditingCell({ date: d, userId: u })}
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="font-semibold text-slate-700">{formatHours(row.weeklyTotal)}</div>
                  <div className="text-xs text-slate-500">{row.utilization.toFixed(0)}% Util</div>
                </td>
              </tr>
            ))}
            {(!data?.gridRows || data.gridRows.length === 0) && (
              <tr><td colSpan={dates.length + 2} className="text-center py-8 text-slate-500">No employees found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <OfflineIndicator />
    </div>
  );
}
