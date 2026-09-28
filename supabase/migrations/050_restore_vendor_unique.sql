-- Delete exact duplicates using ctid (which is always orderable, unlike uuid)
DELETE FROM public.vendor_resources
WHERE ctid NOT IN (
    SELECT min(ctid)
    FROM public.vendor_resources
    GROUP BY vendor_id, name
);

-- Restore the unique constraint so upserts work again
ALTER TABLE public.vendor_resources DROP CONSTRAINT IF EXISTS vendor_resources_vendor_id_name_key;
ALTER TABLE public.vendor_resources ADD CONSTRAINT vendor_resources_vendor_id_name_key UNIQUE (vendor_id, name);
