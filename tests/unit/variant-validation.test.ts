import { describe, expect, it } from "vitest";

import { parseVariantConfiguration } from "@/lib/catalog/variant-validation";

const ids = {
  style: "30000000-0000-4000-8000-000000000001",
  color: "30000000-0000-4000-8000-000000000002",
  cat: "40000000-0000-4000-8000-000000000001",
  dog: "40000000-0000-4000-8000-000000000002",
  cream: "40000000-0000-4000-8000-000000000003",
  blue: "40000000-0000-4000-8000-000000000004",
};

function mugConfiguration() {
  return {
    options: [
      { id: ids.style, label: "款式", values: [{ id: ids.cat, label: "猫猫" }, { id: ids.dog, label: "狗狗" }] },
      { id: ids.color, label: "颜色", values: [{ id: ids.cream, label: "奶油色" }, { id: ids.blue, label: "浅蓝色" }] },
    ],
    variants: [
      { id: "50000000-0000-4000-8000-000000000001", optionValueIds: [ids.cat, ids.cream], sku: "MUG-CAT-CREAM", priceCad: "24.00", compareAtPriceCad: "", stockQty: "8", isActive: true },
      { id: "50000000-0000-4000-8000-000000000002", optionValueIds: [ids.cat, ids.blue], sku: "MUG-CAT-BLUE", priceCad: "24.00", compareAtPriceCad: "29.00", stockQty: "3", isActive: true },
      { id: "50000000-0000-4000-8000-000000000003", optionValueIds: [ids.dog, ids.cream], sku: "MUG-DOG-CREAM", priceCad: "25.00", compareAtPriceCad: "", stockQty: "5", isActive: true },
      { id: "50000000-0000-4000-8000-000000000004", optionValueIds: [ids.dog, ids.blue], sku: "MUG-DOG-BLUE", priceCad: "25.00", compareAtPriceCad: "", stockQty: "0", isActive: false },
    ],
  };
}

describe("Phase 5B variant configuration validation", () => {
  it("accepts the full cat/dog and color Cartesian matrix", () => {
    const result = parseVariantConfiguration(JSON.stringify(mugConfiguration()));
    expect(result.success).toBe(true);
  });

  it("accepts one size option and an optionless product", () => {
    const rug = {
      options: [{ id: ids.style, label: "尺寸", values: [{ id: ids.cat, label: "40×60 cm" }, { id: ids.dog, label: "60×90 cm" }] }],
      variants: [
        { id: "50000000-0000-4000-8000-000000000005", optionValueIds: [ids.cat], sku: "RUG-40X60", priceCad: "39", compareAtPriceCad: "", stockQty: "4", isActive: true },
        { id: "50000000-0000-4000-8000-000000000006", optionValueIds: [ids.dog], sku: "RUG-60X90", priceCad: "69", compareAtPriceCad: "", stockQty: "2", isActive: true },
      ],
    };
    const optionless = {
      options: [],
      variants: [{ id: "50000000-0000-4000-8000-000000000007", optionValueIds: [], sku: "DECOR-SINGLE", priceCad: "18", compareAtPriceCad: "", stockQty: "6", isActive: true }],
    };
    expect(parseVariantConfiguration(JSON.stringify(rug)).success).toBe(true);
    expect(parseVariantConfiguration(JSON.stringify(optionless)).success).toBe(true);
  });

  it("rejects duplicate combinations and an incomplete Cartesian matrix", () => {
    const configuration = mugConfiguration();
    configuration.variants[3].optionValueIds = [ids.cat, ids.cream];
    const result = parseVariantConfiguration(JSON.stringify(configuration));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors["variants.3.combination"]).toContain("重复");
      expect(result.fieldErrors.variants).toContain("同步");
    }
  });

  it("rejects duplicate SKU regardless of case", () => {
    const configuration = mugConfiguration();
    configuration.variants[1].sku = "mug-cat-cream";
    const result = parseVariantConfiguration(JSON.stringify(configuration));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors["variants.1.sku"]).toContain("不能重复");
  });

  it("rejects negative inventory, zero price, and compare-at price not above price", () => {
    const configuration = mugConfiguration();
    configuration.variants[0].stockQty = "-1";
    configuration.variants[1].priceCad = "0";
    configuration.variants[2].compareAtPriceCad = "20";
    const result = parseVariantConfiguration(JSON.stringify(configuration));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors["variants.0.stockQty"]).toContain("非负整数");
      expect(result.fieldErrors["variants.1.priceCad"]).toContain("大于 0");
      expect(result.fieldErrors["variants.2.compareAtPriceCad"]).toContain("高于");
    }
  });

  it("rejects duplicate option and value labels", () => {
    const configuration = mugConfiguration();
    configuration.options[1].label = " 款式 ";
    configuration.options[0].values[1].label = "猫猫";
    const result = parseVariantConfiguration(JSON.stringify(configuration));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors["options.1.label"]).toContain("不能重复");
      expect(result.fieldErrors["options.0.values.1.label"]).toContain("重复");
    }
  });

  it("accepts a valid sale window and rejects a window without compare-at price", () => {
    const valid = mugConfiguration();
    Object.assign(valid.variants[1], {
      saleStartsAt: "2026-07-15T17:00:00.000Z",
      saleEndsAt: "2026-07-20T17:00:00.000Z",
    });
    expect(parseVariantConfiguration(JSON.stringify(valid)).success).toBe(true);

    const invalid = mugConfiguration();
    Object.assign(invalid.variants[0], {
      saleStartsAt: "2026-07-20T17:00:00.000Z",
      saleEndsAt: "2026-07-15T17:00:00.000Z",
    });
    const result = parseVariantConfiguration(JSON.stringify(invalid));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors["variants.0.saleWindow"]).toContain("原价");
      expect(result.fieldErrors["variants.0.saleEndsAt"]).toContain("晚于");
    }
  });
});
