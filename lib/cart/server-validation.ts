import type { AppLocale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CartValidationInput } from "./schema";

type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  price_cad: number;
  compare_at_price_cad: number | null;
  stock_qty: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export type ValidatedCartItem = {
  variantId: string;
  quantity: number;
  status: "valid" | "unavailable";
  priceChanged: boolean;
  product?: {
    slug: string;
    title: string;
    variantLabel: string;
    sku: string;
    unitPriceCad: number;
    compareAtPriceCad: number | null;
    stockQty: number;
    imageUrl: string | null;
    imageAlt: string;
  };
};

function saleIsActive(variant: VariantRow, now: number) {
  if (variant.compare_at_price_cad === null) return false;
  if (variant.sale_starts_at && Date.parse(variant.sale_starts_at) > now) return false;
  if (variant.sale_ends_at && Date.parse(variant.sale_ends_at) < now) return false;
  return true;
}

export async function validateCartItems(
  locale: AppLocale,
  items: CartValidationInput[],
): Promise<ValidatedCartItem[]> {
  if (items.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  const ids = items.map((item) => item.variantId);
  const variantsResult = await supabase
    .from("product_variants")
    .select("id, product_id, sku, price_cad, compare_at_price_cad, stock_qty, sale_starts_at, sale_ends_at")
    .eq("is_active", true)
    .in("id", ids);
  if (variantsResult.error) throw new Error("购物车商品暂时无法重新校验。");
  const variants = (variantsResult.data ?? []) as VariantRow[];
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];
  if (productIds.length === 0) {
    return items.map((item) => ({ ...item, status: "unavailable", priceChanged: false }));
  }

  const [productsResult, translationsResult, linksResult, imagesResult] = await Promise.all([
    supabase.from("products").select("id, slug").in("id", productIds),
    supabase.from("product_translations").select("product_id, title").eq("locale", locale).in("product_id", productIds),
    supabase.from("variant_option_values").select("variant_id, option_value_id").in("variant_id", ids),
    supabase.from("product_images").select("product_id, variant_id, storage_path, alt_text, sort_order").in("product_id", productIds).order("sort_order"),
  ]);
  if (productsResult.error || translationsResult.error || linksResult.error || imagesResult.error) {
    throw new Error("购物车商品暂时无法重新校验。");
  }

  const optionValueIds = (linksResult.data ?? []).map((row) => row.option_value_id);
  const [valuesResult, valueTranslationsResult] = optionValueIds.length > 0
    ? await Promise.all([
        supabase.from("product_option_values").select("id, option_id, sort_order").in("id", optionValueIds),
        supabase.from("product_option_value_translations").select("option_value_id, label").eq("locale", locale).in("option_value_id", optionValueIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (valuesResult.error || valueTranslationsResult.error) throw new Error("购物车规格暂时无法重新校验。");

  const optionIds = [...new Set((valuesResult.data ?? []).map((row) => row.option_id))];
  const [optionsResult, optionTranslationsResult] = optionIds.length > 0
    ? await Promise.all([
        supabase.from("product_options").select("id, sort_order").in("id", optionIds),
        supabase.from("product_option_translations").select("option_id, name").eq("locale", locale).in("option_id", optionIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (optionsResult.error || optionTranslationsResult.error) throw new Error("购物车规格暂时无法重新校验。");

  const productById = new Map((productsResult.data ?? []).map((row) => [row.id, row]));
  const titleByProduct = new Map((translationsResult.data ?? []).map((row) => [row.product_id, row.title]));
  const linksByVariant = new Map<string, string[]>();
  for (const row of linksResult.data ?? []) {
    linksByVariant.set(row.variant_id, [...(linksByVariant.get(row.variant_id) ?? []), row.option_value_id]);
  }
  const valuesById = new Map((valuesResult.data ?? []).map((row) => [row.id, row]));
  const labelByValue = new Map((valueTranslationsResult.data ?? []).map((row) => [row.option_value_id, row.label]));
  const nameByOption = new Map((optionTranslationsResult.data ?? []).map((row) => [row.option_id, row.name]));
  const sortByOption = new Map((optionsResult.data ?? []).map((row) => [row.id, row.sort_order]));
  const images = imagesResult.data ?? [];
  const selectedImages = variants.flatMap((variant) => {
    const image = images.find((row) => row.variant_id === variant.id)
      ?? images.find((row) => row.product_id === variant.product_id && row.variant_id === null);
    return image ? [{ variantId: variant.id, ...image }] : [];
  });
  const signedResult = selectedImages.length > 0
    ? await supabase.storage.from("product-images").createSignedUrls(selectedImages.map((image) => image.storage_path), 60 * 60)
    : { data: [], error: null };
  const imageByVariant = new Map(selectedImages.map((image, index) => [image.variantId, {
    url: signedResult.error ? null : signedResult.data?.[index]?.signedUrl ?? null,
    alt: image.alt_text,
  }]));
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const now = Date.now();

  return items.map((item): ValidatedCartItem => {
    const variant = variantById.get(item.variantId);
    if (!variant) return { ...item, status: "unavailable", priceChanged: false };
    const product = productById.get(variant.product_id);
    const title = titleByProduct.get(variant.product_id);
    if (!product || !title) return { ...item, status: "unavailable", priceChanged: false };

    const variantLabel = (linksByVariant.get(variant.id) ?? [])
      .map((valueId) => valuesById.get(valueId))
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
      .sort((a, b) => (sortByOption.get(a.option_id) ?? 0) - (sortByOption.get(b.option_id) ?? 0) || a.sort_order - b.sort_order)
      .map((value) => `${nameByOption.get(value.option_id) ?? "规格"}：${labelByValue.get(value.id) ?? "未命名"}`)
      .join(" / ") || "默认规格";
    const unitPriceCad = Number(variant.price_cad);
    const onSale = saleIsActive(variant, now);
    const image = imageByVariant.get(variant.id);
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      status: "valid",
      priceChanged: item.previousPriceCad !== undefined && item.previousPriceCad !== unitPriceCad,
      product: {
        slug: product.slug,
        title,
        variantLabel,
        sku: variant.sku,
        unitPriceCad,
        compareAtPriceCad: onSale && variant.compare_at_price_cad !== null ? Number(variant.compare_at_price_cad) : null,
        stockQty: variant.stock_qty,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt ?? title,
      },
    };
  });
}
