import sys

with open('src/pages/ReconciliationPage.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('return filteredAudits.map(audit => {')
end_idx = text.find('        const billing = Number(audit.billing_amount) || 0;', start_idx)

if start_idx != -1 and end_idx != -1:
    old_loop = text[start_idx:end_idx]
    
    new_loop = """return filteredAudits.map(audit => {
          let totalTeamCost = 0;
          let internalCount = 0;

          let days = 1;
          if (audit.end_date && audit.end_date !== audit.audit_date) {
              const diffTime = Math.abs(new Date(audit.end_date).getTime() - new Date(audit.audit_date).getTime());
              days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }

          audit.teams?.forEach((team: any) => {
            if (team.vendor_id && team.vendor) {
              let rate = team.agreed_rate;
              if (!rate) {
                rate = team.role === 'asset' 
                  ? team.vendor.default_asset_rate 
                  : team.vendor.default_human_rate;
              }
              totalTeamCost += (Number(rate) || 0) * days;
            } else if (!team.vendor_id) {
              internalCount += 1;
              if (team.agreed_rate) {
                totalTeamCost += (Number(team.agreed_rate) || 0) * days;
              }
            }
          });

  """
    text = text.replace(old_loop, new_loop)
    with open('src/pages/ReconciliationPage.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
        print("Success: ReconciliationPage updated.")
else:
    print("Could not find loop.")
