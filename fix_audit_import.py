import sys
import re

with open('src/components/planner/AuditImportTool.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the end_date logic
pattern = r"audit_date: safeDate\(getField\(row, \['audit date', 'start date', 'date'\]\)\),\s*end_date: safeDate\(getField\(row, \['end date'\]\)\) \|\| safeDate\(getField\(row, \['audit date', 'start date', 'date'\]\)\),"

new_logic = """audit_date: safeDate(getField(row, ['audit date', 'start date', 'date'])),
                end_date: getField(row, ['end date']) ? safeDate(getField(row, ['end date'])) : safeDate(getField(row, ['audit date', 'start date', 'date'])),"""

text = re.sub(pattern, new_logic, text)

with open('src/components/planner/AuditImportTool.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: AuditImportTool updated.")
