create table public.currency_rates (
  id serial not null,
  from_currency character varying(3) not null,
  to_currency character varying(3) not null,
  rate numeric(15, 8) not null,
  last_updated timestamp with time zone null default now(),
  expires_at timestamp with time zone not null,
  constraint currency_rates_pkey primary key (id),
  constraint currency_rates_from_currency_to_currency_key unique (from_currency, to_currency)
) TABLESPACE pg_default;

create index IF not exists idx_currency_rates_lookup on public.currency_rates using btree (from_currency, to_currency) TABLESPACE pg_default;

create index IF not exists idx_currency_rates_expiry on public.currency_rates using btree (expires_at) TABLESPACE pg_default;

create index IF not exists currency_rates_last_updated_idx on public.currency_rates using btree (last_updated) TABLESPACE pg_default;

create index IF not exists currency_rates_rate_idx on public.currency_rates using btree (rate) TABLESPACE pg_default;

create index IF not exists currency_rates_to_currency_idx on public.currency_rates using btree (to_currency) TABLESPACE pg_default;

create index IF not exists currency_rates_from_currency_idx on public.currency_rates using btree (from_currency) TABLESPACE pg_default;
