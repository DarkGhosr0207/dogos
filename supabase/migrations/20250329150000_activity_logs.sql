create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  activity_type text not null,
  duration_minutes integer not null,
  distance_km numeric(5,2),
  intensity text default 'moderate',
  notes text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table activity_logs enable row level security;
create policy "Users can manage own activity logs"
  on activity_logs for all using (auth.uid() = user_id);
