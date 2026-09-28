-- Delete exact duplicates in vendor_resources before adding the constraint
DELETE FROM public.vendor_resources a USING (
    SELECT MIN(id) as id, vendor_id, name
    FROM public.vendor_resources 
    GROUP BY vendor_id, name HAVING COUNT(*) > 1
) b
WHERE a.vendor_id = b.vendor_id 
AND a.name = b.name 
AND a.id <> b.id;

-- Restore the unique constraint so upserts work again
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_name_key;
ALTER TABLE public.vendor_resources ADD CONSTRAINT vendor_resources_vendor_id_name_key UNIQUE (vendor_id, name);
