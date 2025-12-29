DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enhanced_reviews' AND column_name = 'platform_rating') THEN
        ALTER TABLE public.enhanced_reviews ADD COLUMN platform_rating INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enhanced_reviews' AND column_name = 'platform_feedback') THEN
        ALTER TABLE public.enhanced_reviews ADD COLUMN platform_feedback TEXT;
    END IF;
END $$;
