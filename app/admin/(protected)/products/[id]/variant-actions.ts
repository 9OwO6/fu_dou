"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/catalog/admin-validation";
import { parseVariantConfiguration } from "@/lib/catalog/variant-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VariantActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Record<string, string>;
};

function databaseError(code?: string, message?: string): VariantActionState {
  if (code === "23505") {
    return {
      status: "error",
      message: message?.includes("Duplicate variant option combination")
        ? "存在重复规格组合，请重新生成后再保存。"
        : "存在重复 SKU、规格名称或规格值，请检查后重试。",
      fieldErrors: {},
    };
  }
  if (code === "23503") {
    return {
      status: "error",
      message: "这个组合已被图片或订单记录引用，不能直接删除。请先保留并禁用该组合。",
      fieldErrors: {},
    };
  }
  if (code === "23514" || code === "22003" || code === "22P02") {
    return {
      status: "error",
      message: "规格、价格或库存未通过数据库校验，请检查每个组合。",
      fieldErrors: {},
    };
  }
  return { status: "error", message: "规格暂时无法保存，请稍后重试。", fieldErrors: {} };
}

export async function saveVariantConfigurationAction(
  productId: string,
  _previousState: VariantActionState,
  formData: FormData,
): Promise<VariantActionState> {
  await requireAdmin();
  if (!isUuid(productId)) return databaseError();
  const rawConfiguration = formData.get("configuration");
  if (typeof rawConfiguration !== "string") return databaseError();

  const parsed = parseVariantConfiguration(rawConfiguration);
  if (!parsed.success) {
    return { status: "error", message: "请修正规格和组合中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_product_variants_bilingual", {
    p_product_id: productId,
    p_configuration: parsed.values,
  });
  if (error) return databaseError(error.code, error.message);

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  return { status: "success", message: "规格、价格和库存已保存。", fieldErrors: {} };
}
