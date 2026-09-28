import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("user:profiles!left(zone)", "user:profiles!left(zone, agreed_rate)")

old_logic = """} else if (!team.vendor_id) {
              internalCount += 1;
              if (team.agreed_rate) {
                totalTeamCost += (Number(team.agreed_rate) || 0) * days;
              }
            }"""

new_logic = """} else if (!team.vendor_id) {
              internalCount += 1;
              let intRate = team.agreed_rate || team.user?.agreed_rate;
              if (intRate) {
                totalTeamCost += (Number(intRate) || 0) * days;
              }
            }"""

text = text.replace(old_logic, new_logic)

with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: ReconciliationPage internal rates updated.")
