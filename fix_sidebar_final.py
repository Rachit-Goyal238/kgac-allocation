import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Inject Attendance Link
# Find Internal Assets link
assets_link = """          <NavLink to="/assets" onClick={handleLinkClick} className={navLinkClasses}>
            <Monitor className="mr-3 h-5 w-5 flex-shrink-0" />
            Internal Assets
          </NavLink>"""

attendance_link = """          <NavLink to="/assets" onClick={handleLinkClick} className={navLinkClasses}>
            <Monitor className="mr-3 h-5 w-5 flex-shrink-0" />
            Internal Assets
          </NavLink>
          
          {hasAnyRole(user, ['admin', 'super_admin', 'manager', 'hr']) && (
            <NavLink to="/attendance" onClick={handleLinkClick} className={navLinkClasses}>
              <Clock className="mr-3 h-5 w-5 flex-shrink-0" />
              Attendance
            </NavLink>
          )}"""

text = text.replace(assets_link, attendance_link)

# 2. Inject ClockOutButton
signout_button = """        <Button 
          variant="ghost" 
          className="mt-4 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>"""
        
clockout_insert = """        {ENABLE_ATTENDANCE_SYSTEM && <ClockOutButton user={user} />}
        <Button 
          variant="ghost" 
          className="mt-4 w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" 
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>"""

text = text.replace(signout_button, clockout_insert)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Injected Sidebar elements properly")
