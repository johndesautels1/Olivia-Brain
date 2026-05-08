import { InvestorsAdmin } from '@/components/admin/InvestorsAdmin';

/**
 * `/admin/investors` — Track P Session P4.
 *
 * Curate the `investor_reputations` table that backs deal-protection
 * smart-score tilts. See `src/components/admin/InvestorsAdmin.tsx`
 * for the full surface (active list, archived list, moderation queue,
 * inline create + edit, soft-delete, seed re-apply).
 */
export default function InvestorsAdminPage() {
  return <InvestorsAdmin />;
}
