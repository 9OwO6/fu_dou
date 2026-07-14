import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminContext = {
  userId: string;
  email: string | null;
  displayName: string;
};

export class AdminAuthorizationError extends Error {
  readonly reason: "unauthenticated" | "forbidden";

  constructor(reason: "unauthenticated" | "forbidden") {
    super(reason === "unauthenticated" ? "Authentication required" : "Administrator required");
    this.name = "AdminAuthorizationError";
    this.reason = reason;
  }
}

async function resolveAdminContext(
  supabase: SupabaseClient,
  userId: string,
  emailClaim: unknown,
): Promise<AdminContext | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return {
    userId,
    email: typeof emailClaim === "string" ? emailClaim : null,
    displayName: profile.display_name,
  };
}

export async function getAdminSessionState(
  supabase: SupabaseClient | null = null,
) {
  const authClient = supabase ?? (await createSupabaseServerClient());
  const { data: claimsData } = await authClient.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  const isAuthenticated = typeof userId === "string";
  const admin = isAuthenticated
    ? await resolveAdminContext(authClient, userId, claimsData?.claims.email)
    : null;

  return { isAuthenticated, admin };
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();

  if (typeof claimsData?.claims?.sub !== "string") {
    throw new AdminAuthorizationError("unauthenticated");
  }

  const admin = await resolveAdminContext(
    supabase,
    claimsData.claims.sub,
    claimsData.claims.email,
  );
  if (!admin) {
    throw new AdminAuthorizationError("forbidden");
  }

  return admin;
}

export async function recordAdminAudit(
  admin: AdminContext,
  action: string,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_user_id: admin.userId,
    action,
    metadata,
  });

  if (error) {
    throw new Error("管理员操作审计记录失败。");
  }
}
