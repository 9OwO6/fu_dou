import { describe, expect, it } from "vitest";

import { homepageSectionTypes, parseHomepageForm } from "@/lib/homepage/schema";

function validForm() {
  const form = new FormData();
  homepageSectionTypes.forEach((type, index) => {
    const prefix = `section.${type}`;
    form.set(`${prefix}.enabled`, "on");
    form.set(`${prefix}.sortOrder`, String((index + 1) * 10));
    if (type !== "announcement") form.set(`${prefix}.heading`, `${type} 标题`);
    form.set(`${prefix}.body`, type === "announcement" ? "公告" : `${type} 说明`);
    if (type === "hero" || type === "brand_story") form.set(`${prefix}.imageId`, "");
    if (type === "new_products" || type === "featured_products" || type === "sale_products") {
      form.set(`${prefix}.selectionMode`, "automatic");
      form.set(`${prefix}.limit`, "4");
    }
    if (type === "fulfillment") {
      form.set(`${prefix}.pickupTitle`, "自取");
      form.set(`${prefix}.pickupBody`, "自取说明");
      form.set(`${prefix}.deliveryTitle`, "配送");
      form.set(`${prefix}.deliveryBody`, "配送说明");
    }
    if (type === "faq") {
      form.set(`${prefix}.faq.0.question`, "可以付款吗？");
      form.set(`${prefix}.faq.0.answer`, "当前只提交订单请求。");
    }
  });
  form.set("site.pickupEnabled", "on");
  form.set("site.localDeliveryEnabled", "on");
  return form;
}

describe("homepage schema", () => {
  it("accepts the complete controlled ten-section payload", () => {
    const parsed = parseHomepageForm(validForm());
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.value.sections).toHaveLength(10);
  });

  it("rejects HTML-like markup in all operator text", () => {
    const form = validForm();
    form.set("section.hero.heading", "<script>alert(1)</script>");
    const parsed = parseHomepageForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.fieldErrors["section.hero.heading"]).toContain("纯文本");
  });

  it("rejects duplicate sort values", () => {
    const form = validForm();
    form.set("section.hero.sortOrder", "10");
    const parsed = parseHomepageForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.fieldErrors["section.hero.sortOrder"]).toContain("不同");
  });

  it("requires products when an enabled section uses manual selection", () => {
    const form = validForm();
    form.set("section.new_products.selectionMode", "manual");
    const parsed = parseHomepageForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.fieldErrors["section.new_products.productIds"]).toContain("至少");
  });

  it("rejects arbitrary CTA destinations", () => {
    const form = validForm();
    form.set("section.hero.ctaHref", "javascript:alert(1)");
    const parsed = parseHomepageForm(form);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.fieldErrors["section.hero.ctaHref"]).toContain("受控");
  });
});

