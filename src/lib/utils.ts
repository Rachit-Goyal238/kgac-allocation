import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isSunday, format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { WORK_HOURS_PER_DAY, CELL_COLORS } from './constants';
import type { Allocation, UserRole } from './types';

// ─── Tailwind Merge Helper ───────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date Utilities ──────────────────────────────────────────────────────────

export function isWorkingDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return !isSunday(d);
}

export function formatDate(date: Date | string, fmt: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
}

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(date, { weekStartsOn: 1 }),       // Sunday
  };
}

export function getDatesBetween(start: Date | string, end: Date | string): Date[] {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return eachDayOfInterval({ start: s, end: e });
}

export function getNextWeekRange(currentStart: Date): { start: Date; end: Date } {
  const nextWeekStart = addWeeks(currentStart, 1);
  return getWeekRange(nextWeekStart);
}

export function getPreviousWeekRange(currentStart: Date): { start: Date; end: Date } {
  const prevWeekStart = subWeeks(currentStart, 1);
  return getWeekRange(prevWeekStart);
}

export function getWeekDates(weekStart: Date): Date[] {
  return eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  });
}

// ─── Allocation Utilities ────────────────────────────────────────────────────

export function getCellColorClass(
  allocations: Allocation[],
  isWeekend: boolean,
  isHoliday?: boolean
): typeof CELL_COLORS[keyof typeof CELL_COLORS] {
  if (isWeekend) return CELL_COLORS.weekend;
  if (isHoliday) return CELL_COLORS.leave;

  if (!allocations || allocations.length === 0) return CELL_COLORS.idle;

  // Check if any allocation is a leave
  const isLeave = allocations.some(a => a.status === 'pto' || a.status === 'sick');
  if (isLeave) return CELL_COLORS.leave;

  const totalHours = allocations.reduce((sum, a) => sum + Number(a.hours || 0), 0);

  if (totalHours === 0) return CELL_COLORS.idle;
  if (totalHours > WORK_HOURS_PER_DAY) return CELL_COLORS.over;
  if (totalHours >= WORK_HOURS_PER_DAY - 1) return CELL_COLORS.standard; // 7-8h
  return CELL_COLORS.idle; // < 7h on a working day = under-allocated (treated as idle)
}

export function calculateUtilization(totalHours: number, workingDays: number): number {
  if (workingDays === 0) return 0;
  const capacity = workingDays * WORK_HOURS_PER_DAY;
  return Math.round((totalHours / capacity) * 100);
}

export function formatHours(hours: number): string {
  if (hours === 0) return '0h';
  if (Number.isInteger(hours)) return `${hours}h`;
  return `${hours.toFixed(1)}h`;
}

export function isIdleDay(allocation: Allocation | null, isWeekend: boolean, isHoliday?: boolean): boolean {
  if (isWeekend || isHoliday) return false;
  if (!allocation) return true;
  if (allocation.status === 'pto' || allocation.status === 'sick') return false;
  return allocation.hours === 0;
}

export function isOverAllocated(allocation: Allocation | null): boolean {
  if (!allocation) return false;
  return allocation.hours > WORK_HOURS_PER_DAY;
}

// ─── Role Utilities ──────────────────────────────────────────────────────────

export function hasRole(userRoles: UserRole[] | undefined, requiredRole: UserRole): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  if (userRoles.includes('super_admin')) return true;
  return userRoles.includes(requiredRole);
}

export function hasAnyRole(userRoles: UserRole[] | undefined, requiredRoles: UserRole[]): boolean {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  if (userRoles.includes('super_admin')) return true;
  return requiredRoles.some(role => userRoles.includes(role));
}

// ─── Misc ────────────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function exportGridToCSV(gridRows: any[], dates: string[]) {
  if (!gridRows || gridRows.length === 0 || !dates || dates.length === 0) return;
  
  const header = ['Employee', 'Role', ...dates, 'Total Hours'];
  
  const csvRows = [];
  csvRows.push(header.join(','));
  
  for (const row of gridRows) {
    const csvRow = [
      `"${row.user.full_name}"`,
      `"${row.user.roles?.[0] || ''}"`,
    ];
    
    for (const date of dates) {
      const cell = row.cells.find((c: any) => c.date === date);
      const allocation = cell?.allocations?.[0];
      if (allocation) {
        csvRow.push(allocation.hours.toString());
      } else {
        csvRow.push('0');
      }
    }
    
    csvRow.push(row.weeklyTotal.toString());
    csvRows.push(csvRow.join(','));
  }
  
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `allocations-${formatDate(dates[0])}-to-${formatDate(dates[dates.length - 1])}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
