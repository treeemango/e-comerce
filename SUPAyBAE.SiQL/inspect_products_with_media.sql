-- Inspect definition of 'products_with_media'
-- This view is used by fetchBestSellingItems to "enrich" the data.
-- If it lacks 'rating' and 'review_count', the ratings will be lost.

SELECT pg_get_viewdef('public.products_with_media', true);
