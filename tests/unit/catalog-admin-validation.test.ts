import { describe, expect, it } from "vitest";

import { parseCategoryForm, parseProductForm } from "@/lib/catalog/admin-validation";

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("Phase 5A catalog validation", () => {
  it("normalizes and accepts valid Chinese product content", () => {
    const result = parseProductForm(form({ slug: " Cat-Mug ", title: " 猫猫杯 ", seoTitle: "猫猫杯" }));
    expect(result).toEqual({
      success: true,
      values: {
        slug: "cat-mug",
        title: "猫猫杯",
        shortDescription: "",
        description: "",
        seoTitle: "猫猫杯",
        seoDescription: "",
      },
    });
  });

  it("rejects invalid slugs, missing titles, and oversized SEO text", () => {
    const result = parseProductForm(form({
      slug: "bad slug!",
      title: "",
      seoDescription: "长".repeat(161),
    }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors.slug).toBeTruthy();
      expect(result.fieldErrors.title).toBeTruthy();
      expect(result.fieldErrors.seoDescription).toBeTruthy();
    }
  });

  it("validates category ordering and visibility", () => {
    const data = form({ slug: "home-decor", name: "家居摆件", sortOrder: "2", isVisible: "on" });
    expect(parseCategoryForm(data)).toEqual({
      success: true,
      values: {
        slug: "home-decor",
        name: "家居摆件",
        description: "",
        sortOrder: 2,
        isVisible: true,
      },
    });
  });

  it("rejects fractional or negative category ordering", () => {
    for (const sortOrder of ["-1", "1.5", "not-a-number"]) {
      const result = parseCategoryForm(form({ slug: "decor", name: "摆件", sortOrder }));
      expect(result.success).toBe(false);
      if (!result.success) expect(result.fieldErrors.sortOrder).toBeTruthy();
    }
  });
});
