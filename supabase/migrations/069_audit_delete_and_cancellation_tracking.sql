-- Migration 069: Robust Audit Deletion, Completed Audit Protection, and Cancellation Tracking

-- 1. Add cancelled_by and cancelled_at columns to audits table
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.audits ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- 2. Update cancel_audit to record cancelled_by and cancelled_at
CREATE OR REPLACE FUNCTION public.cancel_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_name text;
BEGIN
  -- Verify permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'super_admin', 'manager', 'planner']::text[])
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only managers, planners, or admins can cancel an audit.';
  END IF;

  SELECT store_name INTO v_store_name FROM public.audits WHERE id = p_audit_id;

  -- Update audit status to cancelled and track who did it
  UPDATE public.audits 
  SET status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now()
  WHERE id = p_audit_id;

  -- Remove allocations for this audit so resources are freed up immediately
  DELETE FROM public.allocations WHERE audit_id = p_audit_id;

  -- Log action in audit_logs for Superadmin
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    'STATUS_CHANGE',
    'audits',
    p_audit_id,
    jsonb_build_object('event', 'audit_cancelled', 'store_name', v_store_name)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_audit(uuid) TO authenticated;

-- 3. Trigger to strictly forbid deletion of completed audits
CREATE OR REPLACE FUNCTION public.check_audit_delete_allowed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete an audit that has been marked completed.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_completed_audits ON public.audits;
CREATE TRIGGER trg_prevent_delete_completed_audits
  BEFORE DELETE ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION public.check_audit_delete_allowed();

-- 4. Atomic delete_audit RPC function that removes audit and linked artifacts cleanly
CREATE OR REPLACE FUNCTION public.delete_audit(p_audit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status text;
  v_store_name text;
  v_project_id uuid;
BEGIN
  -- Verify permissions
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (roles && ARRAY['admin', 'super_admin', 'manager', 'planner']::text[])
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only managers, planners, or admins can delete an audit.';
  END IF;

  -- Get current audit state
  SELECT status, store_name, project_id 
  INTO v_status, v_store_name, v_project_id
  FROM public.audits 
  WHERE id = p_audit_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Strict business rule: Completed audits cannot be deleted
  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot delete an audit that has been marked completed.';
  END IF;

  -- 1. Remove team assignments
  DELETE FROM public.audit_teams WHERE audit_id = p_audit_id;

  -- 2. Remove allocations linked to this audit
  DELETE FROM public.allocations WHERE audit_id = p_audit_id;

  -- 3. Remove any pending/draft vendor invoices for this audit
  DELETE FROM public.invoices WHERE audit_id = p_audit_id;

  -- 4. Delete the audit row itself
  DELETE FROM public.audits WHERE id = p_audit_id;

  -- 5. Delete the auto-created project if no other audit shares it
  IF v_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.audits WHERE project_id = v_project_id) THEN
      DELETE FROM public.project_assignments WHERE project_id = v_project_id;
      DELETE FROM public.allocations WHERE project_id = v_project_id;
      DELETE FROM public.projects WHERE id = v_project_id;
    END IF;
  END IF;

  -- 6. Log deletion event for Superadmin audit trail
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, metadata)
  VALUES (
    auth.uid(),
    'DELETE',
    'audits',
    p_audit_id,
    jsonb_build_object(
      'event', 'audit_deleted',
      'store_name', v_store_name,
      'project_id', v_project_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_audit(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
