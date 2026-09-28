import sys

with open('src/components/finance/VendorInvoices.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { Loader2, Plus, FileText, CheckCircle2, Clock } from 'lucide-react';"
new_import = "import { Loader2, Plus, FileText, CheckCircle2, Clock, Download } from 'lucide-react';\nimport { exportToCSV } from '@/lib/export';"
text = text.replace(import_str, new_import)

button_str = "<DialogTrigger asChild>\n            <Button><Plus className=\"h-4 w-4 mr-2\" /> Create Invoice</Button>\n          </DialogTrigger>"
new_button_str = "<Button variant=\"outline\" className=\"mr-2\" onClick={() => exportToCSV(invoices?.map(i => ({ Date: new Date(i.created_at).toLocaleDateString(), Vendor: i.vendor?.name, Audit: i.audit?.store_name, Amount: i.amount, Status: i.status, Notes: i.notes })) || [], 'vendor_invoices.csv')}><Download className=\"h-4 w-4 mr-2\"/> Export CSV</Button>\n          <DialogTrigger asChild>\n            <Button><Plus className=\"h-4 w-4 mr-2\" /> Create Invoice</Button>\n          </DialogTrigger>"
text = text.replace(button_str, new_button_str)

action_str = "<Button size=\"sm\" variant=\"outline\" className=\"text-xs\" onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'paid' })}>\n                        Mark Paid\n                      </Button>"
new_action_str = "<Button size=\"sm\" variant=\"outline\" className=\"text-xs\" onClick={() => updateStatus.mutate({ id: inv.id, newStatus: 'paid' })}>\n                        Mark Paid\n                      </Button>"
text = text.replace(action_str, new_action_str)

with open('src/components/finance/VendorInvoices.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added export button")
