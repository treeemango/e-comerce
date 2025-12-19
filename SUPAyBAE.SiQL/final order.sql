. The Storage Layer (Ledger Tables)
This "resets" and then creates the escrow accounts for sellers and affiliates.

SQL

-- Cleanup existing relations if they exist
DROP TABLE IF EXISTS public.affiliate_commissions CASCADE;
DROP TABLE IF EXISTS public.seller_payouts CASCADE;

-- A. Seller Escrow Table
CREATE TABLE public.seller_payouts (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  seller_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'escrow', -- 'escrow', 'available', 'processing', 'paid'
  available_at timestamp with time zone, -- Maturity date
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_payouts_pkey PRIMARY KEY (id),
  CONSTRAINT seller_payouts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id),
  CONSTRAINT seller_payouts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT seller_payouts_status_check CHECK (status IN ('escrow', 'available', 'processing', 'paid'))
);

-- B. Affiliate Commission Table
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  affiliate_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  status text DEFAULT 'pending', -- 'pending', 'available', 'paid', 'cancelled'
  available_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT affiliate_commissions_pkey PRIMARY KEY (id),
  CONSTRAINT affiliate_commissions_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id),
  CONSTRAINT affiliate_commissions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Essential Performance Indices
CREATE INDEX idx_seller_payouts_maturity ON public.seller_payouts (status, available_at) WHERE (status = 'escrow');
CREATE INDEX idx_affiliate_commissions_maturity ON public.affiliate_commissions (status, available_at) WHERE (status = 'pending');
2. The Logic Layer (Financial Orchestrator)
This function splits the money the moment the delivery is confirmed. It pays the driver immediately and locks the seller/affiliate shares for 10 days.

SQL

CREATE OR REPLACE FUNCTION public.fn_orchestrate_delivery_payouts()
RETURNS TRIGGER AS $$
DECLARE
    v_seller_id UUID;
    v_affiliate_id UUID;
    v_net_earnings NUMERIC;
    v_delivery_cost NUMERIC;
    v_total_order_val NUMERIC;
    v_affiliate_commission NUMERIC;
    v_maturity_date TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '10 days';
BEGIN
    -- 1. Fetch Order Data
    SELECT 
        o.user_id, o.delivery_cost, o.referred_by_affiliate_id, o.total_price 
    INTO v_seller_id, v_delivery_cost, v_affiliate_id, v_total_order_val
    FROM public.orders o WHERE o.id = NEW.order_id;
    
    -- 2. Calculate Totals
    SELECT SUM(net_seller_earnings) INTO v_net_earnings 
    FROM public.order_items WHERE order_id = NEW.order_id;

    -- Calculate Affiliate Share (5% flat example)
    v_affiliate_commission := COALESCE(v_total_order_val, 0) * 0.05;

    -- 3. ACTION: Immediate Transporter Payment Record
    INSERT INTO public.delivery_partner_payments (
        partner_id, amount, status, notes, assignment_id
    ) VALUES (
        NEW.created_by, 
        COALESCE(v_delivery_cost, 0), 
        'pending', 
        'Auto-payout generated for Order ' || NEW.order_id,
        (SELECT id FROM delivery_assignments WHERE order_id = NEW.order_id LIMIT 1)
    );

    -- 4. ACTION: Seller Escrow (10-Day Hold)
    INSERT INTO public.seller_payouts (
        seller_id, order_id, amount, available_at, status
    ) VALUES (
        v_seller_id, NEW.order_id, COALESCE(v_net_earnings, 0), v_maturity_date, 'escrow'
    );

    -- 5. ACTION: Affiliate Commission (10-Day Hold)
    IF v_affiliate_id IS NOT NULL THEN
        INSERT INTO public.affiliate_commissions (
            affiliate_id, order_id, amount, available_at, status
        ) VALUES (
            v_affiliate_id, NEW.order_id, v_affiliate_commission, v_maturity_date, 'pending'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to link function to the delivery event
DROP TRIGGER IF EXISTS trg_on_order_delivered_finance ON public.order_tracking_events;
CREATE TRIGGER trg_on_order_delivered_finance
AFTER INSERT ON public.order_tracking_events
FOR EACH ROW
WHEN (NEW.event_type = 'delivered')
EXECUTE FUNCTION public.fn_orchestrate_delivery_payouts();
3. The Automation Layer (Daily Cron Job)
This releases the funds from "Escrow" to "Available" every night at midnight once the 10-day window closes.

SQL

-- Ensure pg_cron is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the release task
SELECT cron.schedule('release-escrow-payouts-midnight', '0 0 * * *', $$
    BEGIN;
        -- Unlock Seller Funds
        UPDATE public.seller_payouts 
        SET status = 'available', updated_at = NOW()
        WHERE status = 'escrow' AND available_at <= NOW();

        -- Unlock Affiliate Commissions
        UPDATE public.affiliate_commissions 
        SET status = 'available'
        WHERE status = 'pending' AND available_at <= NOW();
    COMMIT;
$$);
4. The Safety Layer (Dispute Freeze)
If a customer opens a ticket in order_issues, this trigger automatically "freezes" the payout by moving the availability date forward by 30 days.

SQL

CREATE OR REPLACE FUNCTION public.fn_freeze_payout_on_dispute()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.seller_payouts 
    SET available_at = NOW() + INTERVAL '30 days'
    WHERE order_id = NEW.order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_freeze_payout_on_issue ON public.order_issues;
CREATE TRIGGER trg_freeze_payout_on_issue
AFTER INSERT ON public.order_issues
FOR EACH ROW
EXECUTE FUNCTION public.fn_freeze_payout_on_dispute();
5. Consolidated Financial View
For your Admin and Seller dashboards to see "Escrow" vs "Available" balances.

SQL

CREATE OR REPLACE VIEW public.marketplace_escrow_summary AS
SELECT 
    'Seller' as recipient_type, seller_id as recipient_id, status, SUM(amount) as total_amount
FROM public.seller_payouts GROUP BY seller_id, status
UNION ALL
SELECT 
    'Affiliate' as recipient_type, affiliate_id as recipient_id, status, SUM(amount) as total_amount
FROM public.affiliate_commissions GROUP BY affiliate_id, status;

my oders table create table public.orders (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  total numeric(10, 2) not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  customer_name text null,
  customer_email text null,
  items jsonb null default '[]'::jsonb,
  shipping_address text null,
  shipping_method text null,
  tracking_number text null,
  carrier text null,
  notes text null,
  customer_phone text null,
  shipping_address_line1 text null,
  shipping_postcode text null,
  shipping_town_city text null,
  shipping_county text null,
  shipping_country text null,
  shipping_additional_info text null,
  payment_method_id text null,
  payment_gateway_ref text null,
  first_name text null,
  last_name text null,
  order_number text null,
  total_price numeric(10, 2) null default 0.00,
  constraint orders_pkey primary key (id),
  constraint orders_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_orders_user_id on public.orders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_orders_user on public.orders using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_orders_created_at on public.orders using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_orders_id on public.orders using btree (id) TABLESPACE pg_default;

create index IF not exists idx_orders_status on public.orders using btree (status) TABLESPACE pg_default;

create index IF not exists idx_orders_user_status on public.orders using btree (user_id, status) TABLESPACE pg_default;

create trigger orders_deduct_stock
after INSERT on orders for EACH row
execute FUNCTION deduct_product_stock ();

create trigger trg_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_timestamp ();

create trigger trg_update_loyalty_on_order
after
update on orders for EACH row
execute FUNCTION update_loyalty_on_order_complete ();

create trigger trigger_create_shipment_on_order_confirm
after
update on orders for EACH row when (old.status is distinct from new.status)
execute FUNCTION trigger_create_shipment_on_order (); create table public.order_tracking_events (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  event_type text not null,
  event_description text not null,
  location geometry null,
  location_name text null,
  estimated_delivery_time timestamp with time zone null,
  actual_delivery_time timestamp with time zone null,
  carrier_name text null,
  tracking_number text null,
  driver_name text null,
  driver_phone text null,
  driver_photo_url text null,
  vehicle_info text null,
  weather_conditions text null,
  traffic_conditions text null,
  delay_reason text null,
  delay_duration interval null,
  customer_notified boolean null default false,
  internal_notes text null,
  event_data jsonb null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint order_tracking_events_pkey primary key (id),
  constraint order_tracking_events_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint order_tracking_events_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_tracking_events_event_type_check check (
    (
      event_type = any (
        array[
          'order_placed'::text,
          'payment_confirmed'::text,
          'order_confirmed'::text,
          'preparing'::text,
          'ready_for_pickup'::text,
          'picked_up'::text,
          'in_transit'::text,
          'out_for_delivery'::text,
          'delivered'::text,
          'failed_delivery'::text,
          'returned'::text,
          'cancelled'::text,
          'refunded'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_tracking_events_order_id on public.order_tracking_events using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_tracking_events_event_type on public.order_tracking_events using btree (event_type) TABLESPACE pg_default;

create index IF not exists idx_order_tracking_events_created_at on public.order_tracking_events using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_order_tracking_events_location on public.order_tracking_events using gist (location) TABLESPACE pg_default;

create trigger delivery_performance_trigger
after INSERT on order_tracking_events for EACH row when (
  new.event_type = any (
    array[
      'delivered'::text,
      'failed_delivery'::text,
      'returned'::text
    ]
  )
)
execute FUNCTION delivery_performance_trigger_func (); create table public.order_reports (
  id uuid not null default extensions.uuid_generate_v4 (),
  seller_id uuid not null,
  report_type text not null,
  batch_id text null,
  status text null,
  download_url text null,
  created_at timestamp with time zone null default now(),
  constraint order_reports_pkey primary key (id),
  constraint order_reports_seller_id_fkey foreign KEY (seller_id) references auth.users (id),
  constraint order_reports_status_check check (
    (
      status = any (
        array['Processing'::text, 'Ready'::text, 'Failed'::text]
      )
    )
  )
) TABLESPACE pg_default; create table public.order_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  product_id uuid not null,
  quantity integer not null,
  price numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  unit_price numeric not null default 0,
  business_id uuid null,
  seller_commission_rate numeric(5, 2) null default 10.00,
  net_seller_earnings numeric(15, 2) null default 0.00,
  product_variant_id uuid null,
  variant_id uuid not null,
  constraint order_items_pkey primary key (id),
  constraint fk_items_order foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint fk_items_product foreign KEY (product_id) references products (id) on delete RESTRICT,
  constraint fk_items_variant foreign KEY (variant_id) references product_variants (id) on delete RESTRICT,
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_product_id_fkey foreign KEY (product_id) references products (id),
  constraint order_items_product_variant_id_fkey foreign KEY (product_variant_id) references product_variants (id),
  constraint fk_items_business foreign KEY (business_id) references businesses (id) on delete RESTRICT,
  constraint order_items_seller_id_fkey foreign KEY (business_id) references businesses (id)
) TABLESPACE pg_default;

create index IF not exists idx_order_items_order_id on public.order_items using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_items_product_id on public.order_items using btree (product_id) TABLESPACE pg_default;

create index IF not exists idx_order_items_seller_id on public.order_items using btree (business_id) TABLESPACE pg_default;

create trigger trg_order_items_updated_at BEFORE
update on order_items for EACH row
execute FUNCTION update_timestamp ();

create trigger trigger_update_product_sales_count
after INSERT
or DELETE
or
update on order_items for EACH row
execute FUNCTION update_product_sales_count ();create table public.order_issues (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  issue_type text not null,
  severity text null default 'medium'::text,
  description text not null,
  reported_by uuid null,
  assigned_to uuid null,
  status text null default 'open'::text,
  resolution text null,
  resolution_date timestamp with time zone null,
  refund_amount numeric(10, 2) null,
  replacement_order_id uuid null,
  priority integer null default 1,
  tags text[] null,
  internal_notes text null,
  customer_visible boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint order_issues_pkey primary key (id),
  constraint order_issues_replacement_order_id_fkey foreign KEY (replacement_order_id) references orders (id),
  constraint order_issues_reported_by_fkey foreign KEY (reported_by) references auth.users (id) on delete CASCADE,
  constraint order_issues_assigned_to_fkey foreign KEY (assigned_to) references auth.users (id),
  constraint order_issues_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_issues_status_check check (
    (
      status = any (
        array[
          'open'::text,
          'investigating'::text,
          'resolved'::text,
          'closed'::text
        ]
      )
    )
  ),
  constraint order_issues_issue_type_check check (
    (
      issue_type = any (
        array[
          'wrong_item'::text,
          'damaged_item'::text,
          'missing_item'::text,
          'late_delivery'::text,
          'wrong_address'::text,
          'payment_issue'::text,
          'other'::text
        ]
      )
    )
  ),
  constraint order_issues_priority_check check (
    (
      (priority >= 1)
      and (priority <= 5)
    )
  ),
  constraint order_issues_severity_check check (
    (
      severity = any (
        array[
          'low'::text,
          'medium'::text,
          'high'::text,
          'critical'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_issues_order_id on public.order_issues using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_issues_status on public.order_issues using btree (status) TABLESPACE pg_default;

create index IF not exists idx_order_issues_severity on public.order_issues using btree (severity) TABLESPACE pg_default;

create trigger update_order_issues_updated_at BEFORE
update on order_issues for EACH row
execute FUNCTION update_updated_at_column ();create table public.order_file_uploads (
  id uuid not null default extensions.uuid_generate_v4 (),
  seller_id uuid not null,
  file_name text not null,
  file_type text null,
  records_processed integer null default 0,
  status text null,
  error_log text null,
  created_at timestamp with time zone null default now(),
  constraint order_file_uploads_pkey primary key (id),
  constraint order_file_uploads_seller_id_fkey foreign KEY (seller_id) references auth.users (id),
  constraint order_file_uploads_status_check check (
    (
      status = any (
        array[
          'Uploaded'::text,
          'Processing'::text,
          'Success'::text,
          'Failed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;create table public.order_delivery_schedules (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  scheduled_date date not null,
  scheduled_time_slot text not null,
  delivery_window_start timestamp with time zone null,
  delivery_window_end timestamp with time zone null,
  is_flexible boolean null default false,
  alternative_dates date[] null,
  customer_instructions text null,
  delivery_address jsonb null,
  contact_person text null,
  contact_phone text null,
  requires_signature boolean null default false,
  special_handling text[] null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint order_delivery_schedules_pkey primary key (id),
  constraint order_delivery_schedules_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_order_delivery_schedules_order_id on public.order_delivery_schedules using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_delivery_schedules_scheduled_date on public.order_delivery_schedules using btree (scheduled_date) TABLESPACE pg_default;

create trigger update_order_delivery_schedules_updated_at BEFORE
update on order_delivery_schedules for EACH row
execute FUNCTION update_updated_at_column ();create table public.order_delivery_preferences (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  preferred_delivery_times text[] null,
  preferred_days text[] null,
  avoid_dates date[] null,
  delivery_instructions text null,
  contactless_delivery boolean null default false,
  signature_required boolean null default false,
  allow_substitutions boolean null default true,
  notification_preferences jsonb null default '{"sms": true, "push": true, "email": true}'::jsonb,
  saved_addresses jsonb null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint order_delivery_preferences_pkey primary key (id),
  constraint order_delivery_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_order_delivery_preferences_user_id on public.order_delivery_preferences using btree (user_id) TABLESPACE pg_default;

create trigger update_order_delivery_preferences_updated_at BEFORE
update on order_delivery_preferences for EACH row
execute FUNCTION update_updated_at_column (); are they all relevant and do they alighn with my database

for pay out i have create table public.seller_payment_methods (
  id uuid not null default extensions.uuid_generate_v4 (),
  seller_id uuid not null,
  type text not null,
  last4 text null,
  details jsonb null,
  is_default boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint seller_payment_methods_pkey primary key (id),
  constraint seller_payment_methods_seller_id_fkey foreign KEY (seller_id) references auth.users (id)
) TABLESPACE pg_default;create table public.payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid not null,
  stripe_payment_intent_id text null,
  amount numeric(10, 2) not null,
  status text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_order_id_fkey foreign KEY (order_id) references orders (id)
) TABLESPACE pg_default;

create trigger trg_payments_updated_at BEFORE
update on payments for EACH row
execute FUNCTION update_timestamp ();create table public.delivery_partner_payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  partner_id uuid null,
  assignment_id uuid null,
  amount numeric(10, 2) not null,
  currency text null default 'KES'::text,
  payment_date timestamp with time zone null default now(),
  payment_method text null,
  reference_number text null,
  status text null default 'pending'::text,
  processed_at timestamp with time zone null,
  notes text null,
  constraint delivery_partner_payments_pkey primary key (id),
  constraint delivery_partner_payments_assignment_id_fkey foreign KEY (assignment_id) references delivery_assignments (id) on delete CASCADE,
  constraint delivery_partner_payments_partner_id_fkey foreign KEY (partner_id) references delivery_partners (id) on delete CASCADE,
  constraint delivery_partner_payments_payment_method_check check (
    (
      payment_method = any (
        array[
          'bank_transfer'::text,
          'mobile_money'::text,
          'cash'::text
        ]
      )
    )
  ),
  constraint delivery_partner_payments_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'processed'::text,
          'failed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_payments_partner_id on public.delivery_partner_payments using btree (partner_id) TABLESPACE pg_default;create table public.affiliate_payouts (
  id uuid not null default extensions.uuid_generate_v4 (),
  affiliate_id uuid null,
  amount numeric(10, 2) not null,
  currency text null default 'KES'::text,
  payment_method text not null,
  payment_details jsonb null,
  status text null default 'pending'::text,
  requested_at timestamp with time zone null default now(),
  processed_at timestamp with time zone null,
  paid_at timestamp with time zone null,
  transaction_id text null,
  failure_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint affiliate_payouts_pkey primary key (id),
  constraint affiliate_payouts_affiliate_id_fkey foreign KEY (affiliate_id) references affiliates (id) on delete CASCADE,
  constraint affiliate_payouts_payment_method_check check (
    (
      payment_method = any (
        array[
          'bank_transfer'::text,
          'mobile_money'::text,
          'paypal'::text
        ]
      )
    )
  ),
  constraint affiliate_payouts_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'processing'::text,
          'paid'::text,
          'failed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_affiliate_payouts_affiliate_id on public.affiliate_payouts using btree (affiliate_id) TABLESPACE pg_default;

create index IF not exists idx_affiliate_payouts_status on public.affiliate_payouts using btree (status) TABLESPACE pg_default;

create trigger update_affiliate_payouts_updated_at BEFORE
update on affiliate_payouts for EACH row
execute FUNCTION update_updated_at_column ();create table public.affiliate_payout_items (
  id uuid not null default extensions.uuid_generate_v4 (),
  payout_id uuid null,
  commission_id uuid null,
  amount numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  constraint affiliate_payout_items_pkey primary key (id),
  constraint affiliate_payout_items_payout_id_commission_id_key unique (payout_id, commission_id),
  constraint affiliate_payout_items_commission_id_fkey foreign KEY (commission_id) references affiliate_commissions (id) on delete CASCADE,
  constraint affiliate_payout_items_payout_id_fkey foreign KEY (payout_id) references affiliate_payouts (id) on delete CASCADE
) TABLESPACE pg_default; are they also relevant and inline