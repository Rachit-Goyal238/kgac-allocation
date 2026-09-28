-- Add monthly salary
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monthly_salary numeric(10,2);

-- Function to recalculate daily rate
CREATE OR REPLACE FUNCTION public.calculate_daily_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.monthly_salary IS NOT NULL THEN
    -- Calculate daily rate assuming 22 working days per month
    NEW.agreed_rate := ROUND(NEW.monthly_salary / 22, 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calculate_daily_rate ON public.profiles;
CREATE TRIGGER trg_calculate_daily_rate
  BEFORE INSERT OR UPDATE OF monthly_salary ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_daily_rate();

-- Trigger to freeze current agreed_rate for internal employees when assigned
CREATE OR REPLACE FUNCTION public.freeze_internal_audit_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_rate numeric(10,2);
BEGIN
  -- Only act if it's an internal employee and no rate was explicitly provided
  IF NEW.user_id IS NOT NULL AND NEW.agreed_rate IS NULL THEN
    SELECT agreed_rate INTO v_current_rate FROM public.profiles WHERE id = NEW.user_id;
    IF v_current_rate IS NOT NULL THEN
      NEW.agreed_rate := v_current_rate;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_internal_audit_rate ON public.audit_teams;
CREATE TRIGGER trg_freeze_internal_audit_rate
  BEFORE INSERT OR UPDATE OF user_id, agreed_rate ON public.audit_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_internal_audit_rate();
