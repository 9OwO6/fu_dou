import { describe, expect, it } from "vitest";

import { parseOrderRequestForm } from "@/lib/orders/validation";

function validForm() {
  const form = new FormData();
  form.set("customerName", " 测试顾客 ");
  form.set("email", "CUSTOMER@EXAMPLE.COM");
  form.set("preferredContact", "email");
  form.set("fulfillmentMethod", "pickup");
  form.set("cityOrArea", "Vancouver");
  form.set("consent", "on");
  form.set("cartItems", JSON.stringify([{ variantId: "50000000-0000-4000-8000-000000000001", quantity: 2 }]));
  return form;
}

describe("parseOrderRequestForm", () => {
  it("normalizes a valid pickup request and keeps only variant IDs and quantities", () => {
    const result = parseOrderRequestForm(validForm());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.values.customerName).toBe("测试顾客");
    expect(result.values.email).toBe("customer@example.com");
    expect(result.values.items).toEqual([{ variant_id: "50000000-0000-4000-8000-000000000001", quantity: 2 }]);
  });

  it("requires phone for phone contact and postal code for local delivery", () => {
    const form = validForm();
    form.set("preferredContact", "phone");
    form.set("fulfillmentMethod", "local_delivery");
    const result = parseOrderRequestForm(form);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.phone).toBeTruthy();
    expect(result.fieldErrors.postalCode).toBeTruthy();
  });

  it("rejects duplicate variants, invalid quantities, and missing consent", () => {
    const form = validForm();
    form.delete("consent");
    form.set("cartItems", JSON.stringify([
      { variantId: "50000000-0000-4000-8000-000000000001", quantity: 1 },
      { variantId: "50000000-0000-4000-8000-000000000001", quantity: 100 },
    ]));
    const result = parseOrderRequestForm(form);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.cart).toBeTruthy();
    expect(result.fieldErrors.consent).toBeTruthy();
  });

  it("detects the honeypot independently of normal validation", () => {
    const form = validForm();
    form.set("companyWebsite", "https://spam.invalid");
    const result = parseOrderRequestForm(form);
    expect(result.honeypotFilled).toBe(true);
  });
});
