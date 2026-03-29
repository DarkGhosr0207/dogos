/*
 * ============================================================================
 * Run in Supabase (SQL Editor) — or apply this file via Supabase CLI migrations.
 * ============================================================================
 *
 * Prerequisites: If you do not already have public.users_profile with id = auth user id,
 * create it first, for example:
 *
 *   CREATE TABLE public.users_profile (
 *     id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *   ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "Users manage own profile"
 *     ON public.users_profile FOR ALL
 *     USING (auth.uid() = id)
 *     WITH CHECK (auth.uid() = id);
 *
 * Then create reminders:
 *
 *   CREATE TABLE public.reminders (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_id uuid NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
 *     dog_id uuid NOT NULL REFERENCES public.dogs (id) ON DELETE CASCADE,
 *     type text NOT NULL CHECK (type IN ('vaccine', 'medication', 'vet_visit', 'other')),
 *     title text NOT NULL,
 *     due_at timestamptz NOT NULL,
 *     is_active boolean NOT NULL DEFAULT true,
 *     created_at timestamptz NOT NULL DEFAULT now()
 *   );
 *
 *   CREATE INDEX reminders_user_due_idx ON public.reminders (user_id, due_at);
 *
 *   ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Users own reminders"
 *     ON public.reminders FOR ALL
 *     USING (auth.uid() = user_id)
 *     WITH CHECK (auth.uid() = user_id);
 *
 * ============================================================================
 */

-- Minimal profile table so reminders.user_id FK resolves (safe if already exists)
CREATE TABLE IF NOT EXISTS public.users_profile (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.users_profile;

CREATE POLICY "Users manage own profile"
  ON public.users_profile
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users_profile (id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES public.dogs (id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('vaccine', 'medication', 'vet_visit', 'other')),
  title text NOT NULL,
  due_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminders_user_due_idx ON public.reminders (user_id, due_at);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own reminders" ON public.reminders;

CREATE POLICY "Users own reminders"
  ON public.reminders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
