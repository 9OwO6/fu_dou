import { isUuid } from "./admin-validation";

export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BATCH = 20;
export const MAX_PRODUCT_IMAGES = 100;

export const allowedImageExtensions = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
} as const;

export type ProductImageInput = {
  id: string;
  storagePath: string;
  altText: string;
  variantId: string | null;
  width: number | null;
  height: number | null;
};

export type ProductImageConfigurationInput = Pick<ProductImageInput, "id" | "altText" | "variantId">;

type ValidationResult<T> = { success: true; values: T } | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalDimension(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function imageExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function isAllowedImageType(mimeType: string): mimeType is keyof typeof allowedImageExtensions {
  return mimeType in allowedImageExtensions;
}

export function isAllowedExtensionForType(mimeType: keyof typeof allowedImageExtensions, extension: string) {
  return (allowedImageExtensions[mimeType] as readonly string[]).includes(extension);
}

export function validateClientImageFile(file: File): ValidationResult<{ extension: string }> {
  const extension = imageExtension(file.name);
  if (!isAllowedImageType(file.type) || !isAllowedExtensionForType(file.type, extension)) {
    return { success: false, message: `${file.name} 必须是扩展名与内容类型一致的 JPEG、PNG 或 WebP 图片。` };
  }
  if (file.size <= 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { success: false, message: `${file.name} 必须大于 0 字节且不超过 10 MiB。` };
  }
  return { success: true, values: { extension: file.type === "image/jpeg" ? "jpg" : extension } };
}

export function parseUploadedImages(productId: string, raw: string): ValidationResult<ProductImageInput[]> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false, message: "图片上传资料无法读取。" };
  }
  if (!isUuid(productId) || !Array.isArray(value) || value.length < 1 || value.length > MAX_IMAGE_BATCH) {
    return { success: false, message: `每次请选择 1–${MAX_IMAGE_BATCH} 张图片。` };
  }

  const images: ProductImageInput[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) return { success: false, message: "图片上传资料格式不正确。" };
    const id = typeof item.id === "string" ? item.id : "";
    const storagePath = typeof item.storagePath === "string" ? item.storagePath : "";
    const altText = typeof item.altText === "string" ? item.altText.trim() : "";
    const variantId = typeof item.variantId === "string" && item.variantId ? item.variantId : null;
    if (!isUuid(id) || ids.has(id) || paths.has(storagePath)) return { success: false, message: "图片标识重复或无效。" };
    if (!new RegExp(`^products/${productId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|jpeg|png|webp)$`).test(storagePath)) {
      return { success: false, message: "图片路径不属于当前商品。" };
    }
    if (!altText || altText.length > 300) return { success: false, message: "每张图片都需要 1–300 个字符的中文替代文字。" };
    if (variantId && !isUuid(variantId)) return { success: false, message: "图片关联的规格组合无效。" };
    ids.add(id);
    paths.add(storagePath);
    images.push({
      id,
      storagePath,
      altText,
      variantId,
      width: optionalDimension(item.width),
      height: optionalDimension(item.height),
    });
  }
  return { success: true, values: images };
}

export function parseProductImageConfiguration(raw: string): ValidationResult<ProductImageConfigurationInput[]> {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false, message: "图片排序资料无法读取。" };
  }
  if (!Array.isArray(value) || value.length > MAX_PRODUCT_IMAGES) {
    return { success: false, message: `单个商品最多管理 ${MAX_PRODUCT_IMAGES} 张图片。` };
  }
  const seen = new Set<string>();
  const images: ProductImageConfigurationInput[] = [];
  for (const item of value) {
    if (!isRecord(item)) return { success: false, message: "图片排序资料格式不正确。" };
    const id = typeof item.id === "string" ? item.id : "";
    const altText = typeof item.altText === "string" ? item.altText.trim() : "";
    const variantId = typeof item.variantId === "string" && item.variantId ? item.variantId : null;
    if (!isUuid(id) || seen.has(id)) return { success: false, message: "图片标识重复或无效。" };
    if (!altText || altText.length > 300) return { success: false, message: "每张图片都需要 1–300 个字符的中文替代文字。" };
    if (variantId && !isUuid(variantId)) return { success: false, message: "图片关联的规格组合无效。" };
    seen.add(id);
    images.push({ id, altText, variantId });
  }
  return { success: true, values: images };
}
