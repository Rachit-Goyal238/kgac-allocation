import sys

with open('src/components/finance/VendorInvoices.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { exportToCSV, exportToExcel } from '@/lib/export';"
new_import = "import { exportToCSV, exportToExcel } from '@/lib/export';\nimport { ExportButton } from '@/components/shared/ExportButton';"
text = text.replace(import_str, new_import)

btn_search = "<Button variant=\"outline\" className=\"mr-2\" onClick={() => exportToExcel(invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [], [], 'vendor_invoices.xlsx')}><Download className=\"h-4 w-4 mr-2\"/> Export Excel</Button>"
btn_replace = """<ExportButton onExport={(format) => {
            const data = invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [];
            if (format === 'csv') exportToCSV(data, 'vendor_invoices.csv');
            else exportToExcel(data, [], 'vendor_invoices.xlsx');
          }} />"""
          
text = text.replace(btn_search, btn_replace)

with open('src/components/finance/VendorInvoices.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated VendorInvoices export button")
