-- AI Feature Flags (Grok)

CREATE TABLE IF NOT EXISTS public.ai_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

ALTER TABLE public.ai_feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read flags so the UI can disable AI features platform-wide
DROP POLICY IF EXISTS "Anyone can read AI feature flags" ON public.ai_feature_flags;
CREATE POLICY "Anyone can read AI feature flags"
ON public.ai_feature_flags
FOR SELECT
USING (true);

-- Allow super admins to manage flags
DROP POLICY IF EXISTS "Super admins can manage AI feature flags" ON public.ai_feature_flags;
CREATE POLICY "Super admins can manage AI feature flags"
ON public.ai_feature_flags
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_2025_user_permissions
    WHERE user_id = auth.uid() AND permission_level = 'super_admin' AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_2025_user_permissions
    WHERE user_id = auth.uid() AND permission_level = 'super_admin' AND is_active = true
  )
);

-- Seed defaults
INSERT INTO public.ai_feature_flags (key, enabled)
VALUES
  ('listing_assistant', true),
  ('product_questions', true),
  ('image_matching', true),
  ('seller_chat_reply', true),
  ('product_explain', true)
ON CONFLICT (key) DO NOTHING;
