"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAdminAudit, requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logoutAction() {
  const admin = await requireAdmin();
  await recordAdminAudit(admin, "auth.logout");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    throw new Error("退出失败，请重试。");
  }

  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
