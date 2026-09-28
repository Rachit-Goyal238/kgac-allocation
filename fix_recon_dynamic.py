import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("user:profiles!left(zone, agreed_rate)", "user:profiles!left(zone, agreed_rate, monthly_salary)")

old_logic = """} else if (!team.vendor_id) {
              internalCount += 1;
              let intRate = team.agreed_rate || team.user?.agreed_rate;
              if (intRate) {
                totalTeamCost += (Number(intRate) || 0) * days;
              }
            }"""

new_logic = """} else if (!team.vendor_id) {
              internalCount += 1;
              let intRate = team.agreed_rate;
              if (!intRate && team.user?.monthly_salary) {
                const auditDate = new Date(audit.audit_date || new Date());
                const daysInMonth = new Date(auditDate.getFullYear(), auditDate.getMonth() + 1, 0).getDate();
                intRate = Number(team.user.monthly_salary) / daysInMonth;
              } else if (!intRate) {
                intRate = team.user?.agreed_rate;
              }

              if (intRate) {
                totalTeamCost += (Number(intRate) || 0) * days;
              }
            }"""

text = text.replace(old_logic, new_logic)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: ReconciliationPage dynamic rates updated.")
