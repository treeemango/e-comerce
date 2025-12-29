-- Ensure chat participant display view can be queried from the client.
-- If RLS is enabled on users/vendors, the view will otherwise return 0 rows.

-- 1) Table privileges (PostgREST requires explicit GRANTs)
GRANT SELECT ON public.users TO anon, authenticated;
GRANT SELECT ON public.vendors TO anon, authenticated;
GRANT SELECT ON public.conversations TO authenticated;

-- 2) RLS policies (safe read-only policies for public profile fields)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'users'
      AND policyname = 'public_read_users'
  ) THEN
    CREATE POLICY public_read_users ON public.users FOR SELECT USING (true);
  END IF;
END $$;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'vendors'
      AND policyname = 'public_read_vendors'
  ) THEN
    CREATE POLICY public_read_vendors ON public.vendors FOR SELECT USING (true);
  END IF;
END $$;

-- 3) View privileges
GRANT SELECT ON public.view_chat_participants TO authenticated;
