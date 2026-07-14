import { describe, expect, it } from "vitest";

import {
  MAX_PRODUCT_IMAGE_BYTES,
  parseProductImageConfiguration,
  parseUploadedImages,
  validateClientImageFile,
} from "@/lib/catalog/media-validation";

const productId = "20000000-0000-4000-8000-000000000001";

describe("Phase 5C product image validation", () => {
  it("accepts a matching JPEG and rejects extension/MIME mismatch", () => {
    const jpeg = new File([new Uint8Array([0xff, 0xd8, 0xff])], "cup.jpeg", { type: "image/jpeg" });
    const mismatch = new File([new Uint8Array([0xff, 0xd8, 0xff])], "cup.png", { type: "image/jpeg" });
    expect(validateClientImageFile(jpeg).success).toBe(true);
    expect(validateClientImageFile(mismatch).success).toBe(false);
  });

  it("rejects an empty or oversized image", () => {
    const empty = new File([], "empty.webp", { type: "image/webp" });
    const oversized = { name: "large.png", type: "image/png", size: MAX_PRODUCT_IMAGE_BYTES + 1 } as File;
    expect(validateClientImageFile(empty).success).toBe(false);
    expect(validateClientImageFile(oversized).success).toBe(false);
  });

  it("validates generated product paths, alt text, and variant ids", () => {
    const result = parseUploadedImages(productId, JSON.stringify([{
      id: "70000000-0000-4000-8000-000000000001",
      storagePath: `products/${productId}/70000000-0000-4000-8000-000000000001.webp`,
      altText: "猫咪茶杯正面图",
      variantId: "50000000-0000-4000-8000-000000000001",
      width: 1200,
      height: 1500,
    }]));
    expect(result.success).toBe(true);
  });

  it("rejects duplicate image ids and blank alt text in ordering", () => {
    const duplicateId = "70000000-0000-4000-8000-000000000001";
    const result = parseProductImageConfiguration(JSON.stringify([
      { id: duplicateId, altText: "封面", variantId: null },
      { id: duplicateId, altText: "", variantId: null },
    ]));
    expect(result.success).toBe(false);
  });
});
