import sys

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Import
text = text.replace("import { ProjectManager } from '@/components/admin/ProjectManager';", "import { ProjectManager } from '@/components/admin/ProjectManager';\nimport { TimesheetApprovals } from '@/components/admin/TimesheetApprovals';")

# Add Tab Trigger
text = text.replace('<TabsTrigger value="users">Users & Roles</TabsTrigger>', '<TabsTrigger value="users">Users & Roles</TabsTrigger>\n          <TabsTrigger value="timesheets">Timesheet Approvals</TabsTrigger>')

# Add Tab Content
tab_content = """
        <TabsContent value="timesheets" className="mt-0">
          <TimesheetApprovals />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
"""
text = text.replace('<TabsContent value="users" className="mt-0">', tab_content)

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated AdminPage.tsx")
