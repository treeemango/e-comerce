-- Admin Ban/Unban Users (client-safe RPC)

-- Add status columns to public.users (profile table)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status text;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS banned_until timestamptz;

-- Default existing rows to active if missing
UPDATE public.users
SET account_status = 'active'
WHERE account_status IS NULL;

ALTER TABLE public.users
  ALTER COLUMN account_status SET DEFAULT 'active';

-- Admin-only RPC to ban/unban a user.
-- Uses admin_2025_user_permissions as the source of truth.
CREATE OR REPLACE FUNCTION public.admin_set_user_ban_status(
  p_target_user_id uuid,
  p_banned boolean
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_allowed boolean;
  v_row public.users;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_2025_user_permissions a
    WHERE a.user_id = auth.uid()
      AND a.is_active = true
      AND (
        a.permission_level = 'super_admin'
        OR COALESCE((a.permissions -> 'users' ->> 'manage')::boolean, false)
        OR COALESCE((a.permissions -> 'users' ->> 'delete')::boolean, false)
      )
  ) INTO v_is_allowed;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Not authorized to ban/unban users';
  END IF;

  UPDATE public.users
  SET
    account_status = CASE WHEN p_banned THEN 'banned' ELSE 'active' END,
    banned_until = CASE WHEN p_banned THEN (now() + interval '100 years') ELSE NULL END
  WHERE id = p_target_user_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_ban_status(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_ban_status(uuid, boolean) TO authenticated;
