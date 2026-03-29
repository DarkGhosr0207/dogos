create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  dog_id uuid references dogs(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  logged_at date not null default current_date,
  notes text,
  created_at timestamptz default now()
);
alter table weight_logs enable row level security;
create policy "Users can manage own weight logs"
  on weight_logs for all using (auth.uid() = user_id);
