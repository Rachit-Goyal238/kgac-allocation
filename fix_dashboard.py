import sys

with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { OverdueAssetReminder } from '@/components/dashboard/OverdueAssetReminder';"
new_import = "import { OverdueAssetReminder } from '@/components/dashboard/OverdueAssetReminder';\nimport { NotificationAlerts } from '@/components/dashboard/NotificationAlerts';"
text = text.replace(import_str, new_import)

injection_str = "{/* Personal reminder cards ?\" visible to all users */}"
new_injection = "<NotificationAlerts />\n\n      {/* Personal reminder cards ?\" visible to all users */}"
text = text.replace(injection_str, new_injection)

with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added NotificationAlerts to Dashboard")
