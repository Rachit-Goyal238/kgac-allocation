import React from 'react';
import { AllocationGrid } from '@/components/grid/AllocationGrid';

export function CalendarPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex-none p-4 border-b bg-slate-50">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Team Allocation Calendar</h2>
        <p className="text-sm text-slate-500 mt-1">Manage project assignments and team capacity across the organization.</p>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <AllocationGrid />
      </div>
    </div>
  );
}
