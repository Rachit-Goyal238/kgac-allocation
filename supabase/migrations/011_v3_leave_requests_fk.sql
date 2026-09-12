-- Fix foreign key relationships for leave_requests so PostgREST can resolve the user's profile

ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_user_id_fkey,
  DROP CONSTRAINT IF EXISTS leave_requests_manager_id_fkey;

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT leave_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL;
