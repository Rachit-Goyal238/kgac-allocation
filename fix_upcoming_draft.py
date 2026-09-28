import sys

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("audit:audits(", "audit:audits!inner(")
text = text.replace(".gte('audit.audit_date', today)", ".gte('audit.audit_date', today)\n        .neq('audit.status', 'draft')")

with open('src/components/dashboard/MyUpcomingAudits.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    print("Success: MyUpcomingAudits updated.")
