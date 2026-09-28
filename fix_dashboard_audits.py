import sys

with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("<MyUpcomingAudits />", "<MyUpcomingAudits startDate={startStr} endDate={endStr} />")

with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated DashboardPage")
