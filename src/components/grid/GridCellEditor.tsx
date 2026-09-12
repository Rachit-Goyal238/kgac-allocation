import React, { useState } from 'react';
import { Allocation, Project, TaskStatus } from '@/lib/types';
import { useUpsertAllocation } from '@/hooks/useAllocations';
import { ALLOCATION_STATUSES, TASK_STATUS_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

interface GridCellEditorProps {
  date: string;
  userId: string;
  allocation: Allocation | null;
  projects: Project[];
  onSave: (data: Partial<Allocation>) => void;
  onClose: () => void;
}

const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'pending_review', 'blocked'];

export function GridCellEditor({ date, userId, allocation, projects, onSave, onClose }: GridCellEditorProps) {
  const [hours, setHours] = useState(allocation?.hours || 8);
  const [status, setStatus] = useState(allocation?.status || 'billable');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(allocation?.task_status || 'not_started');
  const [projectId, setProjectId] = useState(allocation?.project_id || '');
  const [notes, setNotes] = useState(allocation?.notes || '');
  const { mutate } = useUpsertAllocation();

  const handleSave = () => {
    const data = {
      id: allocation?.id,
      user_id: userId,
      allocation_date: date,
      hours,
      status,
      task_status: taskStatus,
      project_id: projectId || undefined,
      notes
    };
    mutate(data);
    onSave(data);
    onClose();
  };

  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    if (!pid) return;
    const project = projects.find(p => p.id === pid);
    if (project) {
      setStatus(project.is_billable ? 'billable' : 'internal');
    }
  };

  const isLeaveType = ['pto', 'sick'].includes(status);
  const availableStatuses = ALLOCATION_STATUSES.filter(
    s => !['public_holiday', 'pto', 'sick'].includes(s.value) || s.value === status
  );

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-72 bg-white rounded-lg shadow-xl border p-4 flex flex-col gap-3">
      <div className="font-semibold text-sm">Edit Allocation</div>
      
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Billing Status</label>
        <select 
          className="border rounded p-1.5 text-sm bg-white" 
          value={status} 
          onChange={(e) => {
            const newStatus = e.target.value as any;
            setStatus(newStatus);
            if (['pto', 'sick'].includes(newStatus)) {
              setHours(0);
              setProjectId('');
            }
          }}
          disabled={!!projectId}
        >
          {availableStatuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {!!projectId && <span className="text-[10px] text-slate-400">Status is tied to the selected project.</span>}
      </div>

      {isLeaveType && (
        <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-800 text-xs">
          This day is marked as {status.toUpperCase()}. If you need to assign work, change the billing status to Billable or Internal first.
        </div>
      )}

      {!isLeaveType && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Project</label>
            <select 
              className="border rounded p-1.5 text-sm bg-white" 
              value={projectId} 
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">Task Progress</label>
            <select 
              className="border rounded p-1.5 text-sm bg-white" 
              value={taskStatus} 
              onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map(ts => (
                <option key={ts} value={ts}>{TASK_STATUS_LABELS[ts]}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {!isLeaveType && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500">Hours</label>
          <input 
            type="number" 
            min="0" max="24" step="0.5" 
            className="border rounded p-1.5 text-sm" 
            value={hours} 
            onChange={(e) => setHours(parseFloat(e.target.value))} 
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500">Notes</label>
        <input 
          type="text" 
          className="border rounded p-1.5 text-sm" 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)} 
          placeholder="Optional notes..."
        />
      </div>

      <div className="flex gap-2 mt-1">
        <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
