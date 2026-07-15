import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { ProductStatus } from "./admin-validation";

type TranslationRow = {
  locale: string;
  title?: string;
  name?: string;
  short_description?: string | null;
  description?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export type AdminProductSummary = {
  id: string;
  slug: string;
  status: ProductStatus;
  publishedAt: string | null;
  updatedAt: string;
  title: string;
  titleEn: string;
  hasEnglishContent: boolean;
};

export type AdminProductDetail = AdminProductSummary & {
  isFeatured: boolean;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  shortDescriptionEn: string;
  descriptionEn: string;
  seoTitleEn: string;
  seoDescriptionEn: string;
};

export type AdminCategory = {
  id: string;
  slug: string;
  sortOrder: number;
  isVisible: boolean;
  name: string;
  description: string;
  nameEn: string;
  descriptionEn: string;
};

export type AdminProductCategorySelection = {
  categories: AdminCategory[];
  selectedIds: string[];
};

function translationFor(value: TranslationRow[] | null | undefined, locale: "en" | "zh") {
  return value?.find((translation) => translation.locale === locale) ?? null;
}

export async function listAdminProducts(filters: { query: string; status: string }) {
  const supabase = await createSupabaseServerClient();
  let request = supabase
    .from("products")
    .select("id, slug, status, published_at, updated_at, product_translations(locale, title)")
    .order("updated_at", { ascending: false });

  if (filters.status === "draft" || filters.status === "published" || filters.status === "archived") {
    request = request.eq("status", filters.status);
  }

  const { data, error } = await request;
  if (error) throw new Error("商品列表暂时无法加载。");

  const products: AdminProductSummary[] = (data ?? []).map((row) => {
    const translations = row.product_translations as TranslationRow[];
    const translation = translationFor(translations, "zh");
    const english = translationFor(translations, "en");
    return {
      id: row.id,
      slug: row.slug,
      status: row.status as ProductStatus,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      title: translation?.title ?? "未填写中文标题",
      titleEn: english?.title ?? "",
      hasEnglishContent: Boolean(english?.title),
    };
  });

  const query = filters.query.trim().toLocaleLowerCase("zh-CN");
  return query
    ? products.filter((product) =>
        product.slug.toLowerCase().includes(query)
        || product.title.toLocaleLowerCase("zh-CN").includes(query)
        || product.titleEn.toLocaleLowerCase("en-CA").includes(query),
      )
    : products;
}

export async function getAdminProduct(productId: string): Promise<AdminProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, status, published_at, is_featured, updated_at, product_translations(locale, title, short_description, description, seo_title, seo_description)")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw new Error("商品暂时无法加载。");
  if (!data) return null;

  const translations = data.product_translations as TranslationRow[];
  const translation = translationFor(translations, "zh");
  const english = translationFor(translations, "en");
  return {
    id: data.id,
    slug: data.slug,
    status: data.status as ProductStatus,
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
    isFeatured: data.is_featured,
    title: translation?.title ?? "",
    titleEn: english?.title ?? "",
    hasEnglishContent: Boolean(english?.title),
    shortDescription: translation?.short_description ?? "",
    description: translation?.description ?? "",
    seoTitle: translation?.seo_title ?? "",
    seoDescription: translation?.seo_description ?? "",
    shortDescriptionEn: english?.short_description ?? "",
    descriptionEn: english?.description ?? "",
    seoTitleEn: english?.seo_title ?? "",
    seoDescriptionEn: english?.seo_description ?? "",
  };
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, sort_order, is_visible, category_translations(locale, name, description)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("分类列表暂时无法加载。");
  return (data ?? []).map((row) => {
    const translations = row.category_translations as TranslationRow[];
    const translation = translationFor(translations, "zh");
    const english = translationFor(translations, "en");
    return {
      id: row.id,
      slug: row.slug,
      sortOrder: row.sort_order,
      isVisible: row.is_visible,
      name: translation?.name ?? "未填写中文名称",
      description: translation?.description ?? "",
      nameEn: english?.name ?? "",
      descriptionEn: english?.description ?? "",
    };
  });
}

export async function getAdminProductCategorySelection(
  productId: string,
): Promise<AdminProductCategorySelection> {
  const supabase = await createSupabaseServerClient();
  const [categories, linksResult] = await Promise.all([
    listAdminCategories(),
    supabase
      .from("product_categories")
      .select("category_id, sort_order")
      .eq("product_id", productId)
      .order("sort_order", { ascending: true }),
  ]);

  if (linksResult.error) throw new Error("商品分类暂时无法加载。");
  return {
    categories,
    selectedIds: (linksResult.data ?? []).map((link) => link.category_id),
  };
}
