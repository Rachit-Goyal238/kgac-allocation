import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add lazy import
lazy_insert = "const AuditsPage = lazy(() => import('@/pages/AuditsPage').then(m => ({ default: m.AuditsPage })));\n"
text = text.replace("const AttendancePage = lazy", lazy_insert + "const AttendancePage = lazy")

# Add route (no role guard - accessible to all)
route_insert = """              <Route path="audits" element={
                <Suspense fallback={<PageLoader />}><AuditsPage /></Suspense>
              } />
"""
text = text.replace('<Route index element={<Navigate to="/calendar" replace />} />', '<Route index element={<Navigate to="/calendar" replace />} />\n' + route_insert)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added AuditsPage route")
