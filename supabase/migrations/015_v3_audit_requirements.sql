-- 1. Add team size requirements to audits
ALTER TABLE audits ADD COLUMN IF NOT EXISTS required_leads integer DEFAULT 0;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS required_executives integer DEFAULT 0;

-- 2. Trigger function to sync leave_requests to allocations
CREATE OR REPLACE FUNCTION public.sync_leave_to_allocations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date date;
BEGIN
  -- If leave was approved
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status != 'approved') THEN
    v_date := NEW.start_date;
    WHILE v_date <= NEW.end_date LOOP
      -- Skip weekends
      IF extract(isodow from v_date) < 6 THEN
        INSERT INTO public.allocations (user_id, allocation_date, hours, status, notes)
        VALUES (NEW.user_id, v_date, 0, NEW.type, 'Leave Request: ' || NEW.type)
        ON CONFLICT (user_id, allocation_date) 
        DO UPDATE SET hours = 0, status = EXCLUDED.status, project_id = NULL, notes = EXCLUDED.notes;
      END IF;
      v_date := v_date + 1;
    END LOOP;
  END IF;

  -- If leave was rejected/deleted/cancelled after being approved
  IF (TG_OP = 'DELETE' AND OLD.status = 'approved') OR (TG_OP = 'UPDATE' AND NEW.status != 'approved' AND OLD.status = 'approved') THEN
    -- In this case we just delete the allocations that match this type for this date range.
    -- The user will have to be manually re-allocated to billable work.
    DELETE FROM public.allocations 
    WHERE user_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)
    AND allocation_date >= (CASE WHEN TG_OP = 'DELETE' THEN OLD.start_date ELSE NEW.start_date END)
    AND allocation_date <= (CASE WHEN TG_OP = 'DELETE' THEN OLD.end_date ELSE NEW.end_date END)
    AND status = (CASE WHEN TG_OP = 'DELETE' THEN OLD.type ELSE NEW.type END);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_leave_request_change ON leave_requests;
CREATE TRIGGER on_leave_request_change
AFTER INSERT OR UPDATE OR DELETE ON leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_leave_to_allocations();
