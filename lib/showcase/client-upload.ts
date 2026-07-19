"use client";

import {
  addShowcaseImagesAction,
  publishShowcaseBatchAction,
  replaceShowcaseImageAction,
} from "@/app/admin/(protected)/quick-listings/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import {
  SHOWCASE_IMAGE_BUCKET,
  validateClientImageFile,
  type ShowcasePublishItemInput,
  type ShowcasePresentationPreset,
} from "./validation";

export type PendingShowcaseImage = {
  id: string;
  file: File;
  previewUrl: string;
  width: number | null;
  height: number | null;
};

export async function readShowcaseImageDimensions(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return { width: null, height: null };
  }
}

export function releaseShowcasePreviews(items: Array<{ images: PendingShowcaseImage[] }>) {
  items.flatMap((item) => item.images).forEach((image) => URL.revokeObjectURL(image.previewUrl));
}

export async function uploadAndPublishShowcaseBatch(
  batchId: string,
  items: Array<Omit<ShowcasePublishItemInput, "images"> & { images: PendingShowcaseImage[] }>,
  presentationPreset: ShowcasePresentationPreset,
  featuredItemId: string | null,
) {
  const supabase = createSupabaseBrowserClient();
  const uploadedPaths: string[] = [];
  const payload: ShowcasePublishItemInput[] = [];

  for (const item of items) {
    const uploadedImages = [];
    for (const image of item.images) {
      const validation = validateClientImageFile(image.file);
      if (!validation.success) {
        if (uploadedPaths.length) await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
        return { status: "error" as const, message: validation.message };
      }
      const path = `showcase/${batchId}/${image.id}.${validation.values.extension}`;
      const { error } = await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).upload(path, image.file, {
        cacheControl: "3600",
        contentType: image.file.type,
        upsert: false,
      });
      if (error) {
        if (uploadedPaths.length) await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
        return { status: "error" as const, message: "图片上传失败；本批已上传文件已撤销。请确认管理员会话、格式和 10 MiB 限制后重试。" };
      }
      uploadedPaths.push(path);
      uploadedImages.push({ id: image.id, storagePath: path, width: image.width, height: image.height });
    }
    payload.push({ ...item, images: uploadedImages });
  }

  const result = await publishShowcaseBatchAction(
    batchId,
    JSON.stringify(payload),
    presentationPreset,
    featuredItemId,
  );
  if (result.status === "error" && uploadedPaths.length) {
    await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
  }
  return result;
}

export async function uploadAndAddShowcaseImages(itemId: string, files: File[]) {
  if (!files.length) return { status: "error" as const, message: "请先选择图片。" };
  const supabase = createSupabaseBrowserClient();
  const uploadedPaths: string[] = [];
  const payload: ShowcasePublishItemInput["images"] = [];

  for (const file of files) {
    const validation = validateClientImageFile(file);
    if (!validation.success) {
      if (uploadedPaths.length) await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
      return { status: "error" as const, message: validation.message };
    }
    const id = crypto.randomUUID();
    const path = `showcase/${itemId}/${id}.${validation.values.extension}`;
    const dimensions = await readShowcaseImageDimensions(file);
    const { error } = await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      if (uploadedPaths.length) await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
      return { status: "error" as const, message: "图片上传失败；本次已上传文件已撤销。请确认管理员会话、格式和 10 MiB 限制后重试。" };
    }
    uploadedPaths.push(path);
    payload.push({ id, storagePath: path, width: dimensions.width, height: dimensions.height });
  }

  const result = await addShowcaseImagesAction(itemId, JSON.stringify(payload));
  if (result.status === "error" && uploadedPaths.length) {
    await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove(uploadedPaths);
  }
  return result;
}

export async function uploadAndReplaceShowcaseImage(itemId: string, oldImageId: string, file: File) {
  const validation = validateClientImageFile(file);
  if (!validation.success) return { status: "error" as const, message: validation.message };
  const supabase = createSupabaseBrowserClient();
  const id = crypto.randomUUID();
  const path = `showcase/${itemId}/${id}.${validation.values.extension}`;
  const dimensions = await readShowcaseImageDimensions(file);
  const { error } = await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return { status: "error" as const, message: "替换图片上传失败。请确认管理员会话、格式和 10 MiB 限制后重试。" };
  }

  const result = await replaceShowcaseImageAction(itemId, oldImageId, JSON.stringify([{
    id,
    storagePath: path,
    width: dimensions.width,
    height: dimensions.height,
  }]));
  if (result.status === "error") {
    await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).remove([path]);
  }
  return result;
}
