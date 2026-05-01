/**
 * Database Module Exports
 *
 * Re-exports Prisma client and provides utility functions.
 */

import prisma from "./client";

export { prisma };
export default prisma;

/**
 * Get the Prisma client instance.
 * Used by multi-tenant and compliance modules.
 */
export function getPrisma() {
  return prisma;
}
