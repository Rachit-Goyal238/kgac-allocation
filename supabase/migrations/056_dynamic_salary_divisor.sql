-- Update profiles trigger to use current month days instead of 22
CREATE OR REPLACE FUNCTION public.calculate_daily_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_days_in_month numeric;
BEGIN
  IF NEW.monthly_salary IS NOT NULL THEN
    v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'));
    NEW.agreed_rate := ROUND(NEW.monthly_salary / v_days_in_month, 2);
  END IF;
  RETURN NEW;
END;
$$;

-- Update audit_teams trigger to dynamically calculate daily rate based on the month of the audit
CREATE OR REPLACE FUNCTION public.freeze_internal_audit_rate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_salary numeric(10,2);
  v_current_rate numeric(10,2);
  v_audit_date date;
  v_days_in_month numeric;
BEGIN
  IF NEW.user_id IS NOT NULL AND NEW.agreed_rate IS NULL THEN
    -- Get both salary and current default rate
    SELECT monthly_salary, agreed_rate INTO v_monthly_salary, v_current_rate 
    FROM public.profiles 
    WHERE id = NEW.user_id;
    
    IF v_monthly_salary IS NOT NULL THEN
      -- Get the audit date to determine the month
      SELECT audit_date INTO v_audit_date FROM public.audits WHERE id = NEW.audit_id;
      
      IF v_audit_date IS NOT NULL THEN
        -- Calculate number of days in the month of the audit
        v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', v_audit_date) + interval '1 month - 1 day'));
        NEW.agreed_rate := ROUND(v_monthly_salary / v_days_in_month, 2);
      ELSE
        v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day'));
        NEW.agreed_rate := ROUND(v_monthly_salary / v_days_in_month, 2);
      END IF;
    ELSIF v_current_rate IS NOT NULL THEN
      -- Fallback to the default agreed_rate if no monthly_salary is set
      NEW.agreed_rate := v_current_rate;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
