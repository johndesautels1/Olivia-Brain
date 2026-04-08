import { getServerEnv } from "@/lib/config/env";

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
  };
}
