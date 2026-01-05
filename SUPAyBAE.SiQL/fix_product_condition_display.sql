-- =====================================================
-- COMPLETE FIX: Add Condition to products_with_media
-- =====================================================
-- Run this in Supabase SQL Editor to ensure condition 
-- is visible on the frontend.

-- STEP 1: Ensure products have condition values set
UPDATE public.products 
SET condition = 'new' 
WHERE condition IS NULL;

-- STEP 2: Check if the view currently includes condition
-- If this returns 0 rows, the view needs to be recreated
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'products_with_media' 
  AND column_name = 'condition';

-- STEP 3: Apply the full view fix from fix_vendor_id_and_rls_safe.sql
-- This recreates the views WITH condition column included.
-- Copy and paste the content of fix_vendor_id_and_rls_safe.sql 
-- and run it in Supabase SQL Editor.

-- STEP 4: Verify fix
SELECT id, title, condition 
FROM products_with_media 
LIMIT 5;
