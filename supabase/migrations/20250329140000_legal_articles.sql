/*
 * ============================================================================
 * Run in Supabase SQL Editor (or apply via Supabase CLI migrations).
 * ============================================================================
 *
 * CREATE TABLE public.legal_articles (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   country text NOT NULL CHECK (country IN ('DE', 'ES', 'UK', 'EU')),
 *   category text NOT NULL CHECK (category IN ('travel', 'rental', 'liability', 'breed_laws', 'tax')),
 *   title text NOT NULL,
 *   content text NOT NULL,
 *   law_reference text,
 *   is_published boolean NOT NULL DEFAULT true,
 *   created_at timestamptz NOT NULL DEFAULT now()
 * );
 *
 * ALTER TABLE public.legal_articles ENABLE ROW LEVEL SECURITY;
 *
 * -- Anyone (including anonymous) may read published articles
 * CREATE POLICY "Anyone can read published legal articles"
 *   ON public.legal_articles FOR SELECT
 *   USING (is_published = true);
 *
 * -- No INSERT/UPDATE/DELETE policies for authenticated users:
 * -- only service role / dashboard SQL can manage rows.
 *
 * ============================================================================
 */

CREATE TABLE IF NOT EXISTS public.legal_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL CHECK (country IN ('DE', 'ES', 'UK', 'EU')),
  category text NOT NULL CHECK (category IN ('travel', 'rental', 'liability', 'breed_laws', 'tax')),
  title text NOT NULL,
  content text NOT NULL,
  law_reference text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_articles_country_category_idx
  ON public.legal_articles (country, category);

ALTER TABLE public.legal_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published legal articles" ON public.legal_articles;

CREATE POLICY "Anyone can read published legal articles"
  ON public.legal_articles
  FOR SELECT
  USING (is_published = true);

INSERT INTO public.legal_articles (country, category, title, content, law_reference, is_published)
VALUES
(
  'DE',
  'breed_laws',
  'Dangerous dog breeds in Germany by federal state',
  $$Germany does not use a single national list of "dangerous" breeds. Instead, the federal Dangerous Dogs Act (Gefahr im Verkehr mit gefährlichen Hunden) sets a framework, and each Bundesland (state) adds its own lists, registration rules, muzzle/lead requirements, and sometimes breed bans. Dogs classified as dangerous typically require liability insurance, microchipping, temperament tests, and proof of handling competence (Hundeführerschein) where mandated.

Common triggers for stricter treatment include breeds historically associated with fighting, large or strong breeds, and individual dogs that have bitten. Some states list specific breeds (often including Pit Bull–type dogs, American Staffordshire Terriers, and others), while others focus on behavior and bite history. Crossing state lines with a dog can change which rules apply overnight, so owners should check the current Landesverordnung before travel.

Practical steps: register your dog locally, keep muzzle and short-lead rules where required, carry insurance documents, and retain veterinary and training records. If your dog is listed or challenged as dangerous, administrative proceedings can move quickly; document everything and seek specialized legal advice early.

This summary is for orientation only. Always verify the current text of your state ordinance (Landesverordnung) and federal provisions with a qualified lawyer.$$,
  'HundG; respective Landesverordnungen (e.g. Berlin, NRW, Bavaria) — verify current version',
  true
),
(
  'DE',
  'tax',
  'Hundesteuer — dog tax registration in Germany',
  $$The Hundesteuer is a local municipal tax (Gemeinde or Stadt) charged per dog, not a federal income tax. Rates vary widely by municipality and sometimes by number of dogs, breed lists, or dangerous-dog status. Registration is usually mandatory shortly after you move or acquire a dog; late registration can trigger back taxes and penalties.

You typically register at the local Bürgeramt or online via the municipality’s portal. You will need proof of identity, address, and often a microchip number or EU pet passport. Many cities issue a yearly tax tag (Hundemarke) that must be renewed when the rate changes or the dog’s status changes.

Shelter adoptions, service dogs, and certain hardship cases may qualify for reductions or exemptions depending on local Satzung (statutes). Keeping payments current matters because enforcement is common and inexpensive for cities to administer.

This is general information. For your exact rate, deadlines, and exemptions, check your municipality’s Hundesteuer-Satzung or speak with a tax advisor or attorney familiar with local dog tax rules.$$,
  'Kommunale Hundesteuer-Satzungen (municipal statutes)',
  true
),
(
  'ES',
  'breed_laws',
  'Ley de Bienestar Animal 2023 — key obligations for dog owners in Spain',
  $$Spain’s animal welfare framework was updated significantly in 2023 (Ley 7/2023, de 28 de marzo, de protección de los derechos y el bienestar de los animales). It reinforces responsible ownership: identification, registration in regional registries where required, socialization and training obligations, and stricter consequences for abandonment and mistreatment. Certain breeds or strong dogs may face additional regional rules (autonomous communities can add conditions).

Owners must prevent uncontrolled breeding, ensure veterinary care, and avoid leaving dogs tethered without meeting legal minimums for space and shelter. Public spaces often require leashes; muzzles may be required for listed breeds or case-by-case after incidents. Travel between autonomous communities can mean different registry and insurance expectations.

Insurance (civil liability) is increasingly emphasized; some regions already require it for dogs above a certain weight or for listed breeds. Microchipping and up-to-date rabies vaccination remain central for both legal compliance and travel within the EU.

This outline is not exhaustive. Consult colegios de abogados or a Spanish lawyer for obligations in your comunidad autónoma and city.$$,
  'Ley 7/2023; regional implementing rules — verify locally',
  true
),
(
  'DE',
  'rental',
  'Renting with a dog in Germany — landlord rights and tenant protection',
  $$German tenancy law balances contract freedom with tenant protection (Mietrecht). A general “no pets” clause in a form lease may be invalid or narrowly interpreted; small pets are often harder for landlords to prohibit than large dogs. However, dangerous-dog classifications, noise, allergies of neighbors, and building rules (Hausordnung) can justify restrictions if they are reasonable and lawful.

If you keep a dog without required permission when the lease demands consent, you risk warnings and ultimately termination (Kündigung) in serious cases. Document permission in writing (email or addendum). Liability insurance covering pet damage is widely expected and sometimes mandatory under lease terms.

Subletting, short-term rentals, and deposits are separate issues: always disclose dogs to avoid breach of contract. When moving, schedule handover protocols (Übergabeprotokoll) to reduce disputes over scratches or odors.

Tenancy law is fact-specific. For notice letters, termination threats, or discrimination claims, consult a Mieterverein or a Fachanwalt für Mietrecht.$$,
  'BGB (Mietrecht); local court practice — case-specific',
  true
);
