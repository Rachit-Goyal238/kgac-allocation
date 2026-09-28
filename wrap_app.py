import sys

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_str = "import { Sidebar } from '@/components/layout/Sidebar';"
new_import = "import { Sidebar } from '@/components/layout/Sidebar';\nimport { AttendanceGatekeeper } from '@/components/layout/AttendanceGatekeeper';"
text = text.replace(import_str, new_import)

layout_str = """      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">"""
        
new_layout = """      <AttendanceGatekeeper>
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">"""
          
text = text.replace(layout_str, new_layout)

closing_str = """        </main>
      </div>"""
      
new_closing = """          </main>
        </div>
      </AttendanceGatekeeper>"""
      
text = text.replace(closing_str, new_closing)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Wrapped App with AttendanceGatekeeper")
