export const CART_STORAGE_KEY = "happy-beans-cart";
export const CART_SCHEMA_VERSION = 1;
export const MAX_CART_ITEMS = 100;
export const MAX_ITEM_QUANTITY = 99;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredCartItem = {
  variantId: string;
  quantity: number;
  lastValidatedPriceCad?: number;
};

export type StoredCart = {
  version: typeof CART_SCHEMA_VERSION;
  items: StoredCartItem[];
};

export type CartValidationInput = {
  variantId: string;
  quantity: number;
  previousPriceCad?: number;
};

export function emptyCart(): StoredCart {
  return { version: CART_SCHEMA_VERSION, items: [] };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseStoredItem(value: unknown): StoredCartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!isUuid(item.variantId) || !Number.isInteger(item.quantity) || Number(item.quantity) < 1) return null;
  return {
    variantId: item.variantId,
    quantity: Math.min(Number(item.quantity), MAX_ITEM_QUANTITY),
    ...(isValidPrice(item.lastValidatedPriceCad)
      ? { lastValidatedPriceCad: item.lastValidatedPriceCad }
      : {}),
  };
}

export function parseStoredCart(raw: string | null): { cart: StoredCart; recovered: boolean } {
  if (raw === null) return { cart: emptyCart(), recovered: false };
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return { cart: emptyCart(), recovered: true };
    const record = value as Record<string, unknown>;
    if (record.version !== CART_SCHEMA_VERSION || !Array.isArray(record.items)) {
      return { cart: emptyCart(), recovered: true };
    }

    const byVariant = new Map<string, StoredCartItem>();
    let recovered = record.items.length > MAX_CART_ITEMS;
    for (const candidate of record.items.slice(0, MAX_CART_ITEMS)) {
      const item = parseStoredItem(candidate);
      if (!item) {
        recovered = true;
        continue;
      }
      const existing = byVariant.get(item.variantId);
      if (existing) {
        existing.quantity = Math.min(existing.quantity + item.quantity, MAX_ITEM_QUANTITY);
        existing.lastValidatedPriceCad = item.lastValidatedPriceCad ?? existing.lastValidatedPriceCad;
        recovered = true;
      } else {
        byVariant.set(item.variantId, item);
      }
    }
    return { cart: { version: CART_SCHEMA_VERSION, items: [...byVariant.values()] }, recovered };
  } catch {
    return { cart: emptyCart(), recovered: true };
  }
}

export function parseCartValidationInput(value: unknown): CartValidationInput[] {
  if (!Array.isArray(value) || value.length > MAX_CART_ITEMS) return [];
  const seen = new Set<string>();
  const result: CartValidationInput[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (
      !isUuid(item.variantId)
      || seen.has(item.variantId)
      || !Number.isInteger(item.quantity)
      || Number(item.quantity) < 1
      || Number(item.quantity) > MAX_ITEM_QUANTITY
    ) continue;
    seen.add(item.variantId);
    result.push({
      variantId: item.variantId,
      quantity: Number(item.quantity),
      ...(isValidPrice(item.previousPriceCad) ? { previousPriceCad: item.previousPriceCad } : {}),
    });
  }
  return result;
}
