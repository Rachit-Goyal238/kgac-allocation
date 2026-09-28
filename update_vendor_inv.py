import sys

with open('src/components/finance/VendorInvoices.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { exportToCSV } from '@/lib/export';"
new_import = "import { exportToCSV, exportToExcel } from '@/lib/export';\nimport { printInvoice } from '@/lib/invoice';\nimport { Printer } from 'lucide-react';"
text = text.replace(import_str, new_import)

# Replace the export button
btn_search = "<Button variant=\"outline\" className=\"mr-2\" onClick={() => exportToCSV(invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [], 'vendor_invoices.csv')}><Download className=\"h-4 w-4 mr-2\"/> Export CSV</Button>"
btn_replace = "<Button variant=\"outline\" className=\"mr-2\" onClick={() => exportToExcel(invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [], [], 'vendor_invoices.xlsx')}><Download className=\"h-4 w-4 mr-2\"/> Export Excel</Button>"
text = text.replace(btn_search, btn_replace)

# Add Print button next to Mark Paid
action_search = """<TableCell className="text-right">
                    {inv.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'paid' })}>
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>"""

action_replace = """<TableCell className="text-right space-x-2">
                    {inv.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'paid' })}>
                        Mark Paid
                      </Button>
                    )}
                    {inv.status === 'paid' && (
                      <Button size="sm" variant="secondary" className="text-xs" onClick={() => printInvoice(inv)}>
                        <Printer className="h-3 w-3 mr-1" /> Print PDF
                      </Button>
                    )}
                  </TableCell>"""
                  
text = text.replace(action_search, action_replace)

with open('src/components/finance/VendorInvoices.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated VendorInvoices")
