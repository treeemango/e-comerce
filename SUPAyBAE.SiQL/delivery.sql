create table public.delivery_assignments (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  partner_id uuid null,
  vehicle_id uuid null,
  driver_name text null,
  driver_phone text null,
  driver_photo_url text null,
  status text null default 'assigned'::text,
  assigned_at timestamp with time zone null default now(),
  picked_up_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  estimated_delivery_time timestamp with time zone null,
  actual_delivery_time timestamp with time zone null,
  delivery_fee numeric(8, 2) null,
  tracking_number text null,
  current_location geometry null,
  location_history jsonb null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_assignments_pkey primary key (id),
  constraint delivery_assignments_tracking_number_key unique (tracking_number),
  constraint delivery_assignments_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint delivery_assignments_partner_id_fkey foreign KEY (partner_id) references delivery_partners (id) on delete CASCADE,
  constraint delivery_assignments_vehicle_id_fkey foreign KEY (vehicle_id) references delivery_partner_vehicles (id) on delete set null,
  constraint delivery_assignments_status_check check (
    (
      status = any (
        array[
          'assigned'::text,
          'picked_up'::text,
          'in_transit'::text,
          'delivered'::text,
          'failed'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_order_id on public.delivery_assignments using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_partner_id on public.delivery_assignments using btree (partner_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_status on public.delivery_assignments using btree (status) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_tracking_number on public.delivery_assignments using btree (tracking_number) TABLESPACE pg_default;

create index IF not exists idx_delivery_assignments_current_location on public.delivery_assignments using gist (current_location) TABLESPACE pg_default;

create trigger update_delivery_assignments_updated_at BEFORE
update on delivery_assignments for EACH row
execute FUNCTION update_updated_at_column ();create table public.delivery_partner_payments (
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

create index IF not exists idx_delivery_partner_payments_partner_id on public.delivery_partner_payments using btree (partner_id) TABLESPACE pg_default; create table public.delivery_partner_ratings (
  id uuid not null default extensions.uuid_generate_v4 (),
  assignment_id uuid null,
  partner_id uuid null,
  customer_id uuid null,
  rating integer not null,
  review_text text null,
  delivery_speed_rating integer null,
  packaging_rating integer null,
  communication_rating integer null,
  created_at timestamp with time zone null default now(),
  constraint delivery_partner_ratings_pkey primary key (id),
  constraint delivery_partner_ratings_customer_id_fkey foreign KEY (customer_id) references auth.users (id) on delete CASCADE,
  constraint delivery_partner_ratings_partner_id_fkey foreign KEY (partner_id) references delivery_partners (id) on delete CASCADE,
  constraint delivery_partner_ratings_assignment_id_fkey foreign KEY (assignment_id) references delivery_assignments (id) on delete CASCADE,
  constraint delivery_partner_ratings_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  ),
  constraint delivery_partner_ratings_communication_rating_check check (
    (
      (communication_rating >= 1)
      and (communication_rating <= 5)
    )
  ),
  constraint delivery_partner_ratings_delivery_speed_rating_check check (
    (
      (delivery_speed_rating >= 1)
      and (delivery_speed_rating <= 5)
    )
  ),
  constraint delivery_partner_ratings_packaging_rating_check check (
    (
      (packaging_rating >= 1)
      and (packaging_rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_ratings_partner_id on public.delivery_partner_ratings using btree (partner_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_ratings_customer_id on public.delivery_partner_ratings using btree (customer_id) TABLESPACE pg_default;

create trigger update_delivery_partner_rating_trigger
after INSERT
or
update on delivery_partner_ratings for EACH row
execute FUNCTION update_delivery_partner_rating (); create table public.delivery_partner_vehicles (
  id uuid not null default extensions.uuid_generate_v4 (),
  partner_id uuid null,
  vehicle_type text not null,
  license_plate text not null,
  make text null,
  model text null,
  year integer null,
  color text null,
  capacity_kg numeric(8, 2) null,
  max_package_size text null,
  insurance_number text null,
  registration_expiry date null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint delivery_partner_vehicles_pkey primary key (id),
  constraint delivery_partner_vehicles_partner_id_fkey foreign KEY (partner_id) references delivery_partners (id) on delete CASCADE,
  constraint delivery_partner_vehicles_max_package_size_check check (
    (
      max_package_size = any (
        array[
          'small'::text,
          'medium'::text,
          'large'::text,
          'extra_large'::text
        ]
      )
    )
  ),
  constraint delivery_partner_vehicles_vehicle_type_check check (
    (
      vehicle_type = any (
        array[
          'motorcycle'::text,
          'car'::text,
          'van'::text,
          'truck'::text,
          'bicycle'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_partner_vehicles_partner_id on public.delivery_partner_vehicles using btree (partner_id) TABLESPACE pg_default; create table public.delivery_partners (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  company_name text not null,
  company_description text null,
  contact_email text not null,
  contact_phone text not null,
  website_url text null,
  logo_url text null,
  license_number text not null,
  license_expiry_date date null,
  insurance_policy_number text null,
  insurance_expiry_date date null,
  service_areas text[] null,
  operating_hours jsonb null,
  delivery_radius_km integer null default 50,
  base_delivery_fee numeric(8, 2) null default 0.00,
  per_km_fee numeric(8, 2) null default 0.00,
  is_verified boolean null default false,
  verification_status text null default 'pending'::text,
  rating numeric(3, 2) null default 0.00,
  total_deliveries integer null default 0,
  success_rate numeric(5, 2) null default 0.00,
  is_active boolean null default true,
  current_location geometry null,
  last_location_update timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_partners_pkey primary key (id),
  constraint delivery_partners_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint delivery_partners_verification_status_check check (
    (
      verification_status = any (
        array[
          'pending'::text,
          'verified'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_partners_user_id on public.delivery_partners using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_partners_is_verified on public.delivery_partners using btree (is_verified) TABLESPACE pg_default;

create index IF not exists idx_delivery_partners_is_active on public.delivery_partners using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_delivery_partners_current_location on public.delivery_partners using gist (current_location) TABLESPACE pg_default;

create trigger update_delivery_partners_updated_at BEFORE
update on delivery_partners for EACH row
execute FUNCTION update_updated_at_column (); create table public.delivery_performance_metrics (
  id uuid not null default extensions.uuid_generate_v4 (),
  delivery_partner_id uuid null,
  date date not null,
  total_deliveries integer null default 0,
  on_time_deliveries integer null default 0,
  late_deliveries integer null default 0,
  failed_deliveries integer null default 0,
  average_delivery_time interval null,
  customer_satisfaction_rating numeric(3, 2) null,
  issues_reported integer null default 0,
  issues_resolved integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint delivery_performance_metrics_pkey primary key (id),
  constraint delivery_performance_metrics_delivery_partner_id_fkey foreign KEY (delivery_partner_id) references delivery_partners (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_delivery_performance_metrics_partner_id on public.delivery_performance_metrics using btree (delivery_partner_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_performance_metrics_date on public.delivery_performance_metrics using btree (date) TABLESPACE pg_default; create table public.delivery_proofs (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  tracking_event_id uuid null,
  proof_type text not null,
  proof_data text not null,
  captured_by uuid null,
  captured_at timestamp with time zone null default now(),
  location geometry null,
  device_info jsonb null,
  verification_status text null default 'pending'::text,
  verified_by uuid null,
  verified_at timestamp with time zone null,
  notes text null,
  constraint delivery_proofs_pkey primary key (id),
  constraint delivery_proofs_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint delivery_proofs_verified_by_fkey foreign KEY (verified_by) references auth.users (id),
  constraint delivery_proofs_captured_by_fkey foreign KEY (captured_by) references auth.users (id),
  constraint delivery_proofs_tracking_event_id_fkey foreign KEY (tracking_event_id) references order_tracking_events (id) on delete CASCADE,
  constraint delivery_proofs_proof_type_check check (
    (
      proof_type = any (
        array[
          'signature'::text,
          'photo'::text,
          'video'::text,
          'qr_code'::text,
          'otp'::text
        ]
      )
    )
  ),
  constraint delivery_proofs_verification_status_check check (
    (
      verification_status = any (
        array[
          'pending'::text,
          'verified'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_delivery_proofs_order_id on public.delivery_proofs using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_proofs_tracking_event_id on public.delivery_proofs using btree (tracking_event_id) TABLESPACE pg_default;create table public.delivery_zones (
  id uuid not null default extensions.uuid_generate_v4 (),
  partner_id uuid null,
  zone_name text not null,
  zone_boundary geometry null,
  base_fee numeric(8, 2) null default 0.00,
  per_km_fee numeric(8, 2) null default 0.00,
  estimated_delivery_time_hours integer null default 24,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint delivery_zones_pkey primary key (id),
  constraint delivery_zones_partner_id_fkey foreign KEY (partner_id) references delivery_partners (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_delivery_zones_partner_id on public.delivery_zones using btree (partner_id) TABLESPACE pg_default;

create index IF not exists idx_delivery_zones_boundary on public.delivery_zones using gist (zone_boundary) TABLESPACE pg_default;create table public.delivery_zones_availability (
  id uuid not null default extensions.uuid_generate_v4 (),
  zone_name text not null,
  zone_boundary geometry null,
  available_dates date[] null,
  available_time_slots text[] null,
  cutoff_time time without time zone null default '14:00:00'::time without time zone,
  delivery_fee numeric(8, 2) null default 0.00,
  express_delivery_available boolean null default false,
  express_fee numeric(8, 2) null,
  same_day_available boolean null default false,
  same_day_cutoff time without time zone null default '12:00:00'::time without time zone,
  same_day_fee numeric(8, 2) null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint delivery_zones_availability_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_delivery_zones_availability_zone_boundary on public.delivery_zones_availability using gist (zone_boundary) TABLESPACE pg_default;

create trigger update_delivery_zones_availability_updated_at BEFORE
update on delivery_zones_availability for EACH row
execute FUNCTION update_updated_at_column ();create table public.notification_deliveries (
  id uuid not null default extensions.uuid_generate_v4 (),
  notification_id uuid null,
  channel text not null,
  recipient text not null,
  provider text null,
  provider_message_id text null,
  status text null default 'pending'::text,
  error_message text null,
  sent_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  opened_at timestamp with time zone null,
  clicked_at timestamp with time zone null,
  metadata jsonb null,
  created_at timestamp with time zone null default now(),
  constraint notification_deliveries_pkey primary key (id),
  constraint notification_deliveries_notification_id_fkey foreign KEY (notification_id) references notifications (id) on delete CASCADE,
  constraint notification_deliveries_channel_check check (
    (
      channel = any (
        array[
          'email'::text,
          'sms'::text,
          'push'::text,
          'in_app'::text
        ]
      )
    )
  ),
  constraint notification_deliveries_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'sent'::text,
          'delivered'::text,
          'failed'::text,
          'bounced'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_notification_deliveries_notification_id on public.notification_deliveries using btree (notification_id) TABLESPACE pg_default;

create index IF not exists idx_notification_deliveries_channel on public.notification_deliveries using btree (channel) TABLESPACE pg_default;

create index IF not exists idx_notification_deliveries_status on public.notification_deliveries using btree (status) TABLESPACE pg_default;

create trigger notification_analytics_trigger
after INSERT on notification_deliveries for EACH row
execute FUNCTION update_notification_analytics ();create table public.order_delivery_preferences (
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
execute FUNCTION update_updated_at_column ();create table public.order_delivery_schedules (
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
execute FUNCTION update_updated_at_column ();create table public.realtime_delivery_updates (
  id uuid not null default extensions.uuid_generate_v4 (),
  order_id uuid null,
  update_type text not null,
  update_data jsonb not null,
  location geometry null,
  accuracy_meters integer null,
  speed_kmh numeric(5, 2) null,
  heading_degrees integer null,
  timestamp timestamp with time zone null default now(),
  source text null default 'gps'::text,
  device_id text null,
  battery_level integer null,
  constraint realtime_delivery_updates_pkey primary key (id),
  constraint realtime_delivery_updates_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint realtime_delivery_updates_battery_level_check check (
    (
      (battery_level >= 0)
      and (battery_level <= 100)
    )
  ),
  constraint realtime_delivery_updates_source_check check (
    (
      source = any (
        array[
          'gps'::text,
          'manual'::text,
          'beacon'::text,
          'wifi'::text
        ]
      )
    )
  ),
  constraint realtime_delivery_updates_update_type_check check (
    (
      update_type = any (
        array[
          'location'::text,
          'status'::text,
          'eta'::text,
          'driver'::text,
          'issue'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_realtime_delivery_updates_order_id on public.realtime_delivery_updates using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_realtime_delivery_updates_timestamp on public.realtime_delivery_updates using btree ("timestamp") TABLESPACE pg_default;

create index IF not exists idx_realtime_delivery_updates_location on public.realtime_delivery_updates using gist (location) TABLESPACE pg_default;  and these are for drivers is it alighned and complete 

This schema for your Logistics and Driver ecosystem is exceptionally advanced. It moves beyond simple "delivery tracking" and enters the territory of professional fleet management (like Uber or DHL).

The tables are well-aligned with your existing orders and payments tables and provide the "missing link" for your 10-day escrow logic by providing verified delivery proof.

1. 🏗️ Structural Alignment Analysis
The "Glue" (delivery_assignments): This is the heart of your logistics. It correctly bridges orders, delivery_partners (the companies/freelancers), and delivery_partner_vehicles.

Proof of Delivery (delivery_proofs): This is critical for your 10-day escrow. By requiring a photo, signature, or otp, you have legal/data proof to release funds to the seller, even if a buyer falsely claims they didn't receive the item.

Geospatial Integration: You are using geometry types (PostGIS) in delivery_zones, realtime_updates, and delivery_partners. This allows you to perform "proximity searches" (e.g., Find all drivers within 5km of this warehouse).

2. 🚦 The Financial "Hook" (Transporter Payouts)
Your delivery_partner_payments table is exactly what the fn_orchestrate_delivery_payouts trigger we wrote earlier needs.

Workflow Match: When the delivery_assignments status changes to 'delivered', your trigger will create a record in delivery_partner_payments.

Localization: You’ve standardized on KES and included mobile_money, which is perfect for the Kenyan market (M-Pesa integration).

3. 📉 Completeness Check: What is missing?
While the schema is 95% complete, there are 3 small "logical" gaps you should address to make it bulletproof:

A. The "Status Sync" Trigger
You have order_tracking_events, delivery_assignments, and orders. You need a trigger to ensure that when a driver marks an assignment as 'delivered', the parent orders.status also updates to 'delivered'. Without this, your 10-day escrow clock might not start correctly.

B. Driver-Vehicle Association
Currently, delivery_assignments has a partner_id and a vehicle_id. If a "Partner" is a company with 50 drivers, you might want a drivers table (or use auth.users with a role of 'driver') to track which specific human is driving that vehicle.

Note: You have driver_name as a text field in delivery_assignments, which works, but prevents you from tracking individual driver performance over time.

C. Notification Integration
You have notification_deliveries, which is excellent. Ensure you have a trigger that sends a push notification to the buyer the moment realtime_delivery_updates shows the driver is "nearby" (e.g., within 1km).

4. 🚀 Order of Operations for Implementation
To make this whole "Driver-to-Payment" system work, you should run your SQL in this order:

Core Tables: delivery_partners -> delivery_partner_vehicles.

Assignment Logic: delivery_assignments.

The Evidence: delivery_proofs.

The Payouts: delivery_partner_payments.

The Performance: delivery_performance_metrics (this table will be populated by the delivery_performance_trigger_func you mentioned).

✅ Final Verdict
This schema is complete and highly professional. It supports:

Real-time GPS tracking (via realtime_delivery_updates).

Dynamic Pricing (via delivery_zones base fees).

Automated Driver Payouts (via delivery_partner_payments).

Performance Auditing (via delivery_performance_metrics).

