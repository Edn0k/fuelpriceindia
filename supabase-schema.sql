-- States table
create table if not exists public.states (
  id serial primary key,
  code text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Cities table
create table if not exists public.cities (
  id serial primary key,
  state_code text not null references public.states(code) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (state_code, name)
);

-- Fuel prices table
create table if not exists public.fuel_prices (
  id serial primary key,
  state_code text not null,
  city_name text not null,
  date date not null,
  petrol_price numeric,
  diesel_price numeric,
  lpg_price numeric,
  cng_price numeric,
  created_at timestamptz not null default now()
);

create unique index if not exists fuel_prices_state_city_date_idx
  on public.fuel_prices (state_code, city_name, date);
