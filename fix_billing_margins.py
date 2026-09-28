import sys

with open('src/hooks/useBillingMetrics.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('audits?.forEach((audit: any) => {')
end_idx = text.find('        const owedByVendor', start_idx)

if start_idx != -1 and end_idx != -1:
    old_loop = text[start_idx:end_idx]
    
    new_loop = """audits?.forEach((audit: any) => {
          let auditTotal = 0;
          
          let days = 1;
          if (audit.end_date && audit.end_date !== audit.audit_date) {
              const diffTime = Math.abs(new Date(audit.end_date).getTime() - new Date(audit.audit_date).getTime());
              days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          }

          audit.teams?.forEach((team: any) => {
            if (zoneFilter && team.user?.zone?.toLowerCase() !== zoneFilter.toLowerCase()) {
               if (team.user_id) return;
            }
            
            let rate = 0;
            let resourceName = '';
            
            if (team.vendor_id && team.vendor) {
              rate = team.agreed_rate;
              if (!rate) {
                rate = team.role === 'asset' 
                  ? team.vendor.default_asset_rate 
                  : team.vendor.default_human_rate;
              }
              rate = (Number(rate) || 0) * days;
              resourceName = team.vendor.name;
            } else if (team.user_id && team.agreed_rate) {
              rate = (Number(team.agreed_rate) || 0) * days;
              resourceName = team.user?.is_internal_vendor ? team.user.full_name : 'Internal Employee';
            }
            
            if (rate > 0) {
              totalOwed += rate;
              auditTotal += rate;
              
              vendorOwedMap[resourceName] = (vendorOwedMap[resourceName] || 0) + rate;
              
              externalResources.push({
                audit_name: audit.store_name,
                audit_date: audit.end_date && audit.end_date !== audit.audit_date ? `${audit.audit_date} to ${audit.end_date}` : audit.audit_date,
                vendor: resourceName,
                resource_name: team.vendor ? team.vendor.name : (team.user?.full_name || 'Internal'),
                role: team.role,
                amount: rate
              });
            }
          });

          auditOwedMap[audit.id] = {
            audit_name: audit.store_name,
            client_name: audit.client?.name || 'Unknown',
            amount: auditTotal
          };
        });

"""
    text = text.replace(old_loop, new_loop)
    with open('src/hooks/useBillingMetrics.ts', 'w', encoding='utf-8') as f:
        f.write(text)
        print("Success: useBillingMetrics updated.")
else:
    print("Could not find loop.")
