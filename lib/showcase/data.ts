import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/lib/i18n/config";

import { groupPublicShowcaseItems } from "./grouping";
import { SHOWCASE_IMAGE_BUCKET } from "./validation";
import type { ShowcaseDisplayPreset } from "./validation";

type Translation = { locale: string; title?: string | null; description?: string | null; name?: string | null; alt_text?: string | null };
type RawTag = { id: string; slug: string; is_visible: boolean; sort_order: number; showcase_tag_translations: Translation[] };
type RawImage = { id: string; storage_path: string; sort_order: number; width: number | null; height: number | null; showcase_image_translations: Translation[] };
type RawItem = {
  id: string;
  short_code: string;
  availability: "inquiry" | "sold" | "archived";
  price_cad: number | string | null;
  created_at: string;
  batch_id: string;
  showcase_batches: {
    id: string;
    published_at: string;
  } | null;
  showcase_item_translations: Translation[];
  showcase_item_images: RawImage[];
  showcase_item_tags: Array<{ tag_id: string; showcase_tags: RawTag | null }>;
};
type RawDisplaySet = {
  id: string;
  presentation_preset: string;
  featured_item_id: string | null;
  showcase_display_set_items: Array<{ item_id: string; sort_order: number }>;
};
type RawStyleGroupMember = {
  item_id: string;
  sort_order: number;
  showcase_style_group_item_translations: Array<{ locale: string; label: string }>;
};
type RawStyleGroup = {
  id: string;
  featured_item_id: string;
  showcase_style_group_translations: Array<{ locale: string; name: string }>;
  showcase_style_group_items: RawStyleGroupMember[];
};

export type ShowcaseTag = { id: string; slug: string; name: string; nameZh: string; nameEn: string; sortOrder: number };
export type ShowcaseImage = { id: string; signedUrl: string; altText: string; sortOrder: number; width: number | null; height: number | null };
export type ShowcaseDisplaySet = {
  id: string | null;
  presentationPreset: ShowcaseDisplayPreset;
  featuredItemId: string;
  itemIds: string[];
  isFallback: boolean;
};
export type ShowcaseStyleGroupMember = {
  itemId: string;
  label: string;
  labelZh: string;
  labelEn: string;
  sortOrder: number;
};
export type ShowcaseStyleGroup = {
  id: string;
  name: string;
  nameZh: string;
  nameEn: string;
  featuredItemId: string;
  members: ShowcaseStyleGroupMember[];
};

export type PublicShowcaseItem = {
  id: string;
  shortCode: string;
  availability: "inquiry" | "sold";
  priceCad: number | null;
  title: string | null;
  description: string | null;
  publishedAt: string;
  batchId: string;
  tags: ShowcaseTag[];
  images: ShowcaseImage[];
  styleGroup: ShowcaseStyleGroup | null;
};

export type AdminShowcaseItem = Omit<PublicShowcaseItem, "availability"> & {
  availability: "inquiry" | "sold" | "archived";
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
};
export type ShowcaseItemEntry = {
  key: string;
  group: ShowcaseStyleGroup | null;
  items: PublicShowcaseItem[];
  featuredItem: PublicShowcaseItem;
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

function mapStyleGroups(rawGroups: RawStyleGroup[], locale: AppLocale) {
  const groups = rawGroups.map((raw): ShowcaseStyleGroup => {
    const nameZh = raw.showcase_style_group_translations.find((entry) => entry.locale === "zh")?.name ?? "";
    const nameEn = raw.showcase_style_group_translations.find((entry) => entry.locale === "en")?.name ?? "";
    const members = [...raw.showcase_style_group_items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((member): ShowcaseStyleGroupMember => {
        const labelZh = member.showcase_style_group_item_translations.find((entry) => entry.locale === "zh")?.label ?? "";
        const labelEn = member.showcase_style_group_item_translations.find((entry) => entry.locale === "en")?.label ?? "";
        return {
          itemId: member.item_id,
          label: (locale === "zh" ? labelZh : labelEn) || (locale === "zh" ? "款式" : "Style"),
          labelZh,
          labelEn,
          sortOrder: member.sort_order,
        };
      });
    return {
      id: raw.id,
      name: (locale === "zh" ? nameZh : nameEn) || (locale === "zh" ? "新品款式组" : "New style collection"),
      nameZh,
      nameEn,
      featuredItemId: raw.featured_item_id,
      members,
    };
  });
  return new Map(groups.flatMap((group) => group.members.map((member) => [member.itemId, group] as const)));
}

async function loadStyleGroupMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  locale: AppLocale,
) {
  const { data, error } = await supabase
    .from("showcase_style_groups")
    .select(`
      id, featured_item_id,
      showcase_style_group_translations(locale, name),
      showcase_style_group_items!showcase_style_group_items_group_id_fkey(item_id, sort_order, showcase_style_group_item_translations(locale, label))
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error("展示款式组暂时无法加载。");
  return mapStyleGroups(data as unknown as RawStyleGroup[], locale);
}

const itemSelect = `
  id, batch_id, short_code, availability, price_cad, created_at,
  showcase_batches!showcase_items_batch_id_fkey(id, published_at),
  showcase_item_translations(locale, title, description),
  showcase_item_images(id, storage_path, sort_order, width, height, showcase_image_translations(locale, alt_text)),
  showcase_item_tags(tag_id, showcase_tags(id, slug, is_visible, sort_order, showcase_tag_translations(locale, name)))
`;

export async function getActiveShowcaseDisplaySet(
  items: Array<{ id: string; availability?: "inquiry" | "sold" | "archived" }>,
): Promise<ShowcaseDisplaySet> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("showcase_display_sets")
    .select("id, presentation_preset, featured_item_id, showcase_display_set_items(item_id, sort_order)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("当前新品展台暂时无法加载。");

  const availableIds = new Set(items.filter((item) => item.availability !== "archived").map((item) => item.id));
  const displaySet = data as unknown as RawDisplaySet | null;
  const savedIds = displaySet?.showcase_display_set_items
    .filter((entry) => availableIds.has(entry.item_id))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((entry) => entry.item_id) ?? [];
  const itemIds = savedIds.length >= 2 ? savedIds : items
    .filter((item) => item.availability !== "archived")
    .slice(0, 8)
    .map((item) => item.id);
  const featuredItemId = displaySet?.featured_item_id && itemIds.includes(displaySet.featured_item_id)
    ? displaySet.featured_item_id
    : itemIds[0] ?? "";
  return {
    id: savedIds.length >= 2 ? displaySet?.id ?? null : null,
    presentationPreset: savedIds.length >= 2 && displaySet?.presentation_preset === "joyful_scrapbook"
      ? "joyful_scrapbook"
      : "sunny_shelf",
    featuredItemId,
    itemIds,
    isFallback: savedIds.length < 2,
  };
}

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

async function listPublicShowcaseItemsWithLimit(locale: AppLocale, limit: number): Promise<PublicShowcaseItem[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, styleGroupMap] = await Promise.all([
    supabase
      .from("showcase_items")
      .select(itemSelect)
      .neq("availability", "archived")
      .order("created_at", { ascending: false })
      .limit(limit),
    loadStyleGroupMap(supabase, locale),
  ]);
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
      batchId: item.batch_id,
      tags: item.showcase_item_tags
        .map((link) => link.showcase_tags)
        .filter((tag): tag is RawTag => Boolean(tag?.is_visible))
        .map((tag) => mapTag(tag, locale))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      images: mapImages(item.showcase_item_images, locale, urls),
      styleGroup: styleGroupMap.get(item.id) ?? null,
    };
  });
}

export async function listPublicShowcaseItems(locale: AppLocale): Promise<PublicShowcaseItem[]> {
  return listPublicShowcaseItemsWithLimit(locale, 200);
}

export async function listLatestPublicShowcaseItems(locale: AppLocale, limit = 8): Promise<PublicShowcaseItem[]> {
  const safeLimit = Math.min(10, Math.max(5, Math.trunc(limit)));
  const candidates = await listPublicShowcaseItemsWithLimit(locale, safeLimit * 6);
  return groupPublicShowcaseItems(candidates).slice(0, safeLimit).flatMap((entry) => entry.items);
}

export async function listAdminShowcaseItems(): Promise<AdminShowcaseItem[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, styleGroupMap] = await Promise.all([
    supabase
      .from("showcase_items")
      .select(itemSelect)
      .order("created_at", { ascending: false })
      .limit(200),
    loadStyleGroupMap(supabase, "zh"),
  ]);
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
      batchId: item.batch_id,
      tags: item.showcase_item_tags
        .map((link) => link.showcase_tags)
        .filter((tag): tag is RawTag => Boolean(tag))
        .map((tag) => mapTag(tag, "zh"))
        .sort((a, b) => a.sortOrder - b.sortOrder),
      images: mapImages(item.showcase_item_images, "zh", urls),
      styleGroup: styleGroupMap.get(item.id) ?? null,
    };
  });
}
