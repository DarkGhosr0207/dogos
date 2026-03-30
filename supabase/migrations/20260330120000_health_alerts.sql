create table if not exists public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  dog_name text not null,
  type text not null,
  severity text not null check (severity in ('low', 'medium', 'high')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists health_alerts_user_created_idx
  on public.health_alerts (user_id, created_at desc);
create index if not exists health_alerts_user_is_read_idx
  on public.health_alerts (user_id, is_read);

alter table public.health_alerts enable row level security;

drop policy if exists "Users can view own health_alerts" on public.health_alerts;
create policy "Users can view own health_alerts"
  on public.health_alerts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own health_alerts" on public.health_alerts;
create policy "Users can update own health_alerts"
  on public.health_alerts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

