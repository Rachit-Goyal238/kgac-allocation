import React from 'react';
import { TimesheetApprovals } from '@/components/admin/TimesheetApprovals';

export function TimesheetApprovalsPage() {
  return (
    <div className="flex flex-col h-full bg-slate-50/30 p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Timesheet Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">Review and approve timesheets before they impact financial dashboards.</p>
      </div>
      
      <div className="max-w-6xl w-full">
        <TimesheetApprovals />
      </div>
    </div>
  );
}
