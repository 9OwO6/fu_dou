import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/lib/i18n/config";

import { SHOWCASE_IMAGE_BUCKET } from "./validation";

type Translation = { locale: string; title?: string | null; description?: string | null; name?: string | null; alt_text?: string | null };
type RawTag = { id: string; slug: string; is_visible: boolean; sort_order: number; showcase_tag_translations: Translation[] };
type RawImage = { id: string; storage_path: string; sort_order: number; width: number | null; height: number | null; showcase_image_translations: Translation[] };
type RawItem = {
  id: string;
  short_code: string;
  availability: "inquiry" | "sold" | "archived";
  price_cad: number | string | null;
  created_at: string;
  showcase_batches: { published_at: string } | null;
  showcase_item_translations: Translation[];
  showcase_item_images: RawImage[];
  showcase_item_tags: Array<{ tag_id: string; showcase_tags: RawTag | null }>;
};

export type ShowcaseTag = { id: string; slug: string; name: string; nameZh: string; nameEn: string; sortOrder: number };
export type ShowcaseImage = { id: string; signedUrl: string; altText: string; sortOrder: number; width: number | null; height: number | null };

export type PublicShowcaseItem = {
  id: string;
  shortCode: string;
  availability: "inquiry" | "sold";
  priceCad: number | null;
  title: string | null;
  description: string | null;
  publishedAt: string;
  tags: ShowcaseTag[];
  images: ShowcaseImage[];
};

export type AdminShowcaseItem = Omit<PublicShowcaseItem, "availability"> & {
  availability: "inquiry" | "sold" | "archived";
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
};

function translation(items: Translation[], locale: AppLocale) {
  return items.find((item) => item.locale === locale);
}

function fallbackTagName(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function mapTag(tag: RawTag, locale: AppLocale): ShowcaseTag {
  const zh = translation(tag.showcase_tag_translations, "zh")?.name ?? "";
  const en = translation(tag.showcase_tag_translations, "en")?.name ?? "";
  return {
    id: tag.id,
    slug: tag.slug,
    name: (locale === "zh" ? zh : en) || fallbackTagName(tag.slug),
    nameZh: zh,
    nameEn: en,
    sortOrder: tag.sort_order,
  };
}

async function signedUrlMap(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(SHOWCASE_IMAGE_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw new Error("快速上新图片暂时无法加载。");
  return new Map(paths.map((path, index) => [path, data[index]?.signedUrl ?? ""]));
}

function mapImages(raw: RawImage[], locale: AppLocale, urls: Map<string, string>): ShowcaseImage[] {
  return [...raw]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      signedUrl: urls.get(image.storage_path) ?? "",
      altText: translation(image.showcase_image_translations, locale)?.alt_text ?? "Happy Beans",
      sortOrder: image.sort_order,
      width: image.width,
      height: image.height,
    }));
}

const itemSelect = `
  id, short_code, availability, price_cad, created_at,
  showcase_batches(published_at),
  showcase_item_translations(locale, title, description),
  showcase_item_images(id, storage_path, sort_order, width, height, showcase_image_translations(locale, alt_text)),
  showcase_item_tags(tag_id, showcase_tags(id, slug, is_visible, sort_order, showcase_tag_translations(locale, name)))
`;

export async function listShowcaseTags(locale: AppLocale, includeHidden = false): Promise<ShowcaseTag[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("showcase_tags")
    .select("id, slug, is_visible, sort_order, showcase_tag_translations(locale, name)")
    .order("sort_order", { ascending: true });
  if (!includeHidden) query = query.eq("is_visible", true);
  const { data, error } = await query;
  if (error) throw new Error("快速上新标签暂时无法加载。");
  return (data as unknown as RawTag[]).map((tag) => mapTag(tag, locale));
}

export async function listPublicShowcaseItems(locale: AppLocale): Promise<PublicShowcaseItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("showcase_items")
    .select(itemSelect)
    .neq("availability", "archived")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("新鲜到店暂时无法加载。");
  const rows = data as unknown as RawItem[];
  const paths = rows.flatMap((item) => item.showcase_item_images.map((image) => image.storage_path));
  const urls = await signedUrlMap(paths);
  return rows.map((item) => {
    const localized = translation(item.showcase_item_translations, locale);
    return {
      id: item.id,
      shortCode: item.short_code,
      availability: item.availability === "sold" ? "sold" : "inquiry",
      priceCad: item.price_cad === null ? null : Number(item.price_cad),
      title: localized?.title ?? null,
      description: localized?.description ?? null,
      publishedAt: item.showcase_batches?.published_at ?? item.created_at,
      tags: item.showcase_item_tags
        .map((link) => link.showcase_tags)
        .filter((tag): tag is RawTag => Boolean(tag?.is_visible))
        .map((tag) => mapTag(tag, locale))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      images: mapImages(item.showcase_item_images, locale, urls),
    };
  });
}

export async function listAdminShowcaseItems(): Promise<AdminShowcaseItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("showcase_items")
    .select(itemSelect)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("快速上新管理资料暂时无法加载。");
  const rows = data as unknown as RawItem[];
  const paths = rows.flatMap((item) => item.showcase_item_images.map((image) => image.storage_path));
  const urls = await signedUrlMap(paths);
  return rows.map((item) => {
    const zh = translation(item.showcase_item_translations, "zh");
    const en = translation(item.showcase_item_translations, "en");
    return {
      id: item.id,
      shortCode: item.short_code,
      availability: item.availability,
      priceCad: item.price_cad === null ? null : Number(item.price_cad),
      title: zh?.title ?? null,
      description: zh?.description ?? null,
      titleZh: zh?.title ?? "",
      titleEn: en?.title ?? "",
      descriptionZh: zh?.description ?? "",
      descriptionEn: en?.description ?? "",
      publishedAt: item.showcase_batches?.published_at ?? item.created_at,
      tags: item.showcase_item_tags
        .map((link) => link.showcase_tags)
        .filter((tag): tag is RawTag => Boolean(tag))
        .map((tag) => mapTag(tag, "zh"))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      images: mapImages(item.showcase_item_images, "zh", urls),
    };
  });
}
