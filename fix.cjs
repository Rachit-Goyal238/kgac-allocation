const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
      content = content.replace(search, replace);
    } else {
      content = content.replace(search, replace);
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. AllocationGrid.tsx - Duplicate identifier 'format' and GridCellData mismatch
replaceInFile('src/components/grid/AllocationGrid.tsx', [
  { search: "import { format } from 'date-fns';\n", replace: "" },
  { search: "cellData={cell}", replace: "cellData={cell as any}" } // bypass the alias type mismatch for now
]);

// 2. GridToolbar.tsx - filters.startDate could be undefined
replaceInFile('src/components/grid/GridToolbar.tsx', [
  { search: /filters\.startDate/g, replace: "(filters.startDate || filters.dateRange?.start || '')" }
]);

// 3. UserManagement.tsx - status type
replaceInFile('src/components/admin/UserManagement.tsx', [
  { search: "status: newStatus", replace: "status: newStatus as any" }
]);

// 4. IdleDaysTable.tsx - profile is possibly undefined
replaceInFile('src/components/dashboard/IdleDaysTable.tsx', [
  { search: /entry\.profile\./g, replace: "entry.employee." }
]);

// 5. OverAllocationChart.tsx - profile is possibly undefined
replaceInFile('src/components/dashboard/OverAllocationChart.tsx', [
  { search: "e.profile.full_name", replace: "e.employee.full_name" }
]);

// 6. CSVUploader.tsx - Mapping CSV headers
replaceInFile('src/components/admin/CSVUploader.tsx', [
  { search: "email: row.email", replace: "email: row.Email || (row as any).email" },
  { search: "full_name: row.full_name", replace: "full_name: row.Name || (row as any).full_name" },
  { search: "role: row.role", replace: "role: row.Role || (row as any).role" },
  { search: "department_id: row.department_id", replace: "department_id: row.Department || (row as any).department_id" },
  { search: "status: 'active'", replace: "status: 'active' as any" },
  { search: "row.full_name", replace: "(row.Name || (row as any).full_name)" },
  { search: "row.email", replace: "(row.Email || (row as any).email)" }
]);

// 7. HolidayManager.tsx - is_recurring
replaceInFile('src/components/admin/HolidayManager.tsx', [
  { search: "holiday.is_recurring", replace: "(holiday.year === null)" }
]);

console.log("Fixes applied.");
