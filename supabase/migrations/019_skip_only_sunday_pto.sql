-- Run this SQL in your Supabase SQL Editor to update the trigger

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
      
      -- extract(isodow from date) returns 1-7 (Monday-Sunday).
      -- We want to apply PTO for Monday through Saturday (< 7), but skip Sunday (7).
      IF extract(isodow from v_date) < 7 THEN
        
        -- Explicitly delete existing allocations for this day
        DELETE FROM public.allocations 
        WHERE user_id = NEW.user_id AND allocation_date = v_date;
        
        -- Insert the leave allocation
        INSERT INTO public.allocations (user_id, allocation_date, hours, status, notes)
        VALUES (NEW.user_id, v_date, 0, NEW.type, 'Leave Request: ' || NEW.type);
        
      END IF;
      
      v_date := v_date + 1;
    END LOOP;
  END IF;

  -- If leave was rejected/deleted/cancelled after being approved
  IF (TG_OP = 'DELETE' AND OLD.status = 'approved') OR (TG_OP = 'UPDATE' AND NEW.status != 'approved' AND OLD.status = 'approved') THEN
    DELETE FROM public.allocations 
    WHERE user_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END)
    AND allocation_date >= (CASE WHEN TG_OP = 'DELETE' THEN OLD.start_date ELSE NEW.start_date END)
    AND allocation_date <= (CASE WHEN TG_OP = 'DELETE' THEN OLD.end_date ELSE NEW.end_date END)
    AND status = (CASE WHEN TG_OP = 'DELETE' THEN OLD.type ELSE NEW.type END);
  END IF;

  RETURN NEW;
END;
$$;
