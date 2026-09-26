// â”€â”€â”€ Enums & Literal Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type UserRole =
  | "employee"
  | "audit_executive"
  | "audit_manager"
  | "planner"
  | "backend_staff"
  | "manager"
  | "client_head"
  | "hr"
  | "finance"
  | "admin"
  | "super_admin"
  | "pending";
export type UserStatus = "active" | "pending" | "inactive";
export type AllocationStatus =
  "billable" | "internal" | "pto" | "sick";
export type TaskStatus =
  "not_started" | "in_progress" | "completed" | "pending_review" | "blocked";
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ROLE_CHANGE"
  | "STATUS_CHANGE"
  | "LOGIN"
  | "APPROVAL";
export type UserEntity = "KGAC" | "KPL";

// â”€â”€â”€ Database Row Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface Profile {
  id: string;
  email: string;
  employee_id?: string;
  username?: string;
  personal_email?: string;
  full_name: string;
  avatar_url: string | null;
  roles: UserRole[];
  entity: UserEntity | null;
  entity_selected?: boolean;
  department_id: string | null;
  status: UserStatus;
  zone?: string | null;
  is_internal_vendor?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  manager_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  color: string;
  is_active: boolean;
  is_billable: boolean;
  client_id: string | null;
  contact_person_id?: string | null;
  created_at: string;
}

export interface Allocation {
  id: string;
  user_id: string;
  allocation_date: string; // 'YYYY-MM-DD'
  date?: string; // alias for allocation_date used by some components
  project_id: string | null;
  hours: number;
  status: AllocationStatus;
  task_status: TaskStatus;
  notes: string | null;
  last_edited_by: string | null;
  audit_id?: string;
  updated_at: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  type: "sick" | "pto";
  status: "pending" | "approved" | "rejected";
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlanketHoliday {
  id: string;
  date: string; // 'YYYY-MM-DD'
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: AuditAction;
  table_name: string;
  record_id: string | null;
  before_values: Record<string, unknown> | null;
  after_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// â”€â”€â”€ Composite / View Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ProfileWithDepartment extends Profile {
  department?: Department | null;
}

export interface AllocationWithDetails extends Allocation {
  profile?: Profile;
  project?: Project;
}

// â”€â”€â”€ Grid Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GridCellDay {
  date: string;
  allocations: Allocation[];
  totalHours: number;
}

export interface GridRow {
  user: Profile;
  employee: Profile; // alias
  cells: GridCellDay[];
  allocations: Record<string, Allocation | null>; // keyed by 'YYYY-MM-DD'
  weeklyTotal: number;
  totalHours: number; // alias
  utilization: number; // percentage
}

export interface GridCellData {
  allocation: Allocation | null;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isEditable: boolean;
  // aliases used by grid components
  date?: string;
  allocations?: Allocation[];
  totalHours?: number;
}

// â”€â”€â”€ Dashboard Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface DashboardMetrics {
  totalIdleDays: number;
  teamUtilization: number; // percentage
  overAllocatedCount: number;
  activeHeadcount: number;
  totalCapacityHours: number;
  totalLoggedHours: number;
}

export interface ExpenseBillingMetrics {
  totalOwed: number;
  owedByVendor: Record<string, number>;
  owedByProject: Record<string, number>;
  owedByMonth: Record<string, number>;
  idleCostLeakage: number; // cost of idle external resources
}

export interface ManDaysMetrics {
  totalManDays: number;
  internalManDays: number;
  externalManDays: number;
  byProject: Record<
    string,
    { total: number; internal: number; external: number }
  >;
  byMonth: Record<
    string,
    { total: number; internal: number; external: number }
  >;
}

export interface CompletionMetrics {
  totalTasks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  blocked: number;
  pendingReview: number;
  completionPercentage: number;
}

export interface IdleDayEntry {
  userId?: string;
  employee: Profile;
  profile?: Profile; // alias
  idleDayCount: number;
  idleDaysCount?: number; // alias
  lastActiveDate: string | null;
}

export interface OverAllocationEntry {
  userId?: string;
  employee: Profile;
  profile?: Profile; // alias
  overAllocatedDays: number;
  maxHoursInDay: number;
}

// â”€â”€â”€ Offline Queue Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface OfflineAction {
  id: string;
  type: "upsert" | "delete" | "upsert_allocation" | "delete_allocation";
  table: string;
  payload: Record<string, unknown>;
  timestamp: string | number;
  retryCount: number;
}

// â”€â”€â”€ CSV Import Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CSVEmployeeRow {
  Name: string;
  Email: string;
  Role: string;
  Department: string;
}

export interface CSVValidationResult {
  row: number;
  data: CSVEmployeeRow;
  isValid: boolean;
  errors: string[];
}

// â”€â”€â”€ Filter Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface GridFilters {
  departmentId: string | null;
  projectId: string | null;
  searchQuery: string;
  dateRange: {
    start: string; // 'YYYY-MM-DD'
    end: string; // 'YYYY-MM-DD'
  };
  // Flat aliases used by some components
  startDate?: string;
  endDate?: string;
}

// â”€â”€â”€ Task Status Labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TASK_STATUS_OPTIONS: {
  value: TaskStatus;
  label: string;
  color: string;
}[] = [
  { value: "not_started", label: "Not Started", color: "bg-gray-400" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { value: "completed", label: "Completed", color: "bg-green-500" },
  { value: "pending_review", label: "Pending Review", color: "bg-yellow-500" },
  { value: "blocked", label: "Blocked", color: "bg-red-500" },
];

export interface Audit {
  id: string;
  client_id: string;
  project_id: string | null;
  store_name: string;
  store_code: string | null;
  location: string | null;
  audit_date: string;
  audit_type: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  billing_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  contact_email: string | null;
  type: "agency" | "individual";
  default_human_rate: number | null;
  default_asset_rate: number | null;
  created_at: string;
}

export interface VendorResource {
  id: string;
  vendor_id: string;
  name: string;
  type: "man" | "asset";
  default_rate: number | null;
  created_at: string;
}

export interface AuditTeam {
  id: string;
  audit_id: string;
  user_id: string | null;
  vendor_id: string | null;
  vendor_resource_id?: string | null;
  role: "lead" | "executive" | "asset";
  agreed_rate: number | null;
  created_at: string;
}

export interface ProjectAssignment {
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface VendorRate {
  id: string;
  vendor_id: string;
  zone_or_reason: string;
  human_rate: number | null;
  asset_rate: number | null;
  created_at: string;
}

export interface InternalAsset {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'in_use' | 'maintenance';
  serial_number?: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

export interface AssetRequest {
  id: string;
  asset_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned' | 'return_pending';
  manager_id: string | null;
  return_notes?: string | null;
  return_requested_at?: string | null;
  created_at: string;
  updated_at: string;
}


