-- Verify if condition column is included in products_with_media view
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Check if condition column exists in products table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'condition';

-- Step 2: Check if condition is in the products_with_media view
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products_with_media' AND column_name = 'condition';

-- Step 3: Sample products with their condition values
SELECT id, title, condition 
FROM products 
LIMIT 10;

-- Step 4: Sample from view to confirm condition is exposed
SELECT id, title, condition 
FROM products_with_media 
LIMIT 10;
