import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  homepageSectionTypes,
  type ControlledCtaTarget,
  type HomepageConfiguration,
  type HomepageSection,
  type HomepageSectionType,
  type HomepageTranslationContent,
} from "./schema";

type SectionRow = {
  id: string;
  section_type: HomepageSectionType;
  is_enabled: boolean;
  sort_order: number;
  settings_json: HomepageSection["settings"];
  homepage_section_translations: Array<{
    locale: string;
    heading: string | null;
    body: string | null;
    cta_label: string | null;
    cta_href: ControlledCtaTarget | null;
    content_json: HomepageTranslationContent;
  }>;
};

type SiteSettingsRow = {
  contact_email: string | null;
  contact_phone: string | null;
  pickup_enabled: boolean;
  local_delivery_enabled: boolean;
  service_area_description: string | null;
};

export type HomepageChoiceProduct = {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
};

export type HomepageChoiceImage = {
  id: string;
  productId: string;
  label: string;
  url: string | null;
};

export type HomepageAdminChoices = {
  categories: Array<{ id: string; name: string; isVisible: boolean }>;
  products: HomepageChoiceProduct[];
  images: HomepageChoiceImage[];
};

const fallbackSections: HomepageSection[] = [
  { sectionType: "announcement", isEnabled: true, sortOrder: 5, settings: {}, translation: { heading: "", body: "温哥华周边自取与本地配送 · 具体安排由店主确认", ctaLabel: "", ctaHref: "", content: {} } },
  { sectionType: "hero", isEnabled: true, sortOrder: 10, settings: { imageId: null }, translation: { heading: "把一点可爱和轻松，带进每天的生活。", body: "挑选适合日常、家居和送礼的小物。所有价格均为 CAD，规格库存以商品详情为准。", ctaLabel: "看看新品", ctaHref: "/collections/new", content: {} } },
  { sectionType: "featured_categories", isEnabled: true, sortOrder: 20, settings: { categoryIds: [] }, translation: { heading: "从喜欢的分类开始", body: "杯具、餐具和可爱家居小物，按真实商品慢慢补齐。", ctaLabel: "", ctaHref: "", content: {} } },
  { sectionType: "new_products", isEnabled: true, sortOrder: 30, settings: { selectionMode: "automatic", productIds: [], limit: 4 }, translation: { heading: "新品上架", body: "看看最近来到 Happy Beans 的新面孔。", ctaLabel: "", ctaHref: "/collections/new", content: {} } },
  { sectionType: "featured_products", isEnabled: true, sortOrder: 40, settings: { selectionMode: "automatic", productIds: [], limit: 4 }, translation: { heading: "本周推荐", body: "适合自己用，也适合送给喜欢可爱日常的人。", ctaLabel: "查看全部推荐", ctaHref: "/collections/featured", content: {} } },
  { sectionType: "sale_products", isEnabled: true, sortOrder: 50, settings: { selectionMode: "automatic", productIds: [], limit: 4 }, translation: { heading: "温柔特价", body: "在售规格会清楚显示 CAD 原价与当前价格。", ctaLabel: "查看全部特价", ctaHref: "/collections/sale", content: {} } },
  { sectionType: "brand_story", isEnabled: true, sortOrder: 60, settings: { imageId: null }, translation: { heading: "关于 Happy Beans", body: "我们想把温暖、轻松、可爱但不幼稚的家居与礼物小物带进日常。", ctaLabel: "", ctaHref: "", content: {} } },
  { sectionType: "fulfillment", isEnabled: true, sortOrder: 70, settings: {}, translation: { heading: "自取与本地配送", body: "第一版服务以自取和温哥华周边的小范围本地配送为主。", ctaLabel: "", ctaHref: "", content: { pickupTitle: "本地自取", pickupBody: "具体地点和时间将在订单请求确认后提供。", deliveryTitle: "小范围本地配送", deliveryBody: "提交所在区域和邮编后，店主会确认是否可送达及相关费用。" } } },
  { sectionType: "faq", isEnabled: true, sortOrder: 80, settings: {}, translation: { heading: "常见问题", body: "先把浏览商品时最常见的疑问说清楚。", ctaLabel: "", ctaHref: "", content: { items: [
    { question: "网站上的价格是什么币种？", answer: "所有公开价格均为加拿大元（CAD），不显示人民币，也不做汇率换算。" },
    { question: "不同颜色或尺寸的库存一样吗？", answer: "不一定。每个具体规格组合都有独立价格和库存，请在商品详情页选择完整规格后查看。" },
    { question: "现在可以在线付款吗？", answer: "第一版不提供在线支付。提交的是订单请求，店主会联系确认库存、履约、税费和最终金额。" },
  ] } } },
  { sectionType: "contact_cta", isEnabled: true, sortOrder: 90, settings: {}, translation: { heading: "有想找的可爱小物吗？", body: "可以先从全部商品开始逛，也可以通过下方联系方式告诉我们。", ctaLabel: "开始逛逛", ctaHref: "/products", content: {} } },
];

const fallbackConfiguration: HomepageConfiguration = {
  sections: fallbackSections,
  siteSettings: {
    contactEmail: "",
    contactPhone: "",
    pickupEnabled: true,
    localDeliveryEnabled: true,
    serviceAreaDescription: "",
  },
};

function mapConfiguration(rows: SectionRow[], site: SiteSettingsRow | null, fillMissing: boolean): HomepageConfiguration {
  const sections = rows.flatMap((row): HomepageSection[] => {
    const translation = row.homepage_section_translations.find((item) => item.locale === "zh");
    if (!translation) return [];
    return [{
      id: row.id,
      sectionType: row.section_type,
      isEnabled: row.is_enabled,
      sortOrder: row.sort_order,
      settings: row.settings_json ?? {},
      translation: {
        heading: translation.heading ?? "",
        body: translation.body ?? "",
        ctaLabel: translation.cta_label ?? "",
        ctaHref: translation.cta_href ?? "",
        content: translation.content_json ?? {},
      },
    }];
  });
  const byType = new Map(sections.map((section) => [section.sectionType, section]));
  const completeSections = fillMissing
    ? homepageSectionTypes.map((type) => byType.get(type) ?? fallbackSections.find((section) => section.sectionType === type)!)
    : sections;
  return {
    sections: completeSections,
    siteSettings: {
      contactEmail: site?.contact_email ?? "",
      contactPhone: site?.contact_phone ?? "",
      pickupEnabled: site?.pickup_enabled ?? true,
      localDeliveryEnabled: site?.local_delivery_enabled ?? false,
      serviceAreaDescription: site?.service_area_description ?? "",
    },
  };
}

async function loadConfiguration(includeDisabled: boolean) {
  const supabase = await createSupabaseServerClient();
  let sectionsRequest = supabase
    .from("homepage_sections")
    .select("id, section_type, is_enabled, sort_order, settings_json, homepage_section_translations(locale, heading, body, cta_label, cta_href, content_json)")
    .order("sort_order", { ascending: true });
  if (!includeDisabled) sectionsRequest = sectionsRequest.eq("is_enabled", true);
  const [sectionsResult, siteResult] = await Promise.all([
    sectionsRequest,
    supabase
      .from("site_settings")
      .select("contact_email, contact_phone, pickup_enabled, local_delivery_enabled, service_area_description")
      .eq("id", true)
      .maybeSingle(),
  ]);
  if (sectionsResult.error || siteResult.error) throw new Error("首页配置暂时无法加载。");
  return mapConfiguration((sectionsResult.data ?? []) as SectionRow[], siteResult.data as SiteSettingsRow | null, includeDisabled);
}

export async function getPublicHomepageConfiguration() {
  try {
    const configuration = await loadConfiguration(false);
    return { ...configuration, sections: configuration.sections.filter((section) => section.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder) };
  } catch {
    return fallbackConfiguration;
  }
}

export async function getAdminHomepageConfiguration() {
  return loadConfiguration(true);
}

export async function getHomepageAdminChoices(): Promise<HomepageAdminChoices> {
  const supabase = await createSupabaseServerClient();
  const [categoriesResult, productsResult, imagesResult] = await Promise.all([
    supabase.from("categories").select("id, is_visible, category_translations(locale, name)").order("sort_order"),
    supabase.from("products").select("id, status, product_translations(locale, title)").order("updated_at", { ascending: false }),
    supabase.from("product_images").select("id, product_id, alt_text, storage_path").order("sort_order"),
  ]);
  if (categoriesResult.error || productsResult.error || imagesResult.error) throw new Error("首页选项暂时无法加载。");
  const products: HomepageChoiceProduct[] = (productsResult.data ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    title: row.product_translations.find((translation) => translation.locale === "zh")?.title ?? "未命名商品",
  }));
  const productNames = new Map(products.map((product) => [product.id, product.title]));
  const imageRows = imagesResult.data ?? [];
  const { data: signed } = imageRows.length > 0
    ? await supabase.storage.from("product-images").createSignedUrls(imageRows.map((row) => row.storage_path), 60 * 30)
    : { data: [] };
  return {
    categories: (categoriesResult.data ?? []).map((row) => ({
      id: row.id,
      isVisible: row.is_visible,
      name: row.category_translations.find((translation) => translation.locale === "zh")?.name ?? "未命名分类",
    })),
    products,
    images: imageRows.map((row, index) => ({
      id: row.id,
      productId: row.product_id,
      label: `${productNames.get(row.product_id) ?? "未命名商品"} · ${row.alt_text}`,
      url: signed?.[index]?.signedUrl ?? null,
    })),
  };
}
