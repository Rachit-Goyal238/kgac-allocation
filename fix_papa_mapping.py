import sys

with open('src/components/admin/CSVUploader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

bad_block = """return {
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

good_block = """return {
            row: index + 1,
            data: row,
            isValid: errors.length === 0,
            errors
          };"""

text = text.replace(bad_block, good_block)

with open('src/components/admin/CSVUploader.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: Reverted Papa parse mapping.")
