-- Find triggers on the 'orders' table that reference 'seller_id' in their function body
-- This helps identify the broken trigger causing "record new has no field seller_id"

SELECT 
    t.tgname as trigger_name, 
    p.proname as function_name,
    p.prosrc as function_source_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'orders'
AND (
    p.prosrc ILIKE '%NEW.seller_id%' 
    OR p.prosrc ILIKE '%vendor_id%'
);
