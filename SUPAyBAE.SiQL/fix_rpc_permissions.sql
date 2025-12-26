-- Explicitly grant permissions to the RPC function to resolve 401 Unauthorized errors
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO postgres;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_product_reviews(uuid) TO service_role;

-- Also verify the function ownership and security
ALTER FUNCTION public.get_product_reviews(uuid) OWNER TO postgres;
