-- Drop existing foreign keys if they don't have CASCADE
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_fkey;
ALTER TABLE public.vendor_rates DROP CONSTRAINT IF EXISTS vendor_rates_vendor_id_fkey;
ALTER TABLE public.audit_teams DROP CONSTRAINT IF EXISTS audit_teams_vendor_id_fkey;
ALTER TABLE public.audit_teams DROP CONSTRAINT IF EXISTS audit_teams_vendor_resource_id_fkey;

-- Re-add them with ON DELETE CASCADE
ALTER TABLE public.vendor_resources
  ADD CONSTRAINT vendor_resources_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_rates
  ADD CONSTRAINT vendor_rates_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.audit_teams
  ADD CONSTRAINT audit_teams_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

ALTER TABLE public.audit_teams
  ADD CONSTRAINT audit_teams_vendor_resource_id_fkey
  FOREIGN KEY (vendor_resource_id) REFERENCES public.vendor_resources(id) ON DELETE CASCADE;
