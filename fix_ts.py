import sys

with open('src/components/layout/Sidebar.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import_insert = "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { ENABLE_ATTENDANCE_SYSTEM } from '@/lib/constants';\nimport { Clock } from 'lucide-react';\nimport { supabase } from '@/lib/supabase';\n"
text = import_insert + text

with open('src/components/layout/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('src/pages/AttendancePage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# fix sort
text = text.replace("return report.sort((a, b) => a.name.localeCompare(b.name));", "return report.sort((a: any, b: any) => a.name.localeCompare(b.name));")

# fix DateRangePicker
# DateRangePicker signature: onChange: (start: Date, end: Date) => void
text = text.replace("<DateRangePicker value={dateRange} onChange={setDateRange} />", "<DateRangePicker value={dateRange} onChange={(start, end) => setDateRange({ start, end })} />")

with open('src/pages/AttendancePage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed typescript errors")
