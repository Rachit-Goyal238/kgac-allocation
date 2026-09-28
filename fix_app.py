import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));"
new_import = "const TimesheetApprovalsPage = lazy(() => import('@/pages/TimesheetApprovalsPage').then(m => ({ default: m.TimesheetApprovalsPage })));\n" + import_str

text = text.replace(import_str, new_import)

route_str = """            <Route
              path="assets"
              element={
                <Suspense fallback={<PageLoader />}><AssetsPage /></Suspense>
              }
            />"""

new_route = """            <Route
              path="approvals"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager']}>
                  <Suspense fallback={<PageLoader />}><TimesheetApprovalsPage /></Suspense>
                </ProtectedRoute>
              }
            />\n""" + route_str

text = text.replace(route_str, new_route)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated App.tsx")
