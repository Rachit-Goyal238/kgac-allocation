import sys

with open('src/components/admin/CSVUploader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Expected CSV Format Text
old_format = "<li><code>Department</code>, <code>Entity</code>, <code>Zone</code></li>"
new_format = "<li><code>Department</code>, <code>Entity</code>, <code>Zone</code>, <code>Monthly Salary</code></li>"
text = text.replace(old_format, new_format)

# 2. Update mapping logic
old_mapping = """          return {
            employee_id: rowData['Employee ID'] || rowData.employee_id,
            first_name: rowData['First Name'] || rowData.first_name,
            last_name: rowData['Last Name'] || rowData.last_name,
            personal_email: rowData['Personal Email'] || rowData.personal_email || null,
            phone_number: rowData['Phone Number'] || rowData['Phone'] || rowData.phone_number || null,
            role: (rowData.Role || rowData.role || 'employee').toLowerCase(),
            department_id: deptId,
            entity: (rowData.Entity || rowData.entity || 'KGAC').toUpperCase()
          };"""

new_mapping = """          return {
            employee_id: rowData['Employee ID'] || rowData.employee_id,
            first_name: rowData['First Name'] || rowData.first_name,
            last_name: rowData['Last Name'] || rowData.last_name,
            personal_email: rowData['Personal Email'] || rowData.personal_email || null,
            phone_number: rowData['Phone Number'] || rowData['Phone'] || rowData.phone_number || null,
            role: (rowData.Role || rowData.role || 'employee').toLowerCase(),
            department_id: deptId,
            entity: (rowData.Entity || rowData.entity || 'KGAC').toUpperCase(),
            zone: rowData.Zone || rowData.zone || null,
            monthly_salary: rowData['Monthly Salary'] || rowData.monthly_salary ? Number(rowData['Monthly Salary'] || rowData.monthly_salary) : null
          };"""
text = text.replace(old_mapping, new_mapping)

with open('src/components/admin/CSVUploader.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: CSVUploader updated.")
