-- 1. Create a function to clear ALL audit logs (Manual wipe for Super Admins)
CREATE OR REPLACE FUNCTION public.clear_all_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is a super_admin
  IF NOT public.has_any_role(ARRAY['super_admin']) THEN
    RAISE EXCEPTION 'Access denied. Only super_admins can clear audit logs.';
  END IF;

  DELETE FROM public.audit_logs;
END;
$$;

-- 2. Create a function to cleanup old audit logs (Automatic retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(days_to_keep int DEFAULT 90)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < (NOW() - (days_to_keep || ' days')::interval);
END;
$$;

-- 3. Schedule the automatic cleanup to run every night at midnight using pg_cron
-- Note: If you get a permission error on pg_cron, you may need to run this specific block 
-- directly in the Supabase SQL Editor as the postgres user.
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing schedule if it exists to avoid duplicates
    PERFORM cron.unschedule('cleanup-audit-logs-nightly');
    -- Schedule it
    PERFORM cron.schedule(
      'cleanup-audit-logs-nightly',
      '0 0 * * *', -- Every day at 00:00
      'SELECT public.cleanup_old_audit_logs(90);'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if pg_cron is not accessible in this context, 
    -- user can still use the manual UI button or RPC.
    NULL;
END $$;
