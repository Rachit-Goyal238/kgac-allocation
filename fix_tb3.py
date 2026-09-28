import sys
import re

with open('src/components/planner/TeamBuilder.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix onClick handler initialization
pattern = r"setSelectedAuditId\(audit\.id\);\s*sessionStorage\.setItem\('teamBuilderAuditId',\s*audit\.id\);\s*setContactPersonId\(audit\.contact_person_id \|\| ''\);\s*\}\}"

new_handler = r"""setSelectedAuditId(audit.id); sessionStorage.setItem('teamBuilderAuditId', audit.id);
              setContactPersonId(audit.contact_person_id || '');
              setBillingAmount(audit.billing_amount ? audit.billing_amount.toString() : '');
            }}"""

text = re.sub(pattern, new_handler, text)

with open('src/components/planner/TeamBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: Initializer updated.")
