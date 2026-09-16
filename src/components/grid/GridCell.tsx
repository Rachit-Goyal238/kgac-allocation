import React from 'react';
import { GridCellData, Allocation } from '@/lib/types';
import { getCellColorClass, isWorkingDay, formatHours } from '@/lib/utils';
import { useBlanketHolidays, isBlanketHoliday } from '@/hooks/useBlanketHolidays';
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
  const { data: holidays } = useBlanketHolidays();
  const { projects } = useProjects();
  const { profile } = useAuthContext();
  
  const isHoliday = !!isBlanketHoliday(holidays, date);
  const isWorkDay = isWorkingDay(date);
  const isWeekend = !isWorkDay;
  
  if (isWeekend || isHoliday) {
    return (
      <div className="h-12 w-full rounded bg-slate-100 flex items-center justify-center opacity-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f1f5f9_10px,#f1f5f9_20px)] border border-slate-200">
        {isHoliday && <span className="text-xs text-slate-500">Holiday</span>}
      </div>
    );
  }

  const allocations = cellData.allocations || (allocation ? [allocation] : []);
  const colorClasses = getCellColorClass(allocations, isWeekend, isHoliday);
  const bgColor = colorClasses.bg;
  const textColor = colorClasses.text;
  const hours = cellData.totalHours || 0;
  const leaveAlloc = allocations.find(a => a.status === 'pto' || a.status === 'sick');
  
  const canEdit = () => {
    if (!profile) return false;
    if (profile.roles?.some(r => ['super_admin', 'admin', 'manager', 'audit_manager'].includes(r))) return true;
    
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

  return (
    <div className="relative w-full h-full min-h-[3rem]">
      <div 
        onClick={handleEditClick}
        className={`w-full h-12 rounded transition-all flex items-center justify-center border ${isEditable ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-not-allowed opacity-80'} ${bgColor} ${hours === 0 && !leaveAlloc ? 'border-dashed border-red-300' : 'border-transparent'}`}
      >
        {hours > 0 ? (
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
