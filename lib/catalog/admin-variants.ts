import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { VariantConfiguration } from "./variant-validation";

type Translation = { locale: string; name?: string; label?: string };

export async function getAdminVariantConfiguration(productId: string): Promise<VariantConfiguration> {
  const supabase = await createSupabaseServerClient();
  const [optionsResult, variantsResult] = await Promise.all([
    supabase
      .from("product_options")
      .select("id, sort_order, product_option_translations(locale, name), product_option_values(id, sort_order, product_option_value_translations(locale, label))")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, sku, price_cad, compare_at_price_cad, sale_starts_at, sale_ends_at, stock_qty, is_active, variant_option_values(option_value_id)")
      .eq("product_id", productId)
      .order("created_at", { ascending: true }),
  ]);

  if (optionsResult.error || variantsResult.error) throw new Error("规格、价格和库存暂时无法加载。");

  const options = (optionsResult.data ?? []).map((option) => {
    const translation = (option.product_option_translations as Translation[]).find((item) => item.locale === "zh");
    const rawValues = option.product_option_values as Array<{
      id: string;
      sort_order: number;
      product_option_value_translations: Translation[];
    }>;
    return {
      id: option.id,
      label: translation?.name ?? "",
      values: [...rawValues]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          id: item.id,
          label: item.product_option_value_translations.find((translationItem) => translationItem.locale === "zh")?.label ?? "",
        })),
    };
  });

  const variants = (variantsResult.data ?? []).map((variant) => ({
    id: variant.id,
    optionValueIds: (variant.variant_option_values as Array<{ option_value_id: string }>).map((item) => item.option_value_id),
    sku: variant.sku,
    priceCad: String(variant.price_cad),
    compareAtPriceCad: variant.compare_at_price_cad === null ? "" : String(variant.compare_at_price_cad),
    saleStartsAt: variant.sale_starts_at ?? "",
    saleEndsAt: variant.sale_ends_at ?? "",
    stockQty: String(variant.stock_qty),
    isActive: variant.is_active,
  }));

  return { options, variants };
}
