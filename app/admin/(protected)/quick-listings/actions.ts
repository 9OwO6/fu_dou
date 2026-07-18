"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/admin";
import { isUuid } from "@/lib/catalog/admin-validation";
import {
  isValidShowcaseTagSlug,
  MAX_SHOWCASE_IMAGES,
  parseShowcasePublishPayload,
  SHOWCASE_IMAGE_BUCKET,
  validateStoredShowcaseObject,
} from "@/lib/showcase/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ShowcaseActionState = { status: "idle" | "error" | "success"; message: string };
const errorState = (message = "快速上新操作暂时无法完成，请稍后重试。"): ShowcaseActionState => ({ status: "error", message });

async function removeBatchPaths(paths: string[]) {
  if (!paths.length) return true;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(paths);
  return !error;
}

export async function publishShowcaseBatchAction(batchId: string, rawItems: string): Promise<ShowcaseActionState> {
  await requireAdmin();
  const parsed = parseShowcasePublishPayload(batchId, rawItems);
  if (!parsed.success) return errorState(parsed.message);
  const paths = parsed.values.flatMap((item) => item.images.map((image) => image.storagePath));
  const supabase = await createSupabaseServerClient();
  const { data: storedObjects, error: listError } = await supabase.storage
    .from(SHOWCASE_IMAGE_BUCKET)
    .list(`showcase/${batchId}`, { limit: MAX_SHOWCASE_IMAGES + 1 });
  if (listError) {
    await removeBatchPaths(paths);
    return errorState("无法核对已上传图片；本批文件已撤销。");
  }
  const objectsByName = new Map((storedObjects ?? []).map((object) => [object.name, object]));
  for (const path of paths) {
    const object = objectsByName.get(path.split("/").at(-1) ?? "");
    if (!validateStoredShowcaseObject(path, object)) {
      await removeBatchPaths(paths);
      return errorState("Storage 中的图片类型、扩展名或大小不符合要求；本批文件已撤销。");
    }
  }
  const { error } = await supabase.rpc("admin_create_showcase_batch", {
    p_batch_id: batchId,
    p_items: parsed.values,
  });
  if (error) {
    const cleaned = await removeBatchPaths(paths);
    return errorState(cleaned
      ? "快速上新资料未能登记，Storage 上传已自动撤销。"
      : "快速上新资料未能登记，且 Storage 清理失败；请停止继续上传并联系技术人员。");
  }
  revalidatePath("/admin/quick-listings");
  revalidatePath("/en/new-arrivals");
  revalidatePath("/zh/new-arrivals");
  return { status: "success", message: `已发布 ${parsed.values.length} 个展示商品、${paths.length} 张图片。` };
}

export async function createShowcaseTagAction(
  _previousState: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  await requireAdmin();
  const slug = typeof formData.get("slug") === "string" ? String(formData.get("slug")).trim().toLowerCase() : "";
  const nameZh = typeof formData.get("nameZh") === "string" ? String(formData.get("nameZh")).trim() : "";
  const nameEn = typeof formData.get("nameEn") === "string" ? String(formData.get("nameEn")).trim() : "";
  if (!isValidShowcaseTagSlug(slug) || nameZh.length < 1 || nameZh.length > 60 || nameEn.length > 60) {
    return errorState("请输入有效的英文网址标识和 1–60 字中文标签名；英文名称可留空。");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_showcase_tag", {
    p_slug: slug,
    p_name_zh: nameZh,
    p_name_en: nameEn || null,
  });
  if (error) return errorState(error.code === "23505" ? "该标签网址标识已经存在。" : undefined);
  revalidatePath("/admin/quick-listings");
  revalidatePath("/admin/quick-listings/new");
  return { status: "success", message: "标签已创建，可以用于下一批快速上新。" };
}

export async function updateShowcaseItemsStatusAction(
  itemIds: string[],
  availability: "inquiry" | "sold" | "archived",
): Promise<ShowcaseActionState> {
  await requireAdmin();
  const uniqueIds = [...new Set(itemIds)];
  if (uniqueIds.length < 1 || uniqueIds.length > 100 || uniqueIds.some((id) => !isUuid(id))) {
    return errorState("请选择 1–100 个有效展示商品。 ");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_showcase_items", {
    p_item_ids: uniqueIds,
    p_availability: availability,
  });
  if (error) return errorState();
  revalidatePath("/admin/quick-listings");
  revalidatePath("/en/new-arrivals");
  revalidatePath("/zh/new-arrivals");
  return { status: "success", message: `已更新 ${uniqueIds.length} 个展示商品。` };
}

export async function updateShowcaseItemAction(
  itemId: string,
  _previousState: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  await requireAdmin();
  if (!isUuid(itemId)) return errorState("展示商品标识无效。");
  const titleZh = String(formData.get("titleZh") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const descriptionZh = String(formData.get("descriptionZh") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim();
  const priceRaw = String(formData.get("priceCad") ?? "").trim();
  const tagIds = formData.getAll("tagIds").filter((value): value is string => typeof value === "string");
  if (titleZh.length > 120 || titleEn.length > 120 || descriptionZh.length > 500 || descriptionEn.length > 500) {
    return errorState("名称最多 120 字，说明最多 500 字。 ");
  }
  if (priceRaw && (!/^\d{1,8}(?:\.\d{1,2})?$/.test(priceRaw) || Number(priceRaw) <= 0)) {
    return errorState("价格必须是大于 0、最多两位小数的 CAD 金额，或留空。 ");
  }
  if (tagIds.length > 10 || new Set(tagIds).size !== tagIds.length || tagIds.some((id) => !isUuid(id))) {
    return errorState("标签选择无效。 ");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_showcase_item", {
    p_item_id: itemId,
    p_title_zh: titleZh,
    p_title_en: titleEn,
    p_description_zh: descriptionZh,
    p_description_en: descriptionEn,
    p_price_cad: priceRaw ? Number(priceRaw) : null,
    p_tag_ids: tagIds,
  });
  if (error) return errorState();
  revalidatePath("/admin/quick-listings");
  revalidatePath("/en/new-arrivals");
  revalidatePath("/zh/new-arrivals");
  return { status: "success", message: "展示商品的可选内容与标签已保存。" };
}
