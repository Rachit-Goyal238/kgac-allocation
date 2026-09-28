import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { useAuthContext } from '@/contexts/AuthContext';"
new_import = "import { useAuthContext } from '@/contexts/AuthContext';\nimport { useNotifications } from '@/hooks/useNotifications';"
text = text.replace(import_str, new_import)

fn_start = "export function Sidebar({ onClose }: { onClose?: () => void }) {"
new_fn_start = "export function Sidebar({ onClose }: { onClose?: () => void }) {\n  const { unreadCount } = useNotifications();"
text = text.replace(fn_start, new_fn_start)

dashboard_link = """            <NavLink to="/dashboard" onClick={handleLinkClick} className={navLinkClasses}>
              <BarChart3 className="mr-3 h-5 w-5 flex-shrink-0" />
              Dashboard
            </NavLink>"""

new_dashboard_link = """            <NavLink to="/dashboard" onClick={handleLinkClick} className={navLinkClasses}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <BarChart3 className="mr-3 h-5 w-5 flex-shrink-0" />
                  Dashboard
                </div>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </NavLink>"""
text = text.replace(dashboard_link, new_dashboard_link)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added unread badge to Sidebar")
