-- Fix for Lightning Deals picking products without original prices
-- This patch filters out products that don't have actual deals

-- The issue: Products without compare_at_price or discount_percent were appearing
-- in Lightning Deals with deal_type='standard', showing crossed-out prices that
-- equal the current price (0% discount).

-- Solution: Add filter in filtered_products CTE to exclude deal_type='standard'

-- UPDATED IN BOTH MIGRATION FILES:
-- 1. supabase/migrations/20260105123000_get_personalized_suggestions_v2_lightning_deals.sql
-- 2. supabase/migrations/20260106005229_optimize_personalized_suggestions_v2.sql

-- The key change is in the filtered_products CTE:
-- 
-- BEFORE:
--   WHERE v_user_uuid IS NULL OR bp.id NOT IN (...)
--
-- AFTER:
--   WHERE (v_user_uuid IS NULL OR bp.id NOT IN (...))
--   AND bp.deal_type != 'standard'

-- This ensures only products with actual discounts appear in Lightning Deals:
-- - 'coupon' - Products with active coupons
-- - 'hot_discount' - Products with automatic discounts or 30%+ off
-- - 'flash_sale' - Products marked as flash sale
-- - 'lightning_deal' - Products marked as lightning deal
-- - 'discount' - Products with compare_at_price > price or discount_percent >= 10%

-- Products with 'standard' deal_type (no discount) are now filtered out.

-- To apply the fix, deploy the optimized migration:
-- supabase/migrations/20260106005229_optimize_personalized_suggestions_v2.sql
