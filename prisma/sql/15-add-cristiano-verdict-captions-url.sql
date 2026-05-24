-- ============================================================================
-- 15-add-cristiano-verdict-captions-url.sql
-- Cristiano verdict captions track URL — Olivia Brain
-- ============================================================================
--
-- Adds the captionsUrl column to cristiano_verdicts. WebVTT track URL
-- the verdict-player renders as <track kind="captions"> for WCAG 1.2.2
-- Level A compliance during pre-rendered video playback.
--
-- Independent of the spokenScript transcript field (which already covers
-- WCAG 1.2.3 Level A — media alternative for prerecorded). Captions DURING
-- playback are a SEPARATE Level A requirement.
--
-- Source apps that ship captions populate this on gateway-push. Until
-- they do, the column is null and the player gracefully omits the track
-- element.
--
-- Per audit `docs/06_ACCESSIBILITY_AUDIT_CRISTIANO_2026-05-25.md` § H2.
--
-- Operator action: apply via Supabase SQL editor on
-- db.lumfvloapckluhzvtgdn.supabase.co (Olivia Brain production). The
-- migration is idempotent — re-running is safe (IF NOT EXISTS guard).
--
-- Held to Apple / Microsoft / Google 2026 leading coding practices per
-- ~/CLAUDE.md and docs/api-specs/_MASTER_REGISTER.md section 10.4.
-- ============================================================================

ALTER TABLE "cristiano_verdicts"
    ADD COLUMN IF NOT EXISTS "captionsUrl" TEXT;
