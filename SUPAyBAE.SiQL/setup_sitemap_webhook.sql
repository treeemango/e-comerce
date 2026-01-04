-- 1. Ensure the networking extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create a handler function to perform the HTTP request
CREATE OR REPLACE FUNCTION public.handle_sitemap_rebuild()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.vercel.com/v1/integrations/deploy/prj_fl4VxVpbhWkwTbpxlOlPzaFEEUXz/UOHrlcKsM6',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_sitemap_rebuild ON products;
CREATE TRIGGER trigger_sitemap_rebuild
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW
EXECUTE FUNCTION public.handle_sitemap_rebuild();

COMMENT ON TRIGGER "trigger_sitemap_rebuild" ON "products" IS 'Triggers a Vercel build to regenerate the sitemap whenever products change.';
