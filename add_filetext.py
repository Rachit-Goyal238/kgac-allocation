import sys

with open('src/pages/BillingPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { Loader2, TrendingDown, Clock, Building, Briefcase } from 'lucide-react';"
new_import = "import { Loader2, TrendingDown, Clock, Building, Briefcase, FileText } from 'lucide-react';"
text = text.replace(import_str, new_import)

with open('src/pages/BillingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added FileText import")
