SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'public.allocations'::regclass 
AND confrelid = 'public.audits'::regclass;
