import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("user:profiles!left(full_name, is_internal_vendor, zone)", "user:profiles!left(full_name, is_internal_vendor, zone, agreed_rate)")

old_logic = """} else if (team.user_id && team.agreed_rate) {
            // Internal resource with cost
            rate = (Number(team.agreed_rate) || 0) * days;
            resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
          }"""

new_logic = """} else if (team.user_id) {
            // Internal resource with cost
            let intRate = team.agreed_rate || team.user?.agreed_rate;
            if (intRate) {
              rate = (Number(intRate) || 0) * days;
              resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
            }
          }"""

text = text.replace(old_logic, new_logic)

with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: useBillingMetrics internal rates updated.")
