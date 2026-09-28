import sys

# 1. Add Gatekeeper to AppLayout.tsx
with open('src/components/layout/AppLayout.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_insert = "import { AttendanceGatekeeper } from '@/components/layout/AttendanceGatekeeper';\n"
text = import_insert + text

layout_search = """export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent">"""
layout_replace = """export function AppLayout() {
  return (
    <AttendanceGatekeeper>
    <div className="flex h-screen overflow-hidden bg-transparent">"""
text = text.replace(layout_search, layout_replace)

close_search = """    </div>
  );
}"""
close_replace = """    </div>
    </AttendanceGatekeeper>
  );
}"""
text = text.replace(close_search, close_replace)

with open('src/components/layout/AppLayout.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

# 2. Add Route to App.tsx
with open('src/App.tsx', 'r', encoding='utf-8') as f:
    app_text = f.read()

import_route = "const AttendancePage = lazy(() => import('@/pages/AttendancePage').then(m => ({ default: m.AttendancePage })));\n"
app_text = app_text.replace("const AuthCallback = lazy", import_route + "const AuthCallback = lazy")

route_search = "<Route path=\"admin\" element={<AdminPage />} />"
route_replace = "<Route path=\"admin\" element={<AdminPage />} />\n                <Route path=\"attendance\" element={<AttendancePage />} />"
app_text = app_text.replace(route_search, route_replace)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(app_text)

print("Fixed layout and routing")
