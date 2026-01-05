-- User presence (Last Seen)
-- Adds a persisted last_seen_at timestamp and a client-safe RPC to update it.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- Backfill for existing rows
UPDATE public.users
SET last_seen_at = COALESCE(last_seen_at, updated_at, created_at, now())
WHERE last_seen_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_user_last_seen()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET last_seen_at = now()
  WHERE id = auth.uid();

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_user_last_seen() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_user_last_seen() TO authenticated;
