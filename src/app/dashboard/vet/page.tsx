/*
SQL to run in Supabase (creates `public.vets` + RLS public read, and inserts sample data):

-- Enable required extension (usually already enabled in Supabase projects)
create extension if not exists pgcrypto;

create table if not exists public.vets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  clinic_name text,
  country text default 'DE',
  city text,
  address text,
  phone text,
  website text,
  languages text[] default '{}',
  specializations text[] default '{}',
  is_emergency_24h boolean default false,
  is_verified boolean default false,
  rating numeric(3,2),
  created_at timestamptz default now()
);

alter table public.vets enable row level security;

drop policy if exists "Everyone can read vets" on public.vets;
create policy "Everyone can read vets"
  on public.vets
  for select
  to anon, authenticated
  using (true);

insert into public.vets
  (name, clinic_name, country, city, address, phone, website, languages, specializations, is_emergency_24h, is_verified, rating)
values
  ('Dr. Anna Müller', 'Tierarztpraxis Prenzlauer Berg', 'DE', 'Berlin', 'Kollwitzstraße 12, 10405 Berlin', '+49 30 1234567', 'https://example.com/berlin-prenzlauer', array['German','English'], array['General practice','Vaccinations'], false, true, 4.70),
  ('Dr. Jonas Becker', 'CityVet Mitte', 'DE', 'Berlin', 'Friedrichstraße 88, 10117 Berlin', '+49 30 7654321', 'https://example.com/cityvet-mitte', array['German','English'], array['Surgery','Diagnostics'], true, true, 4.85),
  ('Dr. Lea Schneider', 'Spree Animal Clinic', 'DE', 'Berlin', 'Warschauer Str. 33, 10243 Berlin', '+49 30 2468101', 'https://example.com/spree-clinic', array['German'], array['Dermatology','Dentistry'], false, false, 4.40),
  ('Dra. Marta García', 'Clínica Veterinaria Eixample', 'ES', 'Barcelona', 'Carrer de València 210, 08011 Barcelona', '+34 93 123 4567', 'https://example.com/eixample-vet', array['Spanish','Catalan','English'], array['General practice','Travel certificates'], false, true, 4.65),
  ('Dr. Pablo Ruiz', 'Barcelona 24h Emergency Vet', 'ES', 'Barcelona', 'Av. Diagonal 550, 08021 Barcelona', '+34 93 765 4321', 'https://example.com/barcelona-24h', array['Spanish','English'], array['Emergency','Imaging'], true, true, 4.90);
*/

import { createClient } from '@/lib/supabase/server'
import VetList, { type VetRow } from './VetList'

function isMissingVetsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: unknown; message?: unknown }
  return (
    e.code === '42P01' ||
    (typeof e.message === 'string' &&
      e.message.toLowerCase().includes('relation') &&
      e.message.toLowerCase().includes('vets'))
  )
}

export default async function FindVetPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vets')
    .select(
      'id, name, clinic_name, country, city, address, phone, website, languages, specializations, is_emergency_24h, is_verified, rating'
    )
    .order('is_emergency_24h', { ascending: false })
    .order('is_verified', { ascending: false })
    .order('rating', { ascending: false })
    .order('city', { ascending: true })
    .limit(200)

  const tableMissing = isMissingVetsTable(error)
  const vets: VetRow[] = tableMissing || error ? [] : ((data ?? []) as VetRow[])

  if (tableMissing) {
    return (
      <div style={{ color: '#111827' }}>
        <h1 style={{ color: '#111827', fontSize: '24px', fontWeight: 700 }}>
          Find Vet
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          Vet directory coming soon
        </p>
        <div
          className="mt-8 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm shadow-sm"
          style={{ color: '#6b7280' }}
        >
          Vet directory coming soon.
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ color: '#111827' }}>
        <h1 style={{ color: '#111827', fontSize: '24px', fontWeight: 700 }}>
          Find Vet
        </h1>
        <p className="mt-1 text-sm" style={{ color: '#6b7280' }}>
          We couldn&apos;t load the directory right now.
        </p>
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm" style={{ color: '#dc2626' }}>
            {error.message}
          </p>
        </div>
      </div>
    )
  }

  return <VetList vets={vets} />
}
