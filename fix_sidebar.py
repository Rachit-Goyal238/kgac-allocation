import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { CalendarDays, BarChart3, ClipboardList, CheckCircle2, DollarSign, Activity, Users, Building2, FolderKanban, Settings, Database, Shield, Monitor, Calculator } from 'lucide-react';"
new_import = "import { CalendarDays, BarChart3, ClipboardList, CheckCircle2, DollarSign, Activity, Users, Building2, FolderKanban, Settings, Database, Shield, Monitor, Calculator, CheckSquare } from 'lucide-react';"
text = text.replace(import_str, new_import)

completion_str = """          {isManagerPlus && (
            <NavLink to="/completion" onClick={handleLinkClick} className={navLinkClasses}>
              <CheckCircle2 className="mr-3 h-5 w-5 flex-shrink-0" />
              Completion
            </NavLink>
          )}"""

approvals_str = """          {isManagerPlus && (
            <NavLink to="/approvals" onClick={handleLinkClick} className={navLinkClasses}>
              <CheckSquare className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-600" />
              Timesheet Approvals
            </NavLink>
          )}"""

text = text.replace(completion_str, completion_str + "\n\n" + approvals_str)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Sidebar.tsx")
