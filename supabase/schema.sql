create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'lecture'
    check (role in ('administrateur', 'planificateur', 'lecture')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text,
  department text not null default 'Expédition',
  hire_date date,
  status text not null default 'Permanent',
  shift text not null default 'Jour',
  weekly_hours numeric(5,2) not null default 40,
  weekly_days integer not null default 5,
  vacation_group text,
  works_weekends boolean not null default false,
  active boolean not null default true,
  comments text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.employees enable row level security;

create policy "profiles_read_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "employees_read_authenticated"
  on public.employees
  for select
  to authenticated
  using (true);

create policy "employees_insert_admin_planner"
  on public.employees
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  );

create policy "employees_update_admin_planner"
  on public.employees
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  );

alter publication supabase_realtime add table public.employees;


create table if not exists public.employee_bank_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  bank_type text not null check (bank_type in ('VACANCES', 'TEMPS_BANQUE', 'HEURES_ACCUMULEES', 'MALADIE')),
  granted_hours numeric(8,2) not null default 0,
  used_hours numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, bank_type)
);

create table if not exists public.employee_bank_movements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  bank_type text not null check (bank_type in ('VACANCES', 'TEMPS_BANQUE', 'HEURES_ACCUMULEES', 'MALADIE')),
  movement_date date not null,
  hours numeric(8,2) not null,
  comment text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.employee_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  hours numeric(6,2),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, work_date)
);

alter table public.employee_bank_balances enable row level security;
alter table public.employee_bank_movements enable row level security;
alter table public.employee_schedule_entries enable row level security;

create policy "bank_balances_read_authenticated"
  on public.employee_bank_balances for select to authenticated using (true);

create policy "bank_movements_read_authenticated"
  on public.employee_bank_movements for select to authenticated using (true);

create policy "schedule_entries_read_authenticated"
  on public.employee_schedule_entries for select to authenticated using (true);


create table if not exists public.employee_absence_periods (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  absence_type text not null check (absence_type in ('VACANCES', 'MALADIE', 'FORMATION', 'CONGE')),
  start_date date not null,
  end_date date not null,
  hours_per_day numeric(6,2) not null default 8,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.employee_absence_periods enable row level security;

create policy "absence_periods_read_authenticated"
  on public.employee_absence_periods
  for select
  to authenticated
  using (true);

create policy "absence_periods_write_admin_planner"
  on public.employee_absence_periods
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  );

alter publication supabase_realtime add table public.employee_absence_periods;


create table if not exists public.employee_absence_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  absence_date date not null,
  hours numeric(6,2) not null check (hours > 0),
  bank_type text not null check (
    bank_type in ('VACANCES', 'TEMPS_BANQUE', 'HEURES_ACCUMULEES', 'MALADIE')
  ),
  comment text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, absence_date)
);

alter table public.employee_absence_entries enable row level security;

create policy "absence_entries_read_authenticated"
  on public.employee_absence_entries
  for select
  to authenticated
  using (true);

create policy "absence_entries_write_admin_planner"
  on public.employee_absence_entries
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  );

alter publication supabase_realtime add table public.employee_absence_entries;


create policy "bank_balances_write_admin_planner"
  on public.employee_bank_balances
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('administrateur', 'planificateur')
    )
  );


create table if not exists public.thawing_products (
  id uuid primary key default gen_random_uuid(),
  product_code text,
  product_name text not null,
  reference_package_weight_lb numeric(8,3) not null default 2.5,
  current_package_weight_lb numeric(8,3) not null default 2.5,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thawing_weeks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.thawing_products(id) on delete cascade,
  week_start date not null,
  thursday_adjustment numeric(12,2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, week_start)
);

create table if not exists public.thawing_daily_needs (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.thawing_weeks(id) on delete cascade,
  need_date date not null,
  costco_reference_packages numeric(12,2) not null default 0,
  food_service_reference_packages numeric(12,2) not null default 0,
  adjustment_reference_packages numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(week_id, need_date)
);

alter table public.thawing_products enable row level security;
alter table public.thawing_weeks enable row level security;
alter table public.thawing_daily_needs enable row level security;
