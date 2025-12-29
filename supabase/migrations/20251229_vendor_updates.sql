-- Create vendor_media table
create table public.vendor_media (
  id uuid not null default extensions.uuid_generate_v4 (),
  vendor_id uuid not null,
  image_url text not null,
  storage_path text null,
  media_type character varying(50) not null,
  is_main boolean null default false,
  mime_type character varying(100) null,
  file_size bigint null,
  original_filename character varying(255) null,
  uploaded_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint vendor_media_pkey primary key (id),
  constraint vendor_media_uploaded_by_fkey foreign KEY (uploaded_by) references auth.users (id) on delete set null,
  constraint vendor_media_vendor_id_fkey foreign KEY (vendor_id) references vendors (id) on delete CASCADE,
  constraint vendor_media_media_type_check check (
    (
      (media_type)::text = any (
        (
          array[
            'logo'::character varying,
            'banner'::character varying,
            'license'::character varying,
            'other_document'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vendor_media_vendor_id on public.vendor_media using btree (vendor_id) TABLESPACE pg_default;
create index IF not exists idx_vendor_media_media_type on public.vendor_media using btree (media_type) TABLESPACE pg_default;
create index IF not exists idx_vendor_media_vendor_type on public.vendor_media using btree (vendor_id, media_type) TABLESPACE pg_default;

-- Create trigger specific to vendor_media if validation is needed or just rely on generic updated_at
-- Assuming 'update_updated_at_column' exists generally, but sticking to user request specifically:
create trigger update_vendor_media_updated_at BEFORE
update on vendor_media for EACH row
execute FUNCTION update_updated_at_column ();


-- =====================================================
-- FUNCTION: get_vendor_card_info
-- Updated to include 'logo_url'
-- =====================================================

DROP FUNCTION IF EXISTS get_vendor_card_info(TEXT[]);

CREATE OR REPLACE FUNCTION get_vendor_card_info(product_ids TEXT[])
RETURNS TABLE (
    vendor_id UUID,
    user_id UUID,
    seller_id UUID,
    business_name TEXT,
    business_description TEXT,
    join_date TIMESTAMPTZ,
    vendor_rating NUMERIC,
    review_count INTEGER,
    total_products INTEGER,
    completed_orders BIGINT,
    delivery_speed TEXT,
    order_completion_rate NUMERIC,
    badges JSONB,
    is_verified BOOLEAN,
    business_country TEXT,
    cancellation_rate NUMERIC,
    response_time TEXT,
    seller_since TIMESTAMPTZ,
    follower_count INTEGER,
    logo_url TEXT -- Added this field
)
LANGUAGE SQL
AS $$
    -- Get vendor info for all products by joining through seller_id
    SELECT DISTINCT ON (v.id)
        v.id as vendor_id,
        v.user_id,
        p.seller_id,
        v.business_name,
        v.business_description,
        v.created_at as join_date,
        COALESCE(v.rating, 0) as vendor_rating,
        COALESCE(v.review_count, 0) as review_count,
        COUNT(DISTINCT p2.id) as total_products,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') as completed_orders,
        CASE 
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 20 THEN 'Fast & Reliable'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 10 THEN 'Standard Delivery'
            WHEN COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') >= 1 THEN 'New Seller'
            ELSE 'Just Joined'
        END as delivery_speed,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'delivered') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('delivered', 'cancelled')), 0))::numeric, 2) as order_completion_rate,
        COALESCE(sb.badges, '[]'::jsonb) as badges,
        COALESCE(v.verification_status = 'approved', false) as is_verified,
        COALESCE(v.address_country, 'Kenya') as business_country,
        ROUND((COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'cancelled') * 100.0 / 
            NULLIF(COUNT(DISTINCT o.id), 0))::numeric, 2) as cancellation_rate,
        CASE
            WHEN v.created_at > NOW() - INTERVAL '30 days' THEN 'New'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 24 THEN '< 24 hours'
            WHEN AVG(EXTRACT(EPOCH FROM (o.updated_at - o.created_at)) / 3600) < 48 THEN '< 48 hours'
            ELSE '> 48 hours'
        END as response_time,
        v.created_at as seller_since,
        COALESCE(v.follower_count, 0) as follower_count,
        v.logo_url -- Selected logo_url
    FROM products p
    INNER JOIN vendors v ON v.user_id = p.seller_id
    LEFT JOIN products p2 ON p2.seller_id = v.user_id AND p2.status = 'approved'
    LEFT JOIN order_items oi ON oi.product_id = p2.id
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN badge_2030_seller_badges sb ON sb.seller_id = v.user_id
    WHERE p.id::text = ANY(product_ids)
        AND COALESCE(v.is_active, true) = true
    GROUP BY v.id, v.user_id, p.seller_id, v.business_name, v.business_description, 
             v.created_at, v.rating, v.review_count, v.verification_status, 
             v.address_country, sb.badges, v.follower_count, v.logo_url -- Added to group by
    ORDER BY v.id;
$$;
