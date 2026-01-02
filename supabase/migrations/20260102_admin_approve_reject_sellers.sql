-- Admin Seller Verification RPCs

-- Approve Seller
CREATE OR REPLACE FUNCTION public.approve_seller(
  p_seller_id uuid,
  p_admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_allowed boolean;
BEGIN
  -- Verify admin permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_2025_user_permissions a
    WHERE a.user_id = auth.uid()
      AND a.is_active = true
      AND (
        a.permission_level = 'super_admin'
        OR COALESCE((a.permissions -> 'vendors' ->> 'manage')::boolean, false)
        OR COALESCE((a.permissions -> 'sellers' ->> 'manage')::boolean, false)
        OR COALESCE((a.permissions -> 'users' ->> 'manage')::boolean, false) -- Fallback
      )
  ) INTO v_is_allowed;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Not authorized to approve sellers';
  END IF;

  UPDATE public.vendors
  SET
    verification_status = 'approved',
    verification_notes = NULL,
    is_active = true,
    updated_at = now()
  WHERE user_id = p_seller_id;

  -- Send notification to seller
  INSERT INTO public.notifications (
    user_id,
    type,
    message,
    is_read,
    action_payload
  ) VALUES (
    p_seller_id,
    'success',
    '🎉 Your seller account has been approved! You can now start listing products.',
    false,
    '{"target": "seller-orders"}'::jsonb
  );

  RETURN true;
END;
$$;

-- Reject Seller
CREATE OR REPLACE FUNCTION public.reject_seller(
  p_seller_id uuid,
  p_admin_id uuid,
  p_rejection_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_allowed boolean;
BEGIN
  -- Verify admin permissions
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_2025_user_permissions a
    WHERE a.user_id = auth.uid()
      AND a.is_active = true
      AND (
        a.permission_level = 'super_admin'
        OR COALESCE((a.permissions -> 'vendors' ->> 'manage')::boolean, false)
        OR COALESCE((a.permissions -> 'sellers' ->> 'manage')::boolean, false)
        OR COALESCE((a.permissions -> 'users' ->> 'manage')::boolean, false) -- Fallback
      )
  ) INTO v_is_allowed;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Not authorized to reject sellers';
  END IF;

  UPDATE public.vendors
  SET
    verification_status = 'rejected',
    verification_notes = p_rejection_reason,
    is_active = false,
    updated_at = now()
  WHERE user_id = p_seller_id;

  RETURN true;
END;
$$;

-- Revoke/Grant permissions
REVOKE ALL ON FUNCTION public.approve_seller(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_seller(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_seller(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_seller(uuid, uuid, text) TO authenticated;
