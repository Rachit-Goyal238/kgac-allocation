import sys

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<TabsTrigger value="timesheets">Timesheet Approvals</TabsTrigger>', '')

timesheets_content = """        <TabsContent value="timesheets" className="mt-0">
          <TimesheetApprovals />
        </TabsContent>"""
text = text.replace(timesheets_content, '')

text = text.replace("import { TimesheetApprovals } from '@/components/admin/TimesheetApprovals';", "")

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cleaned AdminPage.tsx")
