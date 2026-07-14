"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseLoginCredentials } from "@/lib/auth/credentials";
import { getAdminSessionState, recordAdminAudit } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const credentials = parseLoginCredentials(formData);
  if (!credentials) {
    return { error: "请输入有效的管理员邮箱和密码。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword(credentials);

  if (signInError) {
    return { error: "邮箱或密码不正确。" };
  }

  const { admin } = await getAdminSessionState(supabase);
  if (!admin) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "邮箱、密码或管理员权限不正确。" };
  }

  try {
    await recordAdminAudit(admin, "auth.login", { source: "password" });
  } catch {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "登录暂时无法完成，请稍后重试。" };
  }

  revalidatePath("/admin", "layout");
  redirect("/admin");
}
