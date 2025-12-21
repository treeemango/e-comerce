-- This is the WORKING lightning_deals.sql with ONLY sale_unit added
-- No other logic changes to avoid breaking the department/category matching

DROP FUNCTION IF EXISTS get_personalized_suggestions_v2;

CREATE OR REPLACE FUNCTION get_personalized_suggestions_v2(
  p_user_param TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  min_rating NUMERIC DEFAULT 3.0,
  min_stock INT DEFAULT 5,
  include_categories BOOLEAN DEFAULT true,
  categories_limit INT DEFAULT 6,
  min_deals_per_category INT DEFAULT 0,
  category_filter TEXT DEFAULT NULL,
  departments_limit INT DEFAULT NULL,
  categories_per_department INT DEFAULT 6
)
RETURNS JSONB
LANGUAGE PLPGSQL
AS $$
DECLARE
  product_results JSONB;
  department_results JSONB;
  final_result JSONB;
  user_history_count INT;
  user_has_sufficient_history BOOLEAN;
  filtered_category_id UUID;
  actual_departments_limit INT;
BEGIN
  
  -- Convert category_filter to UUID if provided
  filtered_category_id := NULLIF(category_filter, '')::UUID;
  
  -- Handle backward compatibility
  actual_departments_limit := COALESCE(departments_limit, categories_limit);
  
  -- Check if user has sufficient history for personalization
  SELECT 
    COALESCE(
      (SELECT COUNT(*) FROM user_product_views WHERE user_id = p_user_param::UUID AND viewed_at > NOW() - INTERVAL '30 days') +
      (SELECT COUNT(*) FROM orders o JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = p_user_param::UUID AND o.status IN ('completed', 'shipped') AND o.created_at > NOW() - INTERVAL '90 days'),
      0
    ) INTO user_history_count;
  
  user_has_sufficient_history := (user_history_count >= 3);
