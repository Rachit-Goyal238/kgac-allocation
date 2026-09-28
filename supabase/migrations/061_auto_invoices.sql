CREATE OR REPLACE FUNCTION public.auto_create_vendor_invoices()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member record;
  v_amount numeric;
  v_days int;
  v_default_human numeric;
  v_default_asset numeric;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- calculate days
    v_days := 1;
    IF NEW.end_date IS NOT NULL AND NEW.end_date != NEW.audit_date THEN
      v_days := NEW.end_date - NEW.audit_date + 1;
    END IF;

    -- for each vendor in this audit
    FOR v_member IN SELECT * FROM public.audit_teams WHERE audit_id = NEW.id AND vendor_id IS NOT NULL LOOP
      v_amount := 0;

      SELECT default_human_rate, default_asset_rate INTO v_default_human, v_default_asset 
      FROM public.vendors WHERE id = v_member.vendor_id;

      IF v_member.agreed_rate IS NOT NULL THEN
        v_amount := v_member.agreed_rate * v_days;
      ELSIF v_member.role = 'asset' THEN
        v_amount := COALESCE(v_default_asset, 0) * v_days;
      ELSE
        v_amount := COALESCE(v_default_human, 0) * v_days;
      END IF;
      
      -- Only create if amount > 0 or if we want all? We can just create it for all vendors.
      INSERT INTO public.invoices (vendor_id, audit_id, amount, status)
      VALUES (v_member.vendor_id, NEW.id, v_amount, 'pending');

    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_vendor_invoices ON public.audits;
CREATE TRIGGER trg_auto_vendor_invoices
  AFTER UPDATE OF status ON public.audits
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_vendor_invoices();
