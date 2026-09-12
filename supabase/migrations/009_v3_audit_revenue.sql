-- Add billing_amount to audits to track revenue per audit
ALTER TABLE audits ADD COLUMN IF NOT EXISTS billing_amount numeric(10,2) DEFAULT 0;

-- Optionally add a default_audit_rate to clients to auto-populate future audits
ALTER TABLE clients ADD COLUMN IF NOT EXISTS default_audit_rate numeric(10,2) DEFAULT 0;
