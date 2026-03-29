create table health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  log_date date not null default current_date,
  mood text,
  appetite text,
  energy text,
  stool text,
  notes text,
  created_at timestamptz default now(),
  unique(dog_id, log_date)
);
alter table health_logs enable row level security;
create policy "Users can manage own health logs"
  on health_logs for all using (auth.uid() = user_id);
