import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("user:profiles!left(full_name, is_internal_vendor, zone, agreed_rate)", "user:profiles!left(full_name, is_internal_vendor, zone, agreed_rate, monthly_salary)")

old_logic = """} else if (team.user_id) {
            // Internal resource with cost
            let intRate = team.agreed_rate || team.user?.agreed_rate;
            if (intRate) {
              rate = (Number(intRate) || 0) * days;
              resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
            }
          }"""

new_logic = """} else if (team.user_id) {
            // Internal resource with cost
            let intRate = team.agreed_rate;
            if (!intRate && team.user?.monthly_salary) {
              const auditDate = new Date(audit.audit_date || new Date());
              const daysInMonth = new Date(auditDate.getFullYear(), auditDate.getMonth() + 1, 0).getDate();
              intRate = Number(team.user.monthly_salary) / daysInMonth;
            } else if (!intRate) {
              intRate = team.user?.agreed_rate;
            }

            if (intRate) {
              rate = (Number(intRate) || 0) * days;
              resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
            }
          }"""

text = text.replace(old_logic, new_logic)

with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useBillingMetrics dynamic dates updated.")
