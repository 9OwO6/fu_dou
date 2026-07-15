"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import {
  isUuid,
  parseCategoryForm,
  type CategoryField,
} from "@/lib/catalog/admin-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CategoryActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<CategoryField, string>>;
};

function categoryErrorState(errorCode?: string): CategoryActionState {
  if (errorCode === "23505") {
    return {
      status: "error",
      message: "该网址标识已被其他分类使用。",
      fieldErrors: { slug: "请使用不同的网址标识。" },
    };
  }
  return { status: "error", message: "分类暂时无法保存，请稍后重试。", fieldErrors: {} };
}

export async function createCategoryAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_category_bilingual", {
    p_slug: parsed.values.slug,
    p_zh_name: parsed.values.name,
    p_zh_description: parsed.values.description,
    p_en_name: parsed.values.nameEn,
    p_en_description: parsed.values.descriptionEn,
    p_sort_order: parsed.values.sortOrder,
    p_is_visible: parsed.values.isVisible,
  });
  if (error) return categoryErrorState(error.code);

  revalidatePath("/admin/categories");
  return { status: "success", message: "分类已创建。", fieldErrors: {} };
}

export async function updateCategoryAction(
  categoryId: string,
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requireAdmin();
  if (!isUuid(categoryId)) return categoryErrorState();
  const parsed = parseCategoryForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_category_bilingual", {
    p_category_id: categoryId,
    p_slug: parsed.values.slug,
    p_zh_name: parsed.values.name,
    p_zh_description: parsed.values.description,
    p_en_name: parsed.values.nameEn,
    p_en_description: parsed.values.descriptionEn,
    p_sort_order: parsed.values.sortOrder,
    p_is_visible: parsed.values.isVisible,
  });
  if (error) return categoryErrorState(error.code);

  revalidatePath("/admin/categories");
  revalidatePath("/en");
  revalidatePath("/zh");
  return { status: "success", message: "分类已保存。", fieldErrors: {} };
}
