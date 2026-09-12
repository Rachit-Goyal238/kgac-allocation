# Team Allocation Calendar - User Manual

## Getting Started

1. **Login**: Navigate to the application URL and click "Sign in with Google".
2. **First Login**: If this is your first time, your account will be placed in a "pending" state. An administrator must approve your account and assign your role and department before you can use the system.

## Roles Overview

- **Employee**: Can view the calendar and update their own allocations.
- **Manager**: Can view the calendar for their department, update allocations for their team members, and view dashboard metrics for their department.
- **Admin**: Has full access. Can view/edit all allocations, view all metrics, manage users, configure holidays, and handle system settings.

## Using the Allocation Calendar

The Calendar page is the main interface for managing time allocations.

- **Navigation**: Use the "Previous Week" and "Next Week" buttons to change the visible date range.
- **Editing Cells**: Click on a cell in the grid to edit the allocation for that day. A popover will appear where you can set the Project/Status and the number of hours.
- **Color Coding**:
  - `Blue`: Billable project work
  - `Purple`: Internal/Non-billable work
  - `Orange`: Bench/Unallocated time
  - `Gray`: PTO/Leave
  - `Red Background`: Over-allocated (more than 8 hours scheduled for a single day)

## Dashboard

Available to Managers and Admins, the Dashboard provides insights into team utilization.

- **Metrics**: View Total Idle Days, Team Utilization %, Over-Allocated Count, and Active Headcount.
- **Filters**: Adjust the date range and department filter to scope the metrics.
- **Charts**: Analyze daily utilization breakdown (Billable vs Internal vs PTO) and over-allocation frequency.
- **Export**: Click the Export button to download the current dashboard data as a CSV.

## Administration

The Admin panel (accessible only to Admins) is divided into three tabs:

### 1. User Management
- **Approvals**: Quickly approve pending users, assigning them a role and department.
- **User List**: Search and filter active/inactive users. Change roles and departments directly from the table.
- **CSV Onboarding**: Click "Import CSV" to upload a list of users. You can download the sample template, fill it out, and drag-and-drop it into the modal for automatic validation and bulk creation.

### 2. Holiday Management
- **Add Holidays**: Set dates as company holidays. Check "Recurs annually" for holidays that happen on the same date every year.
- **Manage**: View and delete existing holidays. Holidays appear as non-working days on the calendar grid.

### 3. Settings (Demo Data)
- **Load Demo Dataset**: Fills the database with 100 sample employees and 30 days of allocation data for testing.
- **Clear Demo Data**: Removes all sample data.

## Offline Mode
The application supports offline capabilities. If you lose internet connection, you can still view cached data and make allocation changes. Changes made offline will be queued and automatically synced with the server once your connection is restored.

## Troubleshooting
- **Cannot see certain departments**: Ensure your role is set to Admin. Managers only see their assigned department.
- **Changes not saving**: Check your network connection. If offline, changes will sync later.
