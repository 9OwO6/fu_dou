"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/catalog/admin-validation";
import {
  imageExtension,
  isAllowedExtensionForType,
  isAllowedImageType,
  MAX_PRODUCT_IMAGE_BYTES,
  MAX_PRODUCT_IMAGES,
  parseProductImageConfiguration,
  parseUploadedImages,
  PRODUCT_IMAGE_BUCKET,
} from "@/lib/catalog/media-validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MediaActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const errorState = (message = "图片暂时无法保存，请稍后重试。"): MediaActionState => ({ status: "error", message });

async function removeUploadedPaths(paths: string[]) {
  if (paths.length === 0) return true;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(paths);
  return !error;
}

export async function registerUploadedImagesAction(productId: string, rawImages: string): Promise<MediaActionState> {
  await requireAdmin();
  const parsed = parseUploadedImages(productId, rawImages);
  if (!parsed.success) return errorState(parsed.message);

  const supabase = await createSupabaseServerClient();
  const [{ count, error: countError }, { data: storedObjects, error: listError }] = await Promise.all([
    supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId),
    supabase.storage.from(PRODUCT_IMAGE_BUCKET).list(`products/${productId}`, { limit: MAX_PRODUCT_IMAGES }),
  ]);
  if (countError || listError || (count ?? 0) + parsed.values.length > MAX_PRODUCT_IMAGES) {
    await removeUploadedPaths(parsed.values.map((image) => image.storagePath));
    return errorState((count ?? 0) + parsed.values.length > MAX_PRODUCT_IMAGES
      ? `单个商品最多管理 ${MAX_PRODUCT_IMAGES} 张图片。`
      : "无法核对已上传文件；本批文件已撤销。");
  }

  const objectsByName = new Map((storedObjects ?? []).map((object) => [object.name, object]));
  for (const image of parsed.values) {
    const object = objectsByName.get(image.storagePath.split("/").at(-1) ?? "");
    const mimeType = typeof object?.metadata?.mimetype === "string" ? object.metadata.mimetype : "";
    const byteSize = typeof object?.metadata?.size === "number" ? object.metadata.size : Number.NaN;
    const extension = imageExtension(image.storagePath);
    if (
      !object
      || !isAllowedImageType(mimeType)
      || !isAllowedExtensionForType(mimeType, extension)
      || !Number.isFinite(byteSize)
      || byteSize <= 0
      || byteSize > MAX_PRODUCT_IMAGE_BYTES
    ) {
      await removeUploadedPaths(parsed.values.map((item) => item.storagePath));
      return errorState("Storage 中的文件类型、扩展名或大小不符合要求；本批文件已撤销。");
    }
  }

  const { error } = await supabase.rpc("admin_register_product_images_bilingual", {
    p_product_id: productId,
    p_images: parsed.values,
  });
  if (error) {
    const cleaned = await removeUploadedPaths(parsed.values.map((image) => image.storagePath));
    return errorState(cleaned
      ? "数据库未能登记图片，Storage 上传已自动撤销。"
      : "数据库未能登记图片，且 Storage 清理失败；请停止继续上传并检查本商品目录。");
  }

  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: `已上传并登记 ${parsed.values.length} 张图片。` };
}

export async function saveProductImagesAction(
  productId: string,
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireAdmin();
  if (!isUuid(productId)) return errorState();
  const raw = formData.get("images");
  if (typeof raw !== "string") return errorState();
  const parsed = parseProductImageConfiguration(raw);
  if (!parsed.success) return errorState(parsed.message);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_product_images_bilingual", {
    p_product_id: productId,
    p_images: parsed.values,
  });
  if (error) return errorState(error.code === "23514" ? "图片关联的规格不属于当前商品。" : undefined);
  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "图片顺序、封面、替代文字和规格关联已保存。" };
}

type DeletedImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  variant_id: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  created_at: string;
};

function isDeletedImage(value: unknown): value is DeletedImage {
  return typeof value === "object" && value !== null
    && "storage_path" in value && typeof value.storage_path === "string"
    && "product_id" in value && typeof value.product_id === "string";
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<MediaActionState> {
  await requireAdmin();
  if (!isUuid(productId) || !isUuid(imageId)) return errorState();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delete_product_image", {
    p_product_id: productId,
    p_image_id: imageId,
  });
  if (error || !isDeletedImage(data)) return errorState("图片记录未找到或无法删除。");

  const { error: storageError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([data.storage_path]);
  if (storageError) {
    const { error: restoreError } = await supabase.rpc("admin_restore_product_image", { p_image: data });
    return errorState(restoreError
      ? "Storage 删除失败，数据库恢复也失败；请停止操作并检查一致性。"
      : "Storage 删除失败，数据库记录已恢复，图片仍然保留。");
  }

  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "图片已从 Storage 与数据库中删除。" };
}

export async function saveProductOperationsAction(
  productId: string,
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  await requireAdmin();
  if (!isUuid(productId)) return errorState("商品标识无效。");
  const featured = formData.get("isFeatured") === "on";
  const publishedAt = formData.get("publishedAt");
  if (typeof publishedAt !== "string") return errorState("发布时间格式无效。");
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) return errorState("发布时间格式无效。");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_product_operations", {
    p_product_id: productId,
    p_is_featured: featured,
    p_published_at: publishedAt || null,
  });
  if (error) return errorState(error.code === "23514" ? "已发布商品必须保留发布时间。" : undefined);
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  return { status: "success", message: "推荐状态与新品发布时间已保存。" };
}
