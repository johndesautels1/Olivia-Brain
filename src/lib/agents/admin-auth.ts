/**
 * Admin auth — pre-Clerk stub.
 *
 * LTM uses this to grant admins (`brokercolorado@gmail.com`,
 * `brokerpinellas@gmail.com`, etc.) automatic ownership-bypass on
 * tier-gated routes. Olivia Brain has no Clerk wiring yet (Track F
 * Session 18), so admin-bypass cannot resolve a real identity.
 *
 * Returns `false` until Clerk lands. When it does, the body becomes a
 * lookup against the same `ADMIN_USER_ID` env list LTM uses.
 */
export async function isUserAdmin(_userId: string): Promise<boolean> {
  return false;
}
