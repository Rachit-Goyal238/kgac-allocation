import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { AdminPage } from '@/pages/AdminPage';"
new_import = "import { AdminPage } from '@/pages/AdminPage';\nimport { AttendancePage } from '@/pages/AttendancePage';"
text = text.replace(import_str, new_import)

route_str = "<Route path=\"/admin\" element={<AdminPage />} />"
new_route = "<Route path=\"/admin\" element={<AdminPage />} />\n                <Route path=\"/attendance\" element={<AttendancePage />} />"
text = text.replace(route_str, new_route)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Injected AttendancePage into App.tsx")
