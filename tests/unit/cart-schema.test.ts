import { describe, expect, it } from "vitest";

import { CART_SCHEMA_VERSION, parseCartValidationInput, parseStoredCart } from "@/lib/cart/schema";

const variantId = "11111111-1111-4111-8111-111111111111";

describe("购物车本地 schema", () => {
  it("读取有效数据并保留服务端上次确认的价格", () => {
    const result = parseStoredCart(JSON.stringify({
      version: CART_SCHEMA_VERSION,
      items: [{ variantId, quantity: 2, lastValidatedPriceCad: 18.99 }],
    }));
    expect(result).toEqual({ cart: { version: 1, items: [{ variantId, quantity: 2, lastValidatedPriceCad: 18.99 }] }, recovered: false });
  });

  it("损坏 JSON、未知版本和非法条目均安全恢复", () => {
    expect(parseStoredCart("{").recovered).toBe(true);
    expect(parseStoredCart(JSON.stringify({ version: 99, items: [] })).cart.items).toEqual([]);
    expect(parseStoredCart(JSON.stringify({ version: 1, items: [{ variantId: "bad", quantity: -1 }] }))).toEqual({ cart: { version: 1, items: [] }, recovered: true });
  });

  it("合并重复规格并限制数量", () => {
    const result = parseStoredCart(JSON.stringify({ version: 1, items: [
      { variantId, quantity: 70 },
      { variantId, quantity: 70 },
    ] }));
    expect(result.cart.items).toEqual([{ variantId, quantity: 99 }]);
    expect(result.recovered).toBe(true);
  });
});

describe("购物车服务端输入", () => {
  it("只接受唯一、有效且受限的规格与数量", () => {
    expect(parseCartValidationInput([
      { variantId, quantity: 3, previousPriceCad: 12.5 },
      { variantId, quantity: 4 },
      { variantId: "bad", quantity: 1 },
    ])).toEqual([{ variantId, quantity: 3, previousPriceCad: 12.5 }]);
  });
});
