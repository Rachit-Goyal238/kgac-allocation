-- 1. Add 'draft' to status constraint
ALTER TABLE public.audits DROP CONSTRAINT IF EXISTS audits_status_check;
ALTER TABLE public.audits ADD CONSTRAINT audits_status_check CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled'));

-- 2. Change default to draft
ALTER TABLE public.audits ALTER COLUMN status SET DEFAULT 'draft';

-- 3. Retroactively mark audits as draft if they don't have any allocations (meaning they haven't been published yet)
UPDATE public.audits 
SET status = 'draft' 
WHERE status = 'scheduled' 
AND id NOT IN (SELECT DISTINCT audit_id FROM public.allocations WHERE audit_id IS NOT NULL);
