import React, { useState } from 'react';
import { Allocation, Project, TaskStatus } from '@/lib/types';
import { useSaveDayAllocations } from '@/hooks/useAllocations';
import { TASK_STATUS_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface GridCellEditorProps {
  date: string;
  userId: string;
  allocations: Allocation[];
  projects: Project[];
  onSave: () => void;
  onClose: () => void;
}

const TASK_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'pending_review', 'blocked'];

export function GridCellEditor({ date, userId, allocations, projects, onSave, onClose }: GridCellEditorProps) {
  const { profile } = useAuthContext();
  const [drafts, setDrafts] = useState<Partial<Allocation>[]>(
    allocations.length > 0 
      ? allocations 
      : [{ hours: 8, status: 'billable', task_status: 'not_started', project_id: '' }]
  );
  
  const { mutate, isPending } = useSaveDayAllocations();

  // Fetch project assignments for this user to filter dropdown
  const { data: assignments } = useQuery({
    queryKey: ['project_assignments', userId],
    queryFn: async () => {
      const { data } = await supabase.from('project_assignments').select('project_id').eq('user_id', userId);
      return data?.map(d => d.project_id) || [];
    }
  });

  const isEmployeeOnly = !profile?.roles?.some(r => ['super_admin', 'admin', 'manager', 'planner'].includes(r));
  
  // Filter projects: If employee, only show assigned. Else show all.
  const availableProjects = isEmployeeOnly 
    ? projects.filter(p => assignments?.includes(p.id)) 
    : projects;

  const handleSave = () => {
    // Filter out drafts with no project selected (as requested)
    const validDrafts = drafts.filter(d => !!d.project_id).map(d => ({
      ...d,
      hours: d.hours === undefined ? 0 : d.hours
    }));
    mutate({ userId, date, allocations: validDrafts }, {
      onSuccess: () => {
        onSave();
        onClose();
      }
    });
  };

  const updateDraft = (index: number, updates: Partial<Allocation>) => {
    setDrafts(prev => {
      const newDrafts = [...prev];
      newDrafts[index] = { ...newDrafts[index], ...updates };
      return newDrafts;
    });
  };

  const removeDraft = (index: number) => {
    setDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const addDraft = () => {
    setDrafts(prev => [...prev, { hours: 0, status: 'billable', task_status: 'not_started', project_id: '' }]);
  };

  const hasLeave = allocations.some(a => a.status === 'pto' || a.status === 'sick');
  const isManagerOrAdmin = profile?.roles?.some(r => ['admin', 'super_admin', 'manager', 'planner'].includes(r));
  const isBlockedByLeave = hasLeave && !isManagerOrAdmin;

  return (
    <div className="fixed inset-x-4 top-1/4 sm:inset-auto sm:absolute sm:top-14 sm:left-1/2 sm:-translate-x-1/2 z-50 sm:w-80 bg-white rounded-lg shadow-xl border p-4 flex flex-col gap-3 whitespace-normal">
      <div className="font-semibold text-sm">Edit Allocations ({date})</div>
      
      {isBlockedByLeave ? (
        <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-800 text-xs">
          This day has an approved leave. You cannot manually assign hours.
        </div>
      ) : (
        <>
          {hasLeave && (
            <div className="bg-amber-50 p-2 mb-2 rounded border border-amber-200 text-amber-800 text-xs">
              This day has a leave status. You have administrative override to edit it.
            </div>
          )}
          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {drafts.map((draft, i) => (
              <div key={i} className="border p-2 rounded relative flex flex-col gap-2 bg-slate-50">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-1 right-1 h-6 w-6 text-slate-400 hover:text-red-500"
                  onClick={() => removeDraft(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
                
                <div className="flex flex-col gap-1 pr-6">
                  <label className="text-[10px] uppercase font-semibold text-slate-500">Project</label>
                  <select 
                    className="border rounded p-1 text-xs bg-white" 
                    value={draft.project_id || ''} 
                    onChange={(e) => {
                      const pid = e.target.value;
                      const proj = projects.find(p => p.id === pid);
                      updateDraft(i, { 
                        project_id: pid, 
                        status: proj ? (proj.is_billable ? 'billable' : 'internal') : 'billable' 
                      });
                    }}
                  >
                    <option value="">-- Select a project --</option>
                    {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] uppercase font-semibold text-slate-500">Hours</label>
                    <input 
                      type="number" 
                      min="0" max="24" step="0.5" 
                      className="border rounded p-1 text-xs bg-white" 
                      value={draft.hours === undefined ? '' : draft.hours} 
                      onChange={(e) => {
                        const val = e.target.value;
                        updateDraft(i, { hours: val === '' ? undefined : parseFloat(val) });
                      }} 
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] uppercase font-semibold text-slate-500">Status</label>
                    <select 
                      className="border rounded p-1 text-xs bg-white" 
                      value={draft.task_status || 'not_started'} 
                      onChange={(e) => updateDraft(i, { task_status: e.target.value as TaskStatus })}
                    >
                      {TASK_STATUSES.map(ts => (
                        <option key={ts} value={ts}>{TASK_STATUS_LABELS[ts]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <input 
                    type="text" 
                    className="border rounded p-1 text-xs bg-white" 
                    value={draft.notes || ''} 
                    onChange={(e) => updateDraft(i, { notes: e.target.value })} 
                    placeholder="Optional notes..."
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={addDraft}>
            <Plus className="h-3 w-3 mr-1" /> Add Project
          </Button>
        </>
      )}

      <div className="flex gap-2 mt-2 pt-2 border-t">
        <Button size="sm" onClick={handleSave} className="flex-1" disabled={isPending || isBlockedByLeave}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

