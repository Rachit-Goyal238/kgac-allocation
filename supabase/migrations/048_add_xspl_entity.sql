-- Drop the existing CHECK constraint for entity
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%entity%'
    LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || rec.conname;
    END LOOP;
END;
$$;

-- Add the new CHECK constraint that includes XSPL
ALTER TABLE public.profiles ADD CONSTRAINT profiles_entity_check CHECK (entity IN ('KGAC', 'KPL', 'XSPL'));
