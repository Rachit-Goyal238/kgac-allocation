import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add ClipboardCheck icon import (already has ClipboardList, add ClipboardCheck)
text = text.replace("import { Clock } from 'lucide-react';", "import { Clock, ClipboardCheck } from 'lucide-react';")

# Add Audits nav link - visible to all - after Dashboard
dashboard_link = """          <NavLink to="/dashboard" onClick={handleLinkClick} className={navLinkClasses}>"""
audits_link = """          <NavLink to="/audits" onClick={handleLinkClick} className={navLinkClasses}>
            <ClipboardCheck className="mr-3 h-5 w-5 flex-shrink-0" />
            All Audits
          </NavLink>
          
          <NavLink to="/dashboard" onClick={handleLinkClick} className={navLinkClasses}>"""

text = text.replace(dashboard_link, audits_link)

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added All Audits link to Sidebar")
