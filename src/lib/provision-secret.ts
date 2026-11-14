import { timingSafeEqual } from "crypto";

/**
 * Is this request the PF9 store, presenting the shared provision secret?
 *
 * Used by POST /api/auth/register (provisioning) and POST /api/auth/plan
 * (subscription changed). Moved here unchanged from the register route on
 * 2026-11-14 so both routes share ONE comparison.
 *
 * Fails closed: no PROVISION_SECRET configured means no request matches.
 */
export function isStoreProvisioning(req: Request): boolean {
  const secret = process.env.PROVISION_SECRET;
  if (!secret) return false;
  const presented = req.headers.get("x-pf9-provision-secret");
  if (!presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
