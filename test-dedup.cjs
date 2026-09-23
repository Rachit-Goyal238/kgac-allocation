const crypto = require('crypto');

const existingAudits = [
  { id: 'uuid-existing', store_name: 'Unknown Store', audit_date: '2026-10-01' }
];

const parsedCSV = [
  { store_name: 'Unknown Store', audit_date: '2026-10-01', billing_amount: 1000 },
  { store_name: 'Unknown Store', audit_date: '2026-10-01', billing_amount: 500 }
];

const toUpsert = parsedCSV.map((newAudit) => {
  const match = existingAudits.find(ea => 
    ea.store_name?.toLowerCase().trim() === newAudit.store_name?.toLowerCase().trim() && 
    ea.audit_date === newAudit.audit_date
  );

  if (match) {
    return { ...newAudit, id: match.id };
  }
  return { ...newAudit, id: crypto.randomUUID() };
});

console.log(JSON.stringify(toUpsert, null, 2));
