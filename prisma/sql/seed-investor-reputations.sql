-- Track P Session P4 — Investor Reputation seed (anonymized archetypes)
--
-- Mirrors `INVESTOR_SEED_DATA` in `src/lib/deal-protection/investor-seed.ts`.
-- 15 fully-anonymized archetype entries spanning all 5 smart bands
-- (3 per band). Names follow `<Posture> <Stage> Archetype` so admins
-- can quickly distinguish seed templates from curated entries.
--
-- # Idempotent
--
-- ON CONFLICT (name) DO UPDATE refreshes the canonical archetype
-- fields (`investorType`, `geographicFocus`, stage/sector/patterns,
-- `reputationScore`, `reputationBand`) but PRESERVES operator edits
-- to `notes`, `isActive`, and `isArchived`. Re-running this script
-- after admin curation is safe.
--
-- # Apply
--
-- Run AFTER `06-add-deal-protection-foundation.sql`. Paste into
-- Supabase SQL Editor → Run.

INSERT INTO "investor_reputations" (
  name, slug, "investorType", "geographicFocus",
  "stageFocusJson", "sectorFocusJson",
  "reputationScore", "reputationBand", "patternsJson",
  notes, source, "isActive", "isArchived", "updatedAt"
) VALUES
  -- ── Green band (80-100) ───────────────────────────────────────────
  ('Founder-Friendly Seed Fund (Archetype)', 'founder-friendly-seed-fund-archetype', 'vc', 'UK + EU',
    '["seed","series_a"]'::jsonb, '["general"]'::jsonb,
    92, 'green', '["standard_1x_liq_pref","broad_based_anti_dilution","minimal_veto"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Long-Horizon Family Office (Archetype)', 'long-horizon-family-office-archetype', 'family_office', 'Global',
    '["series_a","series_b"]'::jsonb, '["general"]'::jsonb,
    88, 'green', '["standard_terms","patient_capital"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Active-Founder Angel Syndicate (Archetype)', 'active-founder-angel-syndicate-archetype', 'angel', 'London',
    '["pre_seed","seed"]'::jsonb, '["general"]'::jsonb,
    84, 'green', '["founder_friendly_safes","no_pro_rata_demands"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),

  -- ── Blue band (60-79) ─────────────────────────────────────────────
  ('Tier-1 Series A Lead (Archetype)', 'tier-1-series-a-lead-archetype', 'vc', 'UK + EU + US',
    '["series_a","series_b"]'::jsonb, '["general"]'::jsonb,
    72, 'blue', '["standard_1x_liq_pref","pro_rata_rights","one_board_seat"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Generalist Series B Co-Lead (Archetype)', 'generalist-series-b-co-lead-archetype', 'vc', 'UK + EU',
    '["series_b","series_c"]'::jsonb, '["general"]'::jsonb,
    68, 'blue', '["standard_terms","follow_on_friendly"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Strategic Corporate VC — Hands-Off (Archetype)', 'strategic-corporate-vc-hands-off-archetype', 'strategic', 'Global',
    '["series_a","series_b","series_c"]'::jsonb, '["general"]'::jsonb,
    62, 'blue', '["observer_seat","limited_veto"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),

  -- ── Yellow band (40-59) ───────────────────────────────────────────
  ('Mid-Market Series B Lead (Archetype)', 'mid-market-series-b-lead-archetype', 'vc', 'UK + EU',
    '["series_b"]'::jsonb, '["general"]'::jsonb,
    52, 'yellow', '["1x_participating_liq_pref","broader_veto","two_board_seats"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Strategic Corporate VC — Hands-On (Archetype)', 'strategic-corporate-vc-hands-on-archetype', 'strategic', 'Global',
    '["series_b","series_c"]'::jsonb, '["general"]'::jsonb,
    48, 'yellow', '["ip_first_refusal","commercial_tie_in"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Late-Stage Crossover Investor (Archetype)', 'late-stage-crossover-investor-archetype', 'vc', 'Global',
    '["series_c","growth"]'::jsonb, '["general"]'::jsonb,
    44, 'yellow', '["ratchet_protection","mfn_clause"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),

  -- ── Orange band (20-39) ───────────────────────────────────────────
  ('Aggressive Growth Equity (Archetype)', 'aggressive-growth-equity-archetype', 'private_equity', 'Global',
    '["growth"]'::jsonb, '["general"]'::jsonb,
    32, 'orange', '["2x_liq_pref","aggressive_anti_dilution","multiple_veto_rights"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Tranched Series A Lead (Archetype)', 'tranched-series-a-lead-archetype', 'vc', 'UK + EU',
    '["series_a"]'::jsonb, '["general"]'::jsonb,
    28, 'orange', '["multi_tranche_milestone_gated","founder_share_repurchase"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Aggressive Buyout — Mid-Market (Archetype)', 'aggressive-buyout-mid-market-archetype', 'private_equity', 'UK',
    '["strategic"]'::jsonb, '["general"]'::jsonb,
    24, 'orange', '["large_earnout","long_non_compete","aggressive_indemnity"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),

  -- ── Red band (0-19) ───────────────────────────────────────────────
  ('Predatory Buyout — High-Leverage (Archetype)', 'predatory-buyout-high-leverage-archetype', 'private_equity', 'Global',
    '["strategic"]'::jsonb, '["general"]'::jsonb,
    14, 'red', '["full_ratchet","punitive_bad_leaver","personal_indemnity"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Distressed-Debt Acquirer (Archetype)', 'distressed-debt-acquirer-archetype', 'private_equity', 'Global',
    '["strategic"]'::jsonb, '["general"]'::jsonb,
    8, 'red', '["full_ratchet","investor_put_at_cost","global_non_compete"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW()),
  ('Predatory Strategic Acquirer (Archetype)', 'predatory-strategic-acquirer-archetype', 'strategic', 'Global',
    '["strategic"]'::jsonb, '["general"]'::jsonb,
    4, 'red', '["par_value_repurchase","broad_ip_assignment","24m_global_non_compete"]'::jsonb,
    'Anonymized archetype seeded by P4 — replace with a verified real-world entry before going to production.',
    'seed', true, false, NOW())

ON CONFLICT (name) DO UPDATE SET
  "investorType"    = EXCLUDED."investorType",
  "geographicFocus" = EXCLUDED."geographicFocus",
  "stageFocusJson"  = EXCLUDED."stageFocusJson",
  "sectorFocusJson" = EXCLUDED."sectorFocusJson",
  "reputationScore" = EXCLUDED."reputationScore",
  "reputationBand"  = EXCLUDED."reputationBand",
  "patternsJson"    = EXCLUDED."patternsJson",
  "updatedAt"       = NOW();

-- Verify: should return 15.
-- SELECT COUNT(*) FROM "investor_reputations" WHERE source = 'seed';
