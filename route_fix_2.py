import sys
import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add the route right after <Route index element={<Navigate to="/calendar" replace />} />
route_insert = """
            <Route path="attendance" element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager', 'hr']}>
                <AttendancePage />
              </ProtectedRoute>
            } />"""

text = text.replace('<Route index element={<Navigate to="/calendar" replace />} />', '<Route index element={<Navigate to="/calendar" replace />} />' + route_insert)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added AttendancePage Route")
