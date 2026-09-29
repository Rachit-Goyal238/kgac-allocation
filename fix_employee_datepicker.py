import sys

with open('src/pages/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# For employees: MyUpcomingAudits should not be constrained by the manager date range.
# Pass startDate only for managers; employees get today-onwards (undefined = default in the component)
old_audits = "<MyUpcomingAudits startDate={startStr} endDate={endStr} />"
new_audits = """<>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-800">My Upcoming Audits</h3>
            <p className="text-xs text-slate-500">Your assigned audits from today onwards</p>
          </div>
          {!isManagerOrAdmin && (
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                if (start) setStartDate(start);
                if (end) setEndDate(end);
              }}
            />
          )}
        </div>
        <MyUpcomingAudits startDate={startStr} endDate={endStr} />
      </>"""

text = text.replace(old_audits, new_audits)

with open('src/pages/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed: employees now have their own date picker for Upcoming Audits")
