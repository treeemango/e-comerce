-- Inspect definition of get_best_selling_products RPC
SELECT pg_get_functiondef('public.get_best_selling_products'::regproc);
