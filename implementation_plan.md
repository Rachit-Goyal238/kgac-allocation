# Goal: Gut the holidays and public_holiday logic

Remove all code and database artifacts related to `blanket_holidays` and the `public_holiday` allocation status.

## Proposed Changes

### Database Migration
#### [NEW] `025_remove_holidays.sql`
- `DROP TABLE IF EXISTS blanket_holidays CASCADE;`
- Remove `public_holiday` from the `allocations` status CHECK constraint:
  - `ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_status_check;`
  - `ALTER TABLE allocations ADD CONSTRAINT allocations_status_check CHECK (status IN ('billable', 'internal', 'pto', 'sick'));`
- Delete any existing allocations with status `'public_holiday'`.

### Frontend Files to Delete
#### [DELETE] `src/components/admin/HolidayManager.tsx`
#### [DELETE] `src/hooks/useBlanketHolidays.ts`

### Frontend Files to Modify

#### `src/pages/AdminPage.tsx`
- Remove `HolidayManager` import.
- Remove `holidays` Tab (Triggers and Content).

#### `src/components/layout/Sidebar.tsx`
- Remove the `/admin/holidays` NavLink.

#### `src/App.tsx`
- Remove the `<Route path="admin/holidays" element={<AdminPage />} />`

#### `src/hooks/useRealtime.ts`
- Remove the `postgres_changes` subscription for `blanket_holidays`.

#### `src/components/grid/GridCell.tsx`
- Remove `useBlanketHolidays` import and logic.
- Remove `isHoliday` props and conditional classes that darken the cell for blanket holidays.

#### `src/lib/types.ts`
- Remove `"public_holiday"` from the Allocation status union type.

#### `src/lib/constants.ts`
- Remove `{ value: 'public_holiday', label: 'Public Holiday', color: 'bg-gray-400' }` from `STATUS_OPTIONS`.
- Remove `public_holiday: 'Public Holiday'` from `STATUS_LABELS`.

#### `src/components/shared/StatusBadge.tsx`
- Remove `public_holiday: 'bg-gray-100 text-gray-800'` from the color map.

#### `src/lib/utils.ts`
- Remove `|| a.status === 'public_holiday'` from `isLeave` calculations.

#### `src/hooks/useAllocations.ts`
- Remove `|| a.status === 'public_holiday'` from `isLeave` calculations in the allocation grid builder.

#### `src/hooks/useDashboardMetrics.ts`
- Remove `'public_holiday'` from `.includes(a.status)` in leave metric calculations.

#### `src/components/grid/GridCellEditor.tsx`
- Remove `|| a.status === 'public_holiday'` from `hasLeave`.

#### `src/lib/export.ts`
- Remove `holidays` array argument and `isBlanketHoliday` logic from Excel/CSV exports.

## Verification Plan
- Build the app (`npm run build`)
- Check that the Admin menu no longer lists "Holidays".
- Check that "Public Holiday" is no longer an option when assigning allocations.
