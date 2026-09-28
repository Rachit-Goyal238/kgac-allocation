import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("else exportToExcel(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}`);", "else exportToExcel(exportRows, undefined, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);")
text = text.replace("if (exportFormat === 'csv') exportToCSV(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}`);", "if (exportFormat === 'csv') exportToCSV(exportRows, `audit_margins_${format(new Date(), 'yyyy-MM-dd')}.csv`);")

text = text.replace("else exportToExcel(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}`);", "else exportToExcel(exportRows, undefined, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);")
text = text.replace("if (exportFormat === 'csv') exportToCSV(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}`);", "if (exportFormat === 'csv') exportToCSV(exportRows, `manual_project_costs_${format(new Date(), 'yyyy-MM-dd')}.csv`);")

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Fixed Export parameters.")
