"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { parseHomepageForm, type HomepageFieldErrors } from "@/lib/homepage/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type HomepageActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: HomepageFieldErrors;
};

export async function saveHomepageAction(
  _previousState: HomepageActionState,
  formData: FormData,
): Promise<HomepageActionState> {
  await requireAdmin();
  const parsed = parseHomepageForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_homepage", {
    p_sections: parsed.value.sections,
    p_site_settings: parsed.value.siteSettings,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "22023" ? "配置未通过模块 schema 校验，请检查选品和必填内容。" : "首页配置暂时无法保存，请稍后重试。",
      fieldErrors: {},
    };
  }

  revalidatePath("/admin/homepage");
  revalidatePath("/zh", "layout");
  return { status: "success", message: "首页配置已保存，公开首页已更新。", fieldErrors: {} };
}

