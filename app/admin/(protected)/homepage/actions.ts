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
  const { serviceAreaDescriptionEn, ...siteSettings } = parsed.value.siteSettings;
  const { error } = await supabase.rpc("admin_save_homepage_bilingual", {
    p_zh_sections: parsed.value.sections.map((section) => ({
      sectionType: section.sectionType,
      isEnabled: section.isEnabled,
      sortOrder: section.sortOrder,
      settings: section.settings,
      translation: section.translation,
    })),
    p_site_settings: siteSettings,
    p_en_sections: parsed.value.sections.map((section) => ({
      sectionType: section.sectionType,
      translation: section.translationEn,
    })),
    p_en_service_area_description: serviceAreaDescriptionEn,
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
  revalidatePath("/en", "layout");
  return { status: "success", message: "首页配置已保存，公开首页已更新。", fieldErrors: {} };
}
