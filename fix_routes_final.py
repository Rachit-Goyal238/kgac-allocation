import sys, re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix 1: /completion - add ProtectedRoute
old_completion = """              <Route path="completion" element={
                <Suspense fallback={<PageLoader />}><CompletionPage /></Suspense>
              } />"""
new_completion = """              <Route path="completion" element={
                <ProtectedRoute allowedRoles={["manager", "admin", "super_admin"]}>
                  <Suspense fallback={<PageLoader />}><CompletionPage /></Suspense>
                </ProtectedRoute>
              } />"""
text = text.replace(old_completion, new_completion)

# Fix 2: /planner - add admin, super_admin
old_planner = "allowedRoles={['planner', 'manager', 'client_head']}"
new_planner = "allowedRoles={['planner', 'manager', 'client_head', 'admin', 'super_admin']}"
text = text.replace(old_planner, new_planner)

# Fix 3: /attendance - add Suspense
old_attendance = """              <Route path="attendance" element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager', 'hr']}>
                  <AttendancePage />
                </ProtectedRoute>
              } />"""
new_attendance = """              <Route path="attendance" element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'manager', 'hr']}>
                  <Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>
                </ProtectedRoute>
              } />"""
text = text.replace(old_attendance, new_attendance)

# Fix 4: add /auth/reset-password route (near /auth/callback)
old_callback = """          <Route path="/auth/callback" element={<AuthCallback />} />"""
new_callback = """          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/reset-password" element={<AuthCallback />} />"""
text = text.replace(old_callback, new_callback)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed App.tsx routes")
