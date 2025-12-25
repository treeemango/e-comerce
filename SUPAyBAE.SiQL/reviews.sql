-- kenya_enhanced_reviews.sql
-- Advanced review system with photos, voting, and verification
-- Supports comprehensive product feedback with moderation

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enhanced_reviews table
CREATE TABLE IF NOT EXISTS public.enhanced_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    parent_review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    moderation_reason TEXT,
    moderated_by UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    pros TEXT[],
    cons TEXT[],
    recommended BOOLEAN,
    would_buy_again BOOLEAN,
    fit_rating INTEGER CHECK (fit_rating >= 1 AND fit_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_photos table
CREATE TABLE IF NOT EXISTS public.review_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_votes table
CREATE TABLE IF NOT EXISTS public.review_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, user_id)
);

-- Create review_reports table
CREATE TABLE IF NOT EXISTS public.review_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    report_reason TEXT NOT NULL CHECK (report_reason IN ('spam', 'inappropriate', 'fake', 'off_topic', 'harassment')),
    report_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_responses table
CREATE TABLE IF NOT EXISTS public.review_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    responder_type TEXT NOT NULL CHECK (responder_type IN ('vendor', 'admin', 'customer_service')),
    response_text TEXT NOT NULL,
    is_official BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_keywords table
CREATE TABLE IF NOT EXISTS public.review_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    category TEXT,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_keyword_associations table
CREATE TABLE IF NOT EXISTS public.review_keyword_associations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    keyword_id UUID REFERENCES public.review_keywords(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(review_id, keyword_id)
);

-- Create product_review_summary table
CREATE TABLE IF NOT EXISTS public.product_review_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    total_reviews INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_distribution JSONB DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}',
    verified_reviews_count INTEGER DEFAULT 0,
    featured_reviews_count INTEGER DEFAULT 0,
    recommended_percentage DECIMAL(5,2) DEFAULT 0.00,
    would_buy_again_percentage DECIMAL(5,2) DEFAULT 0.00,
    average_fit_rating DECIMAL(3,2) DEFAULT 0.00,
    average_value_rating DECIMAL(3,2) DEFAULT 0.00,
    average_quality_rating DECIMAL(3,2) DEFAULT 0.00,
    top_pros TEXT[],
    top_cons TEXT[],
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

-- Create review_moderation_queue table
CREATE TABLE IF NOT EXISTS public.review_moderation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID REFERENCES public.enhanced_reviews(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    moderation_type TEXT DEFAULT 'initial' CHECK (moderation_type IN ('initial', 'flagged', 'reported')),
    assigned_to UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_product_id ON public.enhanced_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_user_id ON public.enhanced_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_order_id ON public.enhanced_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_parent_review_id ON public.enhanced_reviews(parent_review_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_rating ON public.enhanced_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_status ON public.enhanced_reviews(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_is_verified_purchase ON public.enhanced_reviews(is_verified_purchase);
CREATE INDEX IF NOT EXISTS idx_enhanced_reviews_created_at ON public.enhanced_reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON public.review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON public.review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user_id ON public.review_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON public.review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON public.review_reports(status);
CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON public.review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_responder_id ON public.review_responses(responder_id);
CREATE INDEX IF NOT EXISTS idx_review_keywords_sentiment ON public.review_keywords(sentiment);
CREATE INDEX IF NOT EXISTS idx_review_keyword_associations_review_id ON public.review_keyword_associations(review_id);
CREATE INDEX IF NOT EXISTS idx_product_review_summary_product_id ON public.product_review_summary(product_id);
CREATE INDEX IF NOT EXISTS idx_review_moderation_queue_priority ON public.review_moderation_queue(priority);
CREATE INDEX IF NOT EXISTS idx_review_moderation_queue_assigned_to ON public.review_moderation_queue(assigned_to);

-- Row Level Security Policies
ALTER TABLE public.enhanced_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_keyword_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_moderation_queue ENABLE ROW LEVEL SECURITY;

-- Enhanced reviews policies
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.enhanced_reviews;
CREATE POLICY "Anyone can view approved reviews" ON public.enhanced_reviews
    FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Users can create reviews" ON public.enhanced_reviews;
CREATE POLICY "Users can create reviews" ON public.enhanced_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.enhanced_reviews;
CREATE POLICY "Users can update their own reviews" ON public.enhanced_reviews
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Moderators can manage all reviews" ON public.enhanced_reviews;
CREATE POLICY "Moderators can manage all reviews" ON public.enhanced_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Review photos policies
DROP POLICY IF EXISTS "Anyone can view review photos" ON public.review_photos;
CREATE POLICY "Anyone can view review photos" ON public.review_photos
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can manage photos for their reviews" ON public.review_photos;
CREATE POLICY "Users can manage photos for their reviews" ON public.review_photos
    FOR ALL USING (
        review_id IN (
            SELECT id FROM public.enhanced_reviews
            WHERE user_id = auth.uid()
        )
    );

-- Review votes policies
DROP POLICY IF EXISTS "Anyone can view review votes" ON public.review_votes;
CREATE POLICY "Anyone can view review votes" ON public.review_votes
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can vote on reviews" ON public.review_votes;
CREATE POLICY "Authenticated users can vote on reviews" ON public.review_votes
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Review reports policies
DROP POLICY IF EXISTS "Users can report reviews" ON public.review_reports;
CREATE POLICY "Users can report reviews" ON public.review_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Users can view their own reports" ON public.review_reports;
CREATE POLICY "Users can view their own reports" ON public.review_reports
    FOR SELECT USING (auth.uid() = reported_by);

DROP POLICY IF EXISTS "Moderators can manage all reports" ON public.review_reports;
CREATE POLICY "Moderators can manage all reports" ON public.review_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Review responses policies
DROP POLICY IF EXISTS "Anyone can view approved responses" ON public.review_responses;
CREATE POLICY "Anyone can view approved responses" ON public.review_responses
    FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Vendors and admins can create responses" ON public.review_responses;
CREATE POLICY "Vendors and admins can create responses" ON public.review_responses
    FOR INSERT WITH CHECK (
        responder_type IN ('vendor', 'admin') OR
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'customer_service')
        )
    );

DROP POLICY IF EXISTS "Moderators can manage responses" ON public.review_responses;
CREATE POLICY "Moderators can manage responses" ON public.review_responses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Review keywords policies
DROP POLICY IF EXISTS "Anyone can view review keywords" ON public.review_keywords;
CREATE POLICY "Anyone can view review keywords" ON public.review_keywords
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Moderators can manage keywords" ON public.review_keywords;
CREATE POLICY "Moderators can manage keywords" ON public.review_keywords
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Product review summary policies
DROP POLICY IF EXISTS "Anyone can view product review summaries" ON public.product_review_summary;
CREATE POLICY "Anyone can view product review summaries" ON public.product_review_summary
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "System can update review summaries" ON public.product_review_summary;
CREATE POLICY "System can update review summaries" ON public.product_review_summary
    FOR ALL USING (TRUE);

-- Review moderation queue policies
DROP POLICY IF EXISTS "Moderators can manage moderation queue" ON public.review_moderation_queue;
CREATE POLICY "Moderators can manage moderation queue" ON public.review_moderation_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

-- Functions for review management
CREATE OR REPLACE FUNCTION public.calculate_review_helpfulness(review_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    helpful_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO helpful_count
    FROM public.review_votes
    WHERE review_votes.review_id = calculate_review_helpfulness.review_id
    AND vote_type = 'helpful';

    SELECT COUNT(*) INTO total_count
    FROM public.review_votes
    WHERE review_votes.review_id = calculate_review_helpfulness.review_id;

    IF total_count = 0 THEN
        RETURN 0;
    END IF;

    RETURN (helpful_count::DECIMAL / total_count) * 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_product_review_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_product_id UUID;
    review_stats RECORD;
BEGIN
    -- Determine which product_id to update based on the operation
    IF TG_OP = 'DELETE' THEN
        target_product_id := OLD.product_id;
    ELSE
        target_product_id := NEW.product_id;
    END IF;

    -- If no product_id, skip
    IF target_product_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT
        COUNT(*) as total_reviews,
        AVG(rating)::DECIMAL(3,2) as avg_rating,
        COUNT(*) FILTER (WHERE is_verified_purchase = TRUE) as verified_count,
        COUNT(*) FILTER (WHERE is_featured = TRUE) as featured_count,
        (COUNT(*) FILTER (WHERE recommended = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100 as recommended_pct,
        (COUNT(*) FILTER (WHERE would_buy_again = TRUE)::DECIMAL / NULLIF(COUNT(*), 0)) * 100 as buy_again_pct,
        AVG(fit_rating)::DECIMAL(3,2) as avg_fit,
        AVG(value_rating)::DECIMAL(3,2) as avg_value,
        AVG(quality_rating)::DECIMAL(3,2) as avg_quality
    INTO review_stats
    FROM public.enhanced_reviews
    WHERE enhanced_reviews.product_id = target_product_id
    AND status = 'approved';

    INSERT INTO public.product_review_summary (
        product_id, total_reviews, average_rating, verified_reviews_count,
        featured_reviews_count, recommended_percentage, would_buy_again_percentage,
        average_fit_rating, average_value_rating, average_quality_rating, last_updated
    ) VALUES (
        target_product_id, review_stats.total_reviews, review_stats.avg_rating,
        review_stats.verified_count, review_stats.featured_count,
        review_stats.recommended_pct, review_stats.buy_again_pct,
        review_stats.avg_fit, review_stats.avg_value, review_stats.avg_quality, NOW()
    )
    ON CONFLICT (target_product_id) DO UPDATE SET
        total_reviews = EXCLUDED.total_reviews,
        average_rating = EXCLUDED.average_rating,
        verified_reviews_count = EXCLUDED.verified_reviews_count,
        featured_reviews_count = EXCLUDED.featured_reviews_count,
        recommended_percentage = EXCLUDED.recommended_percentage,
        would_buy_again_percentage = EXCLUDED.would_buy_again_percentage,
        average_fit_rating = EXCLUDED.average_fit_rating,
        average_value_rating = EXCLUDED.average_value_rating,
        average_quality_rating = EXCLUDED.average_quality_rating,
        last_updated = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.extract_review_keywords(review_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    keywords TEXT[];
BEGIN
    -- Simple keyword extraction (in production, use NLP services)
    SELECT ARRAY(
        SELECT DISTINCT LOWER(word)
        FROM unnest(string_to_array(review_content, ' ')) AS word
        WHERE LENGTH(word) > 3
        AND word NOT IN ('that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good', 'when', 'come', 'here', 'what', 'some', 'only', 'their', 'said', 'each', 'which', 'time', 'will', 'about', 'would', 'there', 'could', 'other')
        LIMIT 10
    ) INTO keywords;

    RETURN keywords;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
DROP TRIGGER IF EXISTS update_enhanced_reviews_updated_at ON public.enhanced_reviews;
CREATE TRIGGER update_enhanced_reviews_updated_at
    BEFORE UPDATE ON public.enhanced_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_reports_updated_at ON public.review_reports;
CREATE TRIGGER update_review_reports_updated_at
    BEFORE UPDATE ON public.review_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_responses_updated_at ON public.review_responses;
CREATE TRIGGER update_review_responses_updated_at
    BEFORE UPDATE ON public.review_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_moderation_queue_completed_at ON public.review_moderation_queue;
CREATE TRIGGER update_review_moderation_queue_completed_at
    BEFORE UPDATE ON public.review_moderation_queue
    FOR EACH ROW
    WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_review_summary_trigger ON public.enhanced_reviews;
CREATE TRIGGER update_product_review_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.enhanced_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_product_review_summary();

DROP TRIGGER IF EXISTS update_review_helpful_votes_trigger ON public.review_votes;
CREATE TRIGGER update_review_helpful_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.review_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Automatically set is_verified_purchase = TRUE if linked to a delivered order
CREATE OR REPLACE FUNCTION public.set_is_verified_purchase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = NEW.order_id
            AND status = 'delivered'
        ) THEN
            NEW.is_verified_purchase := TRUE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_is_verified_purchase_trigger ON public.enhanced_reviews;
CREATE TRIGGER set_is_verified_purchase_trigger
    BEFORE INSERT ON public.enhanced_reviews
    FOR EACH ROW EXECUTE FUNCTION public.set_is_verified_purchase();

-- Comments
COMMENT ON TABLE public.enhanced_reviews IS 'Enhanced product reviews with detailed ratings and verification';
COMMENT ON TABLE public.review_photos IS 'Photos uploaded with product reviews';
COMMENT ON TABLE public.review_votes IS 'Helpful/unhelpful votes on reviews';
COMMENT ON TABLE public.review_reports IS 'Reports of inappropriate or spam reviews';
COMMENT ON TABLE public.review_responses IS 'Official responses to reviews from vendors/admins';
COMMENT ON TABLE public.product_review_summary IS 'Aggregated review statistics for products';
COMMENT ON TABLE public.review_moderation_queue IS 'Queue for review moderation tasks';
COMMENT ON FUNCTION public.calculate_review_helpfulness(UUID) IS 'Calculates helpfulness percentage for a review';
COMMENT ON FUNCTION public.update_product_review_summary() IS 'Updates aggregated review statistics for a product';
COMMENT ON FUNCTION public.extract_review_keywords(TEXT) IS 'Extracts keywords from review content for analysis';