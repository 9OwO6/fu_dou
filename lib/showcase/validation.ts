import { isUuid } from "@/lib/catalog/admin-validation";
import {
  imageExtension,
  isAllowedExtensionForType,
  isAllowedImageType,
  MAX_PRODUCT_IMAGE_BYTES,
  validateClientImageFile,
} from "@/lib/catalog/media-validation";

export const SHOWCASE_IMAGE_BUCKET = "showcase-images";
export const MAX_SHOWCASE_ITEMS = 30;
export const MAX_SHOWCASE_IMAGES = 30;
export const MAX_SHOWCASE_IMAGES_PER_ITEM = 10;
export const MAX_SHOWCASE_TAGS_PER_ITEM = 10;
export const SHOWCASE_PRESENTATION_PRESETS = [
  "sunny_shelf",
  "joyful_scrapbook",
  "today_spotlight",
] as const;

export type ShowcasePresentationPreset = typeof SHOWCASE_PRESENTATION_PRESETS[number];

export { MAX_PRODUCT_IMAGE_BYTES, validateClientImageFile };

export type ShowcaseImageInput = {
  id: string;
  storagePath: string;
  width: number | null;
  height: number | null;
};

export type ShowcasePublishItemInput = {
  id: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  priceCad: string;
  tagIds: string[];
  images: ShowcaseImageInput[];
};

type ValidationResult<T> = { success: true; values: T } | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= max ? normalized : null;
}

function dimension(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function isValidShowcaseTagSlug(value: string) {
  return value.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isShowcasePresentationPreset(value: string): value is ShowcasePresentationPreset {
  return SHOWCASE_PRESENTATION_PRESETS.includes(value as ShowcasePresentationPreset);
}

export function parseShowcasePublishPayload(
  batchId: string,
  raw: string,
): ValidationResult<ShowcasePublishItemInput[]> {
  if (!isUuid(batchId)) return { success: false, message: "本次上新批次标识无效。" };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false, message: "快速上新资料无法读取。" };
  }

  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHOWCASE_ITEMS) {
    return { success: false, message: `每批请发布 1–${MAX_SHOWCASE_ITEMS} 个展示商品。` };
  }

  const itemIds = new Set<string>();
  const imageIds = new Set<string>();
  const paths = new Set<string>();
  const result: ShowcasePublishItemInput[] = [];
  let totalImages = 0;

  for (const item of value) {
    if (!isRecord(item)) return { success: false, message: "展示商品资料格式不正确。" };
    const id = typeof item.id === "string" ? item.id : "";
    const titleZh = text(item.titleZh, 120);
    const titleEn = text(item.titleEn, 120);
    const descriptionZh = text(item.descriptionZh, 500);
    const descriptionEn = text(item.descriptionEn, 500);
    const priceCad = typeof item.priceCad === "string" ? item.priceCad.trim() : "";
    const tags = Array.isArray(item.tagIds) ? item.tagIds : null;
    const images = Array.isArray(item.images) ? item.images : null;

    if (!isUuid(id) || itemIds.has(id)) return { success: false, message: "展示商品标识重复或无效。" };
    if (titleZh === null || titleEn === null || descriptionZh === null || descriptionEn === null) {
      return { success: false, message: "名称最多 120 字，说明最多 500 字。" };
    }
    if (priceCad && (!/^\d{1,8}(?:\.\d{1,2})?$/.test(priceCad) || Number(priceCad) <= 0)) {
      return { success: false, message: "价格必须是大于 0、最多两位小数的 CAD 金额，或留空。" };
    }
    if (!tags || tags.length > MAX_SHOWCASE_TAGS_PER_ITEM || tags.some((tag) => typeof tag !== "string" || !isUuid(tag))) {
      return { success: false, message: `每个展示商品最多选择 ${MAX_SHOWCASE_TAGS_PER_ITEM} 个有效标签。` };
    }
    if (new Set(tags).size !== tags.length) return { success: false, message: "同一个标签不能重复选择。" };
    if (!images || images.length < 1 || images.length > MAX_SHOWCASE_IMAGES_PER_ITEM) {
      return { success: false, message: `每个展示商品需要 1–${MAX_SHOWCASE_IMAGES_PER_ITEM} 张图片。` };
    }

    totalImages += images.length;
    if (totalImages > MAX_SHOWCASE_IMAGES) {
      return { success: false, message: `每批最多上传 ${MAX_SHOWCASE_IMAGES} 张图片。` };
    }

    const parsedImages: ShowcaseImageInput[] = [];
    for (const image of images) {
      if (!isRecord(image)) return { success: false, message: "展示图片资料格式不正确。" };
      const imageId = typeof image.id === "string" ? image.id : "";
      const storagePath = typeof image.storagePath === "string" ? image.storagePath : "";
      if (!isUuid(imageId) || imageIds.has(imageId) || paths.has(storagePath)) {
        return { success: false, message: "展示图片标识重复或无效。" };
      }
      if (!new RegExp(`^showcase/${batchId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|jpeg|png|webp)$`).test(storagePath)) {
        return { success: false, message: "展示图片路径不属于本次上新批次。" };
      }
      imageIds.add(imageId);
      paths.add(storagePath);
      parsedImages.push({
        id: imageId,
        storagePath,
        width: dimension(image.width),
        height: dimension(image.height),
      });
    }

    itemIds.add(id);
    result.push({
      id,
      titleZh,
      titleEn,
      descriptionZh,
      descriptionEn,
      priceCad,
      tagIds: tags,
      images: parsedImages,
    });
  }

  return { success: true, values: result };
}

export function parseShowcaseImageEditPayload(
  itemId: string,
  raw: string,
): ValidationResult<ShowcaseImageInput[]> {
  if (!isUuid(itemId)) return { success: false, message: "展示商品标识无效。" };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false, message: "新增图片资料无法读取。" };
  }

  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_SHOWCASE_IMAGES_PER_ITEM) {
    return { success: false, message: `每次请添加 1–${MAX_SHOWCASE_IMAGES_PER_ITEM} 张图片。` };
  }

  const ids = new Set<string>();
  const paths = new Set<string>();
  const result: ShowcaseImageInput[] = [];
  for (const image of value) {
    if (!isRecord(image)) return { success: false, message: "新增图片资料格式不正确。" };
    const id = typeof image.id === "string" ? image.id : "";
    const storagePath = typeof image.storagePath === "string" ? image.storagePath : "";
    if (!isUuid(id) || ids.has(id) || paths.has(storagePath)) {
      return { success: false, message: "新增图片标识重复或无效。" };
    }
    if (!new RegExp(`^showcase/${itemId}/${id}\\.(jpg|jpeg|png|webp)$`).test(storagePath)) {
      return { success: false, message: "新增图片路径不属于当前展示商品。" };
    }
    ids.add(id);
    paths.add(storagePath);
    result.push({
      id,
      storagePath,
      width: dimension(image.width),
      height: dimension(image.height),
    });
  }
  return { success: true, values: result };
}

export function validateStoredShowcaseObject(path: string, object: { metadata?: unknown } | undefined) {
  if (!object || !isRecord(object.metadata)) return false;
  const mimeType = typeof object.metadata.mimetype === "string" ? object.metadata.mimetype : "";
  const size = typeof object.metadata.size === "number" ? object.metadata.size : Number.NaN;
  const extension = imageExtension(path);
  return isAllowedImageType(mimeType)
    && isAllowedExtensionForType(mimeType, extension)
    && Number.isFinite(size)
    && size > 0
    && size <= MAX_PRODUCT_IMAGE_BYTES;
}
