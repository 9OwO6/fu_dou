"use client";

import { registerUploadedImagesAction } from "@/app/admin/(protected)/products/[id]/media-actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import {
  PRODUCT_IMAGE_BUCKET,
  validateClientImageFile,
} from "./media-validation";

export type PendingProductImage = {
  file: File;
  previewUrl: string;
  altText: string;
  variantId: string;
  width: number | null;
  height: number | null;
};

export async function readImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

export function releasePendingImagePreviews(images: PendingProductImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

export async function uploadPendingProductImages(
  productId: string,
  images: PendingProductImage[],
) {
  const supabase = createSupabaseBrowserClient();
  const uploadedPaths: string[] = [];
  const registrations = [];

  for (const image of images) {
    const validation = validateClientImageFile(image.file);
    if (!validation.success) {
      if (uploadedPaths.length) {
        await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploadedPaths);
      }
      return { status: "error" as const, message: validation.message };
    }

    const id = crypto.randomUUID();
    const path = `products/${productId}/${id}.${validation.values.extension}`;
    const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, image.file, {
      cacheControl: "3600",
      contentType: image.file.type,
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploadedPaths);
      }
      return {
        status: "error" as const,
        message: "上传失败；本批已上传文件已撤销。请确认管理员会话、类型和 10 MiB 限制后重试。",
      };
    }

    uploadedPaths.push(path);
    registrations.push({
      id,
      storagePath: path,
      altText: image.altText.trim(),
      variantId: image.variantId || null,
      width: image.width,
      height: image.height,
    });
  }

  const result = await registerUploadedImagesAction(productId, JSON.stringify(registrations));
  if (result.status === "error" && uploadedPaths.length) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove(uploadedPaths);
  }
  return result;
}
