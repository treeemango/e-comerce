-- Sync Product Ratings form Summary
-- The `product_review_summary` table is the source of truth, but `products` table has cached columns `rating` and `review_count`
-- used by high-performance queries like 'get_personalized_suggestions_v2'. We must keep them in sync.

-- 1. Create a function to sync from summary to products table
CREATE OR REPLACE FUNCTION public.sync_review_summary_to_product()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- If summary is deleted (unlikely), reset product stats
        UPDATE public.products
        SET rating = 0, review_count = 0
        WHERE id = OLD.product_id;
    ELSE
        -- Update products table with new stats
        UPDATE public.products
        SET 
            rating = NEW.average_rating,
            review_count = NEW.total_reviews
        WHERE id = NEW.product_id;
    END IF;
    RETURN NULL; -- Trigger is AFTER, return value ignored
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_review_summary_to_product ON public.product_review_summary;

-- 3. Create Trigger on product_review_summary
CREATE TRIGGER trg_sync_review_summary_to_product
AFTER INSERT OR UPDATE OF total_reviews, average_rating OR DELETE
ON public.product_review_summary
FOR EACH ROW
EXECUTE FUNCTION public.sync_review_summary_to_product();

-- 4. Run immediate sync for all existing summaries (Wrapped in DO block for RAISING NOTICE)
DO $$
DECLARE
    count_updated INTEGER;
BEGIN
    -- Update products with data from summary
    WITH updated_rows AS (
        UPDATE public.products p
        SET 
            rating = prs.average_rating,
            review_count = prs.total_reviews
        FROM public.product_review_summary prs
        WHERE p.id = prs.product_id
        RETURNING p.id
    )
    SELECT count(*) INTO count_updated FROM updated_rows;

    RAISE NOTICE 'Synced rating and review_count for % products from review summaries.', count_updated;
END;
$$;
