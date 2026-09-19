import type { AllocationStatus } from './types';

// ─── Work Configuration ──────────────────────────────────────────────────────

export const WORK_HOURS_PER_DAY = 8;
export const COMPANY_DOMAIN = 'kgac.in';

// ─── Allocation Status Options ───────────────────────────────────────────────

export const ALLOCATION_STATUSES: { value: AllocationStatus; label: string; color: string }[] = [
  { value: 'billable', label: 'Billable', color: 'bg-blue-500' },
  { value: 'internal', label: 'Internal', color: 'bg-purple-500' },
  { value: 'pto', label: 'PTO / Leave', color: 'bg-gray-500' },
  { value: 'sick', label: 'Sick', color: 'bg-orange-500' },
  { value: 'public_holiday', label: 'Public Holiday', color: 'bg-gray-400' },
];

export const STATUS_LABELS: Record<AllocationStatus, string> = {
  billable: 'Billable',
  internal: 'Internal',
  pto: 'PTO / Leave',
  sick: 'Sick',
  public_holiday: 'Public Holiday',
};

// ─── Cell Color Coding ───────────────────────────────────────────────────────

export const CELL_COLORS = {
  idle: {
    bg: 'bg-red-100 dark:bg-red-950',
    border: 'border-red-300 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
  },
  standard: {
    bg: 'bg-green-100 dark:bg-green-950',
    border: 'border-green-300 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
  },
  over: {
    bg: 'bg-amber-100 dark:bg-amber-950',
    border: 'border-amber-300 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  leave: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-700',
    text: 'text-gray-500 dark:text-gray-400',
  },
  weekend: {
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-400 dark:text-gray-600',
  },
  empty: {
    bg: 'bg-white dark:bg-gray-950',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-400 dark:text-gray-600',
  },
} as const;

// ─── Role Hierarchy ──────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  pending: 'Pending',
  employee: 'Employee',
  audit_executive: 'Audit Executive',
  audit_manager: 'Audit Manager',
  planner: 'Planner',
  backend_staff: 'Backend Staff',
  manager: 'Manager',
  client_head: 'Client Head',
  hr: 'HR',
  finance: 'Finance',
  admin: 'Admin',
  super_admin: 'Super Admin',
} as const;

// ─── Days ────────────────────────────────────────────────────────────────────

export const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// 📅 CSV Template 📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅📅

export const SAMPLE_CSV_CONTENT = `Name,Email,Role,Department,Entity,Zone
John Doe,john.doe@kgac.in,audit_executive,Engineering,KGAC,North
Jane Smith,jane.smith@kgac.in,audit_manager,Design,KPL,South
Alice Brown,alice.brown@kgac.in,employee,Engineering,KGAC,East
Charlie Davis,charlie.davis@kgac.in,employee,Operations,KGAC,West`;

// ─── Default Departments ─────────────────────────────────────────────────────

export const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Marketing',
  'Operations',
  'Finance',
  'Human Resources',
  'Sales',
] as const;

// ─── Default Projects ────────────────────────────────────────────────────────

export const DEFAULT_PROJECTS = [
  { name: 'Project Alpha', code: 'ALPHA', color: '#3B82F6', is_billable: true },
  { name: 'Project Beta', code: 'BETA', color: '#8B5CF6', is_billable: true },
  { name: 'Project Gamma', code: 'GAMMA', color: '#10B981', is_billable: true },
  { name: 'Internal Ops', code: 'INT-OPS', color: '#6B7280', is_billable: false },
  { name: 'Training', code: 'TRAIN', color: '#F59E0B', is_billable: false },
  { name: 'Bench', code: 'BENCH', color: '#EF4444', is_billable: false },
] as const;

// ─── Task Status Configuration ───────────────────────────────────────────────

export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  pending_review: 'Pending Review',
  blocked: 'Blocked',
};

export const TASK_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  pending_review: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
};
