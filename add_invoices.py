import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
new_import = "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';\nimport { VendorInvoices } from '@/components/finance/VendorInvoices';"
text = text.replace(import_str, new_import)

tabs_list_str = "<TabsTrigger value=\"projects\" className=\"flex items-center gap-2\"><Building className=\"h-4 w-4\"/> Manual Projects Expenses</TabsTrigger>"
new_tabs_list = "<TabsTrigger value=\"projects\" className=\"flex items-center gap-2\"><Building className=\"h-4 w-4\"/> Manual Projects Expenses</TabsTrigger>\n          <TabsTrigger value=\"invoices\" className=\"flex items-center gap-2\"><FileText className=\"h-4 w-4\"/> Vendor Invoices</TabsTrigger>"
text = text.replace(tabs_list_str, new_tabs_list)

tabs_content_str = "</TabsContent>\n      </Tabs>"
new_tabs_content = "</TabsContent>\n\n        <TabsContent value=\"invoices\" className=\"space-y-6\">\n          <VendorInvoices />\n        </TabsContent>\n      </Tabs>"
text = text.replace(tabs_content_str, new_tabs_content)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added VendorInvoices tab to BillingPage")
