-- 1. Create function to recalculate stats for a specific seller (user_id)
CREATE OR REPLACE FUNCTION update_vendor_stats(target_seller_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_reviews INTEGER;
    v_avg_rating NUMERIC;
BEGIN
    -- Calculate total reviews and weighted average rating from product summaries
    -- Joining products to find which ones belong to this seller
    -- Joining product_review_summary to get the stats
    SELECT 
        COALESCE(SUM(prs.total_reviews), 0),
        CASE 
            WHEN SUM(prs.total_reviews) > 0 THEN 
                ROUND(SUM(prs.average_rating * prs.total_reviews) / SUM(prs.total_reviews), 1)
            ELSE 0 
        END
    INTO v_total_reviews, v_avg_rating
    FROM products p
    JOIN product_review_summary prs ON p.id = prs.product_id
    WHERE p.seller_id = target_seller_user_id;

    -- Update vendors table (using user_id to match products.seller_id)
    UPDATE vendors
    SET 
        review_count = v_total_reviews,
        rating = v_avg_rating,
        -- vendor_rating removed as it is not a column in the vendors table
        updated_at = NOW()
    WHERE user_id = target_seller_user_id;
    
    RAISE NOTICE 'Updated vendor stats for user %: Reviews=%, Rating=%', target_seller_user_id, v_total_reviews, v_avg_rating;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger function to auto-update when product stats change
CREATE OR REPLACE FUNCTION trigger_update_vendor_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
BEGIN
    -- Get seller_id from the product associated with this review summary
    SELECT seller_id INTO v_seller_id
    FROM products
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);

    IF v_seller_id IS NOT NULL THEN
        PERFORM update_vendor_stats(v_seller_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop existing trigger if it exists to avoid duplicates
DROP TRIGGER IF EXISTS trg_update_vendor_stats ON product_review_summary;

-- 4. Create trigger on product_review_summary
CREATE TRIGGER trg_update_vendor_stats
AFTER INSERT OR UPDATE OF total_reviews, average_rating OR DELETE
ON product_review_summary
FOR EACH ROW
EXECUTE FUNCTION trigger_update_vendor_stats();

-- 5. Run initial update for ALL vendors who have products
DO $$
DECLARE
    r RECORD;
    count INT := 0;
BEGIN
    FOR r IN SELECT DISTINCT seller_id FROM products WHERE seller_id IS NOT NULL LOOP
        PERFORM update_vendor_stats(r.seller_id);
        count := count + 1;
    END LOOP;
    RAISE NOTICE 'Finished initial update for % vendors', count;
END;
$$;
