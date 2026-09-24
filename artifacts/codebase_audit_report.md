# Comprehensive Codebase Audit Report

This report summarizes the findings of the three specialized subagents (Frontend UI, Database & API, and Auth & Security) after scanning the Team Allocation Calendar codebase.

## 🛡️ Authentication & Authorization Bugs
**1. "Session Expired" Flash on Login**
*   **Location:** `useAuth.ts` & `ProtectedRoute.tsx`
*   **Issue:** Because `isLoading` isn't properly toggled to `true` during the async `fetchProfile` sequence inside `onAuthStateChange`, the UI temporarily believes you are authenticated but have no profile. This causes the fatal red "Session Expired / Account Deleted" screen to flash jarringly during successful logins.

**2. Routing Precedence Flaw for Locked Accounts**
*   **Location:** `ProtectedRoute.tsx`
*   **Issue:** The check for missing entity selection (`!profile.entity_selected`) runs *before* the check for deactivated/pending statuses. Deactivated users are forced to select an entity before being told their account is locked. 

**3. Broken Role Hierarchy**
*   **Location:** `src/lib/utils.ts` (`hasRole`, `hasAnyRole`)
*   **Issue:** Roles are checked as discrete tags rather than a hierarchy. An `admin` might be denied access to a route requiring `manager` unless they explicitly have `manager` hardcoded into their database array.

## 💾 Database & API Flaws
**1. RLS Security Vulnerability**
*   **Location:** `016_v3_feature_updates.sql`
*   **Issue:** The Row Level Security (RLS) policies for `vendor_rates`, `internal_assets`, and `asset_requests` were written as `auth.role() = 'authenticated'`. This allows *any* logged-in employee to insert, update, or delete asset records and vendor rates, bypassing the Admin roles completely.

**2. Duplicate Allocation Data Corruption**
*   **Location:** `src/hooks/useAllocations.ts`
*   **Issue:** The `useSaveAllocations` mutation runs a `.delete()` on existing allocations before inserting new ones, but fails to check the `{ error }` response. Because Supabase JS doesn't reject postgREST errors as promises, if the delete fails, the insert proceeds anyway, creating duplicate records for the same day.

**3. Schema vs. TypeScript Type Mismatches**
*   **Location:** `src/lib/types.ts`
*   **Issue:** Missing properties: `audit_id` on Allocations, `serial_number` on InternalAssets. Furthermore, `AssetRequest` status types are missing the `'returned'` state which was added in the `022` migration.

## 🎨 Frontend UI & Logic Bugs
**1. Critical Grid Editing Bypass**
*   **Location:** `GridCell.tsx`
*   **Issue:** The `canEdit()` check verifies if the date is within +/- 14 days, but forgets to verify if `userId === profile.id`. A standard employee can edit *any other employee's* allocation as long as the date is recent.

**2. Hidden Grid Data**
*   **Location:** `AllocationGrid.tsx`
*   **Issue:** The grid maps over dates but explicitly only passes `cell.allocations[0]` to the cell renderer. If an employee has multiple allocations on the same day (e.g. split between two projects), the grid completely hides all data except the first one.

**3. Hardcoded Weekends**
*   **Location:** `AllocationGrid.tsx`
*   **Issue:** The `isWe` logic specifically checks if `date.getDay() === 0` (Sunday), completely ignoring Saturdays (6) and treating them as standard work days.

**4. Date Crashes & Infinite Loading States**
*   **Location:** `ReconciliationPage.tsx`, `ManDaysPage.tsx`, `CompletionPage.tsx`
*   **Issue:** Across multiple pages, if the API call errors out, `isLoading` becomes false but `data` is undefined. Pages like ManDays get stuck on "Loading man-days data..." permanently. Additionally, raw database dates are pushed into `date-fns format()` without validation; if a date is malformed or missing, it will crash the entire page render.

**5. Missing Mutation Error Toasts**
*   **Location:** `AssetsPage.tsx`
*   **Issue:** None of the asset mutations (request, approve, add, reclaim) have `onError` toast callbacks. If a network error occurs, it fails silently and the user thinks their action succeeded.
