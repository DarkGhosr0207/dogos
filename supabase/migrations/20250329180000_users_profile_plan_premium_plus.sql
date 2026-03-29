-- Plan column + allow premium_plus (safe if plan already exists from manual SQL)
ALTER TABLE public.users_profile
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE public.users_profile DROP CONSTRAINT IF EXISTS users_profile_plan_check;

ALTER TABLE public.users_profile ADD CONSTRAINT users_profile_plan_check
  CHECK (plan IN ('free', 'premium', 'premium_plus'));
