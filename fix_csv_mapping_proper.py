import sys

with open('src/components/admin/CSVUploader.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('const handleImport = async () => {')
if start_idx != -1:
    end_idx = text.find('const responseData = await bulkInsert(profiles);', start_idx)
    
    old_block = text[start_idx:end_idx]
    
    new_block = """const handleImport = async () => {
    try {
      const profiles = validRows.map(r => {
        const rowData = r.data as any;
        const deptName = rowData.Department || rowData.department_id || null;
        let deptId = deptName;
        
        if (deptName && departments) {
          const matchedDept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
          if (matchedDept) deptId = matchedDept.id;
        }

        return {
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
        };
      });
      
      """
                    
    text = text.replace(old_block, new_block)
    with open('src/components/admin/CSVUploader.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
        print("Success: Updated CSVUploader properly.")
else:
    print("Could not find block.")
