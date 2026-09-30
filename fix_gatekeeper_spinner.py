import sys

with open('src/components/layout/AttendanceGatekeeper.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the AttendanceGatekeeper spinner condition
old_cond = "if (isLoadingAttendance || isLoadingLeave) {"
new_cond = "if ((isLoadingAttendance && !attendance) || (isLoadingLeave && !todayLeave)) {"

text = text.replace(old_cond, new_cond)

with open('src/components/layout/AttendanceGatekeeper.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed AttendanceGatekeeper spinner")
