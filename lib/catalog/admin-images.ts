import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PRODUCT_IMAGE_BUCKET } from "./media-validation";

export type AdminProductImage = {
  id: string;
  storagePath: string;
  signedUrl: string;
  altText: string;
  variantId: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export async function getAdminProductImages(productId: string): Promise<AdminProductImage[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id, storage_path, alt_text, variant_id, sort_order, width, height")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error("商品图片暂时无法加载。");
  if (!data?.length) return [];

  const { data: signedImages, error: signedError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .createSignedUrls(data.map((image) => image.storage_path), 60 * 60);
  if (signedError) throw new Error("商品图片预览暂时无法加载。");

  return data.map((image, index) => ({
    id: image.id,
    storagePath: image.storage_path,
    signedUrl: signedImages[index]?.signedUrl ?? "",
    altText: image.alt_text,
    variantId: image.variant_id,
    sortOrder: image.sort_order,
    width: image.width,
    height: image.height,
  }));
}
