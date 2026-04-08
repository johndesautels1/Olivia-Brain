import { getServerEnv } from "@/lib/config/env";

export type AdminAccessMode = "secured" | "dev-open";

function getAdminActor(request: Request, mode: AdminAccessMode) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp =
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("cf-connecting-ip")?.trim();
  const actorId = forwardedFor || realIp;

  if (actorId) {
    return `${mode}:${actorId}`;
  }

  return mode === "secured" ? "secured:shared-key" : "dev-open:local";
}

export function requireAdminAccess(request: Request) {
  const env = getServerEnv();
  const providedKey = request.headers.get("x-admin-key");

  if (!env.ADMIN_API_KEY) {
    if (env.NODE_ENV === "production") {
      return {
        ok: false as const,
        status: 503,
        error:
          "ADMIN_API_KEY is not configured. Admin integration routes are disabled in production until it is set.",
      };
    }

    return {
      ok: true as const,
      mode: "dev-open" as const,
      actor: getAdminActor(request, "dev-open"),
    };
  }

  if (providedKey !== env.ADMIN_API_KEY) {
    return {
      ok: false as const,
      status: 401,
      error: "Admin API key is missing or invalid.",
    };
  }

  return {
    ok: true as const,
    mode: "secured" as const,
    actor: getAdminActor(request, "secured"),
  };
}
