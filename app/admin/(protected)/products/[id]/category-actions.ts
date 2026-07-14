"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/catalog/admin-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductCategoryActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function saveProductCategoriesAction(
  productId: string,
  _previousState: ProductCategoryActionState,
  formData: FormData,
): Promise<ProductCategoryActionState> {
  await requireAdmin();
  if (!isUuid(productId)) {
    return { status: "error", message: "商品信息无效，请刷新后重试。" };
  }

  const categoryIds = formData
    .getAll("categoryIds")
    .filter((value): value is string => typeof value === "string");
  if (categoryIds.length > 20 || categoryIds.some((id) => !isUuid(id))) {
    return { status: "error", message: "分类选择无效，请刷新后重试。" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_product_categories", {
    p_product_id: productId,
    p_category_ids: categoryIds,
  });
  if (error) {
    return { status: "error", message: "商品分类暂时无法保存，请稍后重试。" };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/zh", "layout");
  return { status: "success", message: "商品分类已保存。" };
}
