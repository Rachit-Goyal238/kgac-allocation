import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Define the old block to replace
start_marker = "{/* Admin routes */}"
end_marker = "{/* Super Admin routes */}"

if start_marker in text and end_marker in text:
    before = text.split(start_marker)[0]
    after = text.split(end_marker)[1]
    
    new_admin_routes = """{/* Admin routes combined to prevent remounting */}
            <Route
              path="admin/:tab?"
              element={
                <ProtectedRoute allowedRoles={['admin', 'super_admin', 'hr', 'manager', 'client_head']}>
                  <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
                </ProtectedRoute>
              }
            />

            {/* Super Admin routes */}"""
            
    text = before + new_admin_routes + after
    
    with open('src/App.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Combined Admin routes into a single parameterized route")
else:
    print("Could not find markers")
