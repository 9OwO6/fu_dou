"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/admin";
import {
  isProductStatus,
  isUuid,
  parseProductForm,
  type ProductField,
} from "@/lib/catalog/admin-validation";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/catalog/media-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: Partial<Record<ProductField, string>>;
  productId?: string;
};

function productErrorState(errorCode?: string): ProductActionState {
  if (errorCode === "23505") {
    return {
      status: "error",
      message: "该网址标识已被其他商品使用。",
      fieldErrors: { slug: "请使用不同的网址标识。" },
    };
  }
  return {
    status: "error",
    message: "商品暂时无法保存，请稍后重试。",
    fieldErrors: {},
  };
}

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_create_product", {
    p_slug: parsed.values.slug,
    p_title: parsed.values.title,
    p_short_description: parsed.values.shortDescription,
    p_description: parsed.values.description,
    p_seo_title: parsed.values.seoTitle,
    p_seo_description: parsed.values.seoDescription,
  });

  if (error || typeof data !== "string") return productErrorState(error?.code);
  revalidatePath("/admin/products");
  return {
    status: "success",
    message: "商品草稿已创建，正在完成后续处理。",
    fieldErrors: {},
    productId: data,
  };
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  await requireAdmin();
  if (!isUuid(productId)) return productErrorState();
  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { status: "error", message: "请修正表单中的问题。", fieldErrors: parsed.fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_product", {
    p_product_id: productId,
    p_slug: parsed.values.slug,
    p_title: parsed.values.title,
    p_short_description: parsed.values.shortDescription,
    p_description: parsed.values.description,
    p_seo_title: parsed.values.seoTitle,
    p_seo_description: parsed.values.seoDescription,
  });

  if (error) return productErrorState(error.code);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "商品内容已保存。", fieldErrors: {} };
}

export async function duplicateProductAction(formData: FormData) {
  await requireAdmin();
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !isUuid(productId)) {
    redirect("/admin/products?notice=action_failed");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_duplicate_product", {
    p_product_id: productId,
  });
  if (error || typeof data !== "string") {
    redirect("/admin/products?notice=action_failed");
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products/${data}?saved=duplicated`);
}

export async function setProductStatusAction(formData: FormData) {
  await requireAdmin();
  const productId = formData.get("productId");
  const status = formData.get("status");
  if (
    typeof productId !== "string"
    || !isUuid(productId)
    || typeof status !== "string"
    || !isProductStatus(status)
  ) {
    redirect("/admin/products?notice=action_failed");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_product_status", {
    p_product_id: productId,
    p_status: status,
  });
  if (error) redirect("/admin/products?notice=action_failed");

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products?notice=status_${status}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const productId = formData.get("productId");
  if (typeof productId !== "string" || !isUuid(productId)) {
    redirect("/admin/products?notice=delete_failed");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delete_product", {
    p_product_id: productId,
  });

  if (error) {
    const notice = error.code === "55000"
      ? "delete_requires_unpublish"
      : error.code === "23503"
        ? "delete_order_referenced"
        : "delete_failed";
    redirect(`/admin/products?notice=${notice}`);
  }

  const paths = Array.isArray(data)
    ? data.filter((path): path is string => typeof path === "string")
    : [];
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
    if (storageError) {
      revalidatePath("/admin/products");
      redirect("/admin/products?notice=deleted_storage_warning");
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/homepage");
  redirect("/admin/products?notice=deleted");
}
