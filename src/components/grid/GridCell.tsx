import React from 'react';
import { GridCellData, Allocation } from '@/lib/types';
import { getCellColorClass, isWorkingDay, formatHours } from '@/lib/utils';

import { GridCellEditor } from './GridCellEditor';
import { useProjects } from '@/hooks/useProjects';
import { useAuthContext } from '@/contexts/AuthContext';
import { parseISO } from 'date-fns';

interface GridCellProps {
  cellData: GridCellData;
  allocation: Allocation | null;
  date: string;
  userId: string;
  onEdit: (date: string, userId: string) => void;
  isEditing: boolean;
}

export function GridCell({ cellData, allocation, date, userId, onEdit, isEditing }: GridCellProps) {
  
  const { projects } = useProjects();
  const { profile } = useAuthContext();
  
  
  const isWorkDay = isWorkingDay(date);
  const isWeekend = !isWorkDay;
  
  const allocations = cellData.allocations || (allocation ? [allocation] : []);
  const colorClasses = getCellColorClass(allocations, isWeekend, false);
  const bgColor = colorClasses.bg;
  const textColor = colorClasses.text;
  const hours = cellData.totalHours || 0;
  const leaveAlloc = allocations.find(a => a.status === 'pto' || a.status === 'sick');
  
  const canEdit = () => {
    if (!profile) return false;
    if (profile.roles?.some(r => ['super_admin', 'admin', 'manager', 'audit_manager', 'planner'].includes(r))) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cellDate = parseISO(date);
    const diffDays = Math.round((cellDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    return diffDays >= -14 && diffDays <= 14;
  };

  const isEditable = canEdit();

  const handleEditClick = () => {
    if (!isEditable) return;
    onEdit(date, userId);
  };
  
  const hasAllocations = allocations.length > 0;
  const isEmptyWeekendOrHoliday = isWeekend && !hasAllocations;

  return (
    <div className="relative w-full h-full min-h-[3rem]">
      <div 
        onClick={handleEditClick}
        className={`w-full h-12 rounded transition-all flex items-center justify-center border ${isEditable ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-not-allowed opacity-80'} 
          ${isEmptyWeekendOrHoliday ? 'bg-slate-50 border-slate-200 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f1f5f9_10px,#f1f5f9_20px)]' : bgColor} 
          ${hours === 0 && !leaveAlloc && !isEmptyWeekendOrHoliday ? 'border-dashed border-red-300' : 'border-transparent'}`}
      >
        {isEmptyWeekendOrHoliday ? (
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{'Weekend'}</span>
        ) : hours > 0 ? (
          <div className="flex flex-col items-center">
             <span className={`font-semibold ${textColor}`}>{formatHours(hours)}</span>
             {allocations.length > 1 && <span className="text-[9px] leading-none opacity-60 mt-0.5 tracking-tighter">({allocations.length} projects)</span>}
          </div>
        ) : (
          <span className={`text-xs font-semibold ${textColor}`}>
            {leaveAlloc?.status === 'pto' ? 'PTO' : leaveAlloc?.status === 'sick' ? 'SICK' : 'IDLE'}
          </span>
        )}
      </div>

      {isEditing && isEditable && (
        <GridCellEditor 
          date={date} 
          userId={userId} 
          allocations={allocations} 
          projects={projects}
          onSave={() => onEdit('', '')}
          onClose={() => onEdit('', '')}
        />
      )}
    </div>
  );
}
