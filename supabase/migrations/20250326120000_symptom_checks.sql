-- Symptom check history (AI triage assistance; not clinical records)
create table if not exists public.symptom_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  dog_id uuid not null references public.dogs (id) on delete cascade,
  symptoms text not null,
  duration text not null,
  severity text not null,
  triage_level text not null
    check (triage_level in ('emergency', 'vet_asap', 'monitor', 'ok')),
  title text not null,
  explanation text not null,
  actions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists symptom_checks_owner_id_idx on public.symptom_checks (owner_id);
create index if not exists symptom_checks_dog_id_idx on public.symptom_checks (dog_id);
create index if not exists symptom_checks_created_at_idx on public.symptom_checks (created_at desc);

alter table public.symptom_checks enable row level security;

create policy "Users can select own symptom_checks"
  on public.symptom_checks
  for select
  using (auth.uid() = owner_id);

create policy "Users can insert own symptom_checks"
  on public.symptom_checks
  for insert
  with check (auth.uid() = owner_id);
