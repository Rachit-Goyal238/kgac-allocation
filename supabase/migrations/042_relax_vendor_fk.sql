ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_fkey;
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_name_key;

-- Now vendor_id can hold a vendors.id OR a profiles.id
-- We will rely on application logic to maintain integrity.
