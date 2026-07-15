import type { AppLocale } from "@/lib/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProductRow = {
  id: string;
  slug: string;
  published_at: string;
  is_featured: boolean;
};

type TranslationRow = {
  product_id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

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

type ImageRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  storage_path: string;
  alt_text: string;
  sort_order: number;
};

type ImageTranslationRow = {
  image_id: string;
  alt_text: string;
};

type OptionRow = {
  id: string;
  product_id: string;
};

type OptionTranslationRow = {
  option_id: string;
};

type OptionValueRow = {
  id: string;
  option_id: string;
};

type OptionValueTranslationRow = {
  option_value_id: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  sort_order: number;
};

type CategoryTranslationRow = {
  category_id: string;
  name: string;
  description: string | null;
};

type CategoryLinkRow = {
  product_id: string;
  category_id: string;
  sort_order: number;
};

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type PublicProductImage = {
  id: string;
  variantId: string | null;
  url: string | null;
  alt: string;
  sortOrder: number;
};

export type PublicVariant = {
  id: string;
  sku: string;
  priceCad: number;
  compareAtPriceCad: number | null;
  stockQty: number;
  optionValueIds: string[];
  isOnSale: boolean;
};

export type PublicOptionValue = {
  id: string;
  label: string;
  colorSwatch: string | null;
  sortOrder: number;
};

export type PublicProductOption = {
  id: string;
  name: string;
  sortOrder: number;
  values: PublicOptionValue[];
};

export type PublicProduct = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string;
  newFrom: string | null;
  isFeatured: boolean;
  categories: PublicCategory[];
  images: PublicProductImage[];
  variants: PublicVariant[];
  options: PublicProductOption[];
  minimumPrice: number;
  maximumPrice: number;
  compareAtPrice: number | null;
  hasStock: boolean;
  isOnSale: boolean;
};

export type CatalogFilters = {
  query?: string;
  category?: string;
  stock?: "all" | "in";
  sale?: boolean;
  sort?: "new" | "price-asc" | "price-desc";
};

function saleIsActive(variant: VariantRow, now: number) {
  if (variant.compare_at_price_cad === null) return false;
  if (variant.sale_starts_at && Date.parse(variant.sale_starts_at) > now) return false;
  if (variant.sale_ends_at && Date.parse(variant.sale_ends_at) < now) return false;
  return true;
}

async function signImagePaths(rows: ImageRow[]) {
  if (rows.length === 0) return new Map<string, string>();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("product-images")
    .createSignedUrls(rows.map((row) => row.storage_path), 60 * 60);
  if (error || !data) return new Map<string, string>();
  return new Map(
    rows.map((row, index) => [row.storage_path, data[index]?.signedUrl ?? ""]),
  );
}

export async function listPublicCategories(locale: AppLocale): Promise<PublicCategory[]> {
  const supabase = await createSupabaseServerClient();
  const [categoriesResult, translationsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, slug, sort_order")
      .eq("is_visible", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("category_translations")
      .select("category_id, name, description")
      .eq("locale", locale),
  ]);

  if (categoriesResult.error || translationsResult.error) {
    throw new Error("公开分类暂时无法加载。");
  }
  const translations = new Map(
    (translationsResult.data as CategoryTranslationRow[] | null)?.map((row) => [row.category_id, row]) ?? [],
  );
  return ((categoriesResult.data ?? []) as CategoryRow[]).flatMap((row) => {
    const translation = translations.get(row.id);
    return translation
      ? [{
          id: row.id,
          slug: row.slug,
          name: translation.name,
          description: translation.description ?? "",
          sortOrder: row.sort_order,
        }]
      : [];
  });
}

async function loadPublicProductRows(locale: AppLocale) {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const productsResult = await supabase
    .from("products")
    .select("id, slug, published_at, is_featured")
    .eq("status", "published")
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .order("published_at", { ascending: false });
  if (productsResult.error) throw new Error("公开商品暂时无法加载。");
  const products = (productsResult.data ?? []) as ProductRow[];
  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) {
    return { products, translations: [], variants: [], images: [], imageTranslations: [], options: [], optionTranslations: [], optionValues: [], optionValueTranslations: [], categoryLinks: [] };
  }

  const [translationsResult, variantsResult, imagesResult, imageTranslationsResult, optionsResult, optionTranslationsResult, optionValuesResult, optionValueTranslationsResult, linksResult] = await Promise.all([
    supabase
      .from("product_translations")
      .select("product_id, title, short_description, description, seo_title, seo_description")
      .eq("locale", locale)
      .in("product_id", productIds),
    supabase
      .from("product_variants")
      .select("id, product_id, sku, price_cad, compare_at_price_cad, stock_qty, sale_starts_at, sale_ends_at")
      .eq("is_active", true)
      .in("product_id", productIds),
    supabase
      .from("product_images")
      .select("id, product_id, variant_id, storage_path, alt_text, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_image_translations")
      .select("image_id, alt_text")
      .eq("locale", locale),
    supabase
      .from("product_options")
      .select("id, product_id")
      .in("product_id", productIds),
    supabase
      .from("product_option_translations")
      .select("option_id")
      .eq("locale", locale),
    supabase
      .from("product_option_values")
      .select("id, option_id"),
    supabase
      .from("product_option_value_translations")
      .select("option_value_id")
      .eq("locale", locale),
    supabase
      .from("product_categories")
      .select("product_id, category_id, sort_order")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true }),
  ]);

  if (translationsResult.error || variantsResult.error || imagesResult.error || imageTranslationsResult.error || optionsResult.error || optionTranslationsResult.error || optionValuesResult.error || optionValueTranslationsResult.error || linksResult.error) {
    const failedQuery = [
      ["translations", translationsResult.error],
      ["variants", variantsResult.error],
      ["images", imagesResult.error],
      ["imageTranslations", imageTranslationsResult.error],
      ["options", optionsResult.error],
      ["optionTranslations", optionTranslationsResult.error],
      ["optionValues", optionValuesResult.error],
      ["optionValueTranslations", optionValueTranslationsResult.error],
      ["links", linksResult.error],
    ].find(([, error]) => error);
    throw new Error(`公开商品资料暂时无法加载（${failedQuery?.[0] ?? "unknown"}）。`);
  }
  return {
    products,
    translations: (translationsResult.data ?? []) as TranslationRow[],
    variants: (variantsResult.data ?? []) as VariantRow[],
    images: (imagesResult.data ?? []) as ImageRow[],
    imageTranslations: (imageTranslationsResult.data ?? []) as ImageTranslationRow[],
    options: (optionsResult.data ?? []) as OptionRow[],
    optionTranslations: (optionTranslationsResult.data ?? []) as OptionTranslationRow[],
    optionValues: (optionValuesResult.data ?? []) as OptionValueRow[],
    optionValueTranslations: (optionValueTranslationsResult.data ?? []) as OptionValueTranslationRow[],
    categoryLinks: (linksResult.data ?? []) as CategoryLinkRow[],
  };
}

export async function listPublicProducts(
  locale: AppLocale,
  filters: CatalogFilters = {},
): Promise<PublicProduct[]> {
  const { products, translations, variants, images, imageTranslations, options, optionTranslations, optionValues, optionValueTranslations, categoryLinks } = await loadPublicProductRows(locale);
  const [categories, signedUrls] = await Promise.all([
    listPublicCategories(locale),
    signImagePaths(images),
  ]);
  const translationsByProduct = new Map(translations.map((row) => [row.product_id, row]));
  const imageAltById = new Map(imageTranslations.map((row) => [row.image_id, row.alt_text]));
  const translatedOptionIds = new Set(optionTranslations.map((row) => row.option_id));
  const translatedValueIds = new Set(optionValueTranslations.map((row) => row.option_value_id));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const now = Date.now();

  let result = products.flatMap((product): PublicProduct[] => {
    const translation = translationsByProduct.get(product.id);
    const productVariants = variants.filter((variant) => variant.product_id === product.id);
    if (!translation || productVariants.length === 0) return [];
    const productOptions = options.filter((option) => option.product_id === product.id);
    const productOptionIds = new Set(productOptions.map((option) => option.id));
    const productOptionValues = optionValues.filter((value) => productOptionIds.has(value.option_id));
    const productImages = images.filter((image) => image.product_id === product.id);
    if (locale === "en" && (
      productOptions.some((option) => !translatedOptionIds.has(option.id))
      || productOptionValues.some((value) => !translatedValueIds.has(value.id))
      || productImages.some((image) => !imageAltById.get(image.id)?.trim())
    )) return [];
    const mappedVariants = productVariants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      priceCad: Number(variant.price_cad),
      compareAtPriceCad: variant.compare_at_price_cad === null ? null : Number(variant.compare_at_price_cad),
      stockQty: variant.stock_qty,
      optionValueIds: [],
      isOnSale: saleIsActive(variant, now),
    }));
    const prices = mappedVariants.map((variant) => variant.priceCad);
    const saleComparePrices = mappedVariants
      .filter((variant) => variant.isOnSale && variant.compareAtPriceCad !== null)
      .map((variant) => variant.compareAtPriceCad as number);
    const productCategories = categoryLinks
      .filter((link) => link.product_id === product.id)
      .flatMap((link) => categoriesById.get(link.category_id) ?? []);
    return [{
      id: product.id,
      slug: product.slug,
      title: translation.title,
      shortDescription: translation.short_description ?? "",
      description: translation.description ?? "",
      seoTitle: translation.seo_title ?? "",
      seoDescription: translation.seo_description ?? "",
      publishedAt: product.published_at,
      newFrom: product.published_at,
      isFeatured: product.is_featured,
      categories: productCategories,
      images: productImages
        .map((image) => ({
          id: image.id,
          variantId: image.variant_id,
          url: signedUrls.get(image.storage_path) || null,
          alt: locale === "en" ? imageAltById.get(image.id)! : image.alt_text,
          sortOrder: image.sort_order,
        })),
      variants: mappedVariants,
      options: [],
      minimumPrice: Math.min(...prices),
      maximumPrice: Math.max(...prices),
      compareAtPrice: saleComparePrices.length > 0 ? Math.max(...saleComparePrices) : null,
      hasStock: mappedVariants.some((variant) => variant.stockQty > 0),
      isOnSale: mappedVariants.some((variant) => variant.isOnSale),
    }];
  });

  const query = filters.query?.trim().toLocaleLowerCase("zh-CN");
  if (query) {
    result = result.filter((product) =>
      `${product.title} ${product.shortDescription}`.toLocaleLowerCase("zh-CN").includes(query),
    );
  }
  if (filters.category) {
    result = result.filter((product) => product.categories.some((category) => category.slug === filters.category));
  }
  if (filters.stock === "in") result = result.filter((product) => product.hasStock);
  if (filters.sale) result = result.filter((product) => product.isOnSale);
  if (filters.sort === "price-asc") result.sort((a, b) => a.minimumPrice - b.minimumPrice);
  if (filters.sort === "price-desc") result.sort((a, b) => b.minimumPrice - a.minimumPrice);
  return result;
}

export async function getPublicProduct(locale: AppLocale, slug: string): Promise<PublicProduct | null> {
  const products = await listPublicProducts(locale);
  const product = products.find((item) => item.slug === slug);
  if (!product) return null;

  const supabase = await createSupabaseServerClient();
  const [optionsResult, optionTranslationsResult, valuesResult, valueTranslationsResult, linksResult] = await Promise.all([
    supabase.from("product_options").select("id, sort_order").eq("product_id", product.id).order("sort_order"),
    supabase.from("product_option_translations").select("option_id, name").eq("locale", locale),
    supabase.from("product_option_values").select("id, option_id, color_swatch, sort_order").order("sort_order"),
    supabase.from("product_option_value_translations").select("option_value_id, label").eq("locale", locale),
    supabase.from("variant_option_values").select("variant_id, option_value_id").in("variant_id", product.variants.map((variant) => variant.id)),
  ]);
  if (
    optionsResult.error
    || optionTranslationsResult.error
    || valuesResult.error
    || valueTranslationsResult.error
    || linksResult.error
  ) {
    throw new Error("商品规格暂时无法加载。");
  }

  const optionNames = new Map((optionTranslationsResult.data ?? []).map((row) => [row.option_id, row.name]));
  const valueLabels = new Map((valueTranslationsResult.data ?? []).map((row) => [row.option_value_id, row.label]));
  const values = valuesResult.data ?? [];
  const optionIds = new Set((optionsResult.data ?? []).map((option) => option.id));
  if ((optionsResult.data ?? []).some((option) => !optionNames.get(option.id))
    || values.some((value) => optionIds.has(value.option_id) && !valueLabels.get(value.id))) return null;
  const options: PublicProductOption[] = (optionsResult.data ?? []).map((option) => ({
    id: option.id,
    name: optionNames.get(option.id)!,
    sortOrder: option.sort_order,
    values: values
      .filter((value) => value.option_id === option.id)
      .map((value) => ({
        id: value.id,
        label: valueLabels.get(value.id)!,
        colorSwatch: value.color_swatch,
        sortOrder: value.sort_order,
      })),
  }));
  const variantLinks = linksResult.data ?? [];
  return {
    ...product,
    options,
    variants: product.variants.map((variant) => ({
      ...variant,
      optionValueIds: variantLinks
        .filter((link) => link.variant_id === variant.id)
        .map((link) => link.option_value_id),
    })),
  };
}

export function collectionMatches(product: PublicProduct, slug: "new" | "featured" | "sale") {
  if (slug === "featured") return product.isFeatured;
  if (slug === "sale") return product.isOnSale;
  const availableFrom = product.newFrom ?? product.publishedAt;
  return Date.parse(availableFrom) <= Date.now();
}
