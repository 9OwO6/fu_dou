export const homepageSectionTypes = [
  "announcement",
  "hero",
  "featured_categories",
  "new_products",
  "featured_products",
  "sale_products",
  "brand_story",
  "fulfillment",
  "faq",
  "contact_cta",
] as const;

export type HomepageSectionType = (typeof homepageSectionTypes)[number];
export type ProductSectionType = "new_products" | "featured_products" | "sale_products";

export const homepageSectionLabels: Record<HomepageSectionType, string> = {
  announcement: "公告条",
  hero: "Hero 主视觉",
  featured_categories: "热门分类",
  new_products: "新品",
  featured_products: "推荐",
  sale_products: "特价",
  brand_story: "品牌故事",
  fulfillment: "履约说明",
  faq: "FAQ",
  contact_cta: "联系 CTA",
};

export const controlledCtaTargets = [
  "/products",
  "/collections/new",
  "/collections/featured",
  "/collections/sale",
  "#fulfillment",
  "#faq",
] as const;

export type ControlledCtaTarget = (typeof controlledCtaTargets)[number];

export type FaqItem = { question: string; answer: string };
export type HomepageTranslationContent = {
  pickupTitle?: string;
  pickupBody?: string;
  deliveryTitle?: string;
  deliveryBody?: string;
  items?: FaqItem[];
};

export type HomepageSection = {
  id?: string;
  sectionType: HomepageSectionType;
  isEnabled: boolean;
  sortOrder: number;
  settings: {
    imageId?: string | null;
    categoryIds?: string[];
    selectionMode?: "automatic" | "manual";
    productIds?: string[];
    limit?: number;
  };
  translation: {
    heading: string;
    body: string;
    ctaLabel: string;
    ctaHref: ControlledCtaTarget | "";
    content: HomepageTranslationContent;
  };
  translationEn: {
    heading: string;
    body: string;
    ctaLabel: string;
    ctaHref: ControlledCtaTarget | "";
    content: HomepageTranslationContent;
  };
};

export type HomepageSiteSettings = {
  contactEmail: string;
  contactPhone: string;
  pickupEnabled: boolean;
  localDeliveryEnabled: boolean;
  serviceAreaDescription: string;
  serviceAreaDescriptionEn: string;
};

export type HomepageConfiguration = {
  sections: HomepageSection[];
  siteSettings: HomepageSiteSettings;
};

export type HomepageFieldErrors = Record<string, string>;
export type HomepageParseResult =
  | { success: true; value: HomepageConfiguration }
  | { success: false; fieldErrors: HomepageFieldErrors };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const markupPattern = /[<>]/;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function texts(formData: FormData, key: string) {
  return formData.getAll(key).flatMap((value) => typeof value === "string" ? [value.trim()] : []).filter(Boolean);
}

function addTextError(errors: HomepageFieldErrors, key: string, value: string, maximum: number, required = false) {
  if (required && !value) errors[key] = "此字段为必填。";
  else if (value.length > maximum) errors[key] = `不能超过 ${maximum.toLocaleString("zh-CN")} 个字符。`;
  else if (markupPattern.test(value)) errors[key] = "只能填写纯文本，不能包含 HTML 或脚本标记。";
}

function parseIdList(formData: FormData, key: string, maximum: number, errors: HomepageFieldErrors) {
  const values = texts(formData, key);
  if (values.length > maximum || new Set(values).size !== values.length || values.some((value) => !uuidPattern.test(value))) {
    errors[key] = `选择无效，最多可选择 ${maximum} 项。`;
  }
  return values;
}

export function parseHomepageForm(formData: FormData): HomepageParseResult {
  const errors: HomepageFieldErrors = {};
  const orders = new Set<number>();
  const sections = homepageSectionTypes.map((sectionType): HomepageSection => {
    const prefix = `section.${sectionType}`;
    const isEnabled = formData.get(`${prefix}.enabled`) === "on";
    const sortRaw = text(formData, `${prefix}.sortOrder`);
    const sortOrder = Number(sortRaw);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 99_999) {
      errors[`${prefix}.sortOrder`] = "排序必须是 0 到 99,999 之间的整数。";
    } else if (orders.has(sortOrder)) {
      errors[`${prefix}.sortOrder`] = "每个模块需要使用不同的排序值。";
    } else orders.add(sortOrder);

    const heading = text(formData, `${prefix}.heading`);
    const body = text(formData, `${prefix}.body`);
    const ctaLabel = text(formData, `${prefix}.ctaLabel`);
    const ctaHrefRaw = text(formData, `${prefix}.ctaHref`);
    const ctaHref = controlledCtaTargets.includes(ctaHrefRaw as ControlledCtaTarget)
      ? ctaHrefRaw as ControlledCtaTarget
      : "";
    addTextError(errors, `${prefix}.heading`, heading, 160, isEnabled && sectionType !== "announcement");
    addTextError(errors, `${prefix}.body`, body, 5_000, isEnabled && sectionType === "announcement");
    addTextError(errors, `${prefix}.ctaLabel`, ctaLabel, 80);
    if (ctaHrefRaw && !ctaHref) errors[`${prefix}.ctaHref`] = "请选择受控的站内目标。";

    const settings: HomepageSection["settings"] = {};
    const content: HomepageTranslationContent = {};

    if (sectionType === "hero" || sectionType === "brand_story") {
      const imageId = text(formData, `${prefix}.imageId`);
      if (imageId && !uuidPattern.test(imageId)) errors[`${prefix}.imageId`] = "请选择有效的已登记商品图片。";
      settings.imageId = imageId || null;
    }
    if (sectionType === "featured_categories") {
      settings.categoryIds = parseIdList(formData, `${prefix}.categoryIds`, 6, errors);
    }
    if (sectionType === "new_products" || sectionType === "featured_products" || sectionType === "sale_products") {
      const selectionMode = text(formData, `${prefix}.selectionMode`) === "manual" ? "manual" : "automatic";
      const productIds = parseIdList(formData, `${prefix}.productIds`, 8, errors);
      const limit = Number(text(formData, `${prefix}.limit`));
      if (!Number.isInteger(limit) || limit < 1 || limit > 8) errors[`${prefix}.limit`] = "显示数量必须是 1 到 8。";
      if (isEnabled && selectionMode === "manual" && productIds.length === 0) {
        errors[`${prefix}.productIds`] = "手动选品模式至少需要选择一个商品。";
      }
      settings.selectionMode = selectionMode;
      settings.productIds = productIds;
      settings.limit = limit;
    }
    if (sectionType === "fulfillment") {
      for (const field of ["pickupTitle", "pickupBody", "deliveryTitle", "deliveryBody"] as const) {
        const value = text(formData, `${prefix}.${field}`);
        addTextError(errors, `${prefix}.${field}`, value, field.endsWith("Title") ? 120 : 2_000, isEnabled);
        content[field] = value;
      }
    }
    if (sectionType === "faq") {
      const items: FaqItem[] = [];
      for (let index = 0; index < 5; index += 1) {
        const questionKey = `${prefix}.faq.${index}.question`;
        const answerKey = `${prefix}.faq.${index}.answer`;
        const question = text(formData, questionKey);
        const answer = text(formData, answerKey);
        if (!question && !answer) continue;
        addTextError(errors, questionKey, question, 200, true);
        addTextError(errors, answerKey, answer, 2_000, true);
        items.push({ question, answer });
      }
      if (isEnabled && items.length === 0) errors[`${prefix}.faq`] = "启用 FAQ 时至少填写一组问题和答案。";
      content.items = items;
    }

    const headingEn = text(formData, `${prefix}.headingEn`);
    const bodyEn = text(formData, `${prefix}.bodyEn`);
    const ctaLabelEn = text(formData, `${prefix}.ctaLabelEn`);
    const ctaHrefEnRaw = text(formData, `${prefix}.ctaHrefEn`);
    const ctaHrefEn = controlledCtaTargets.includes(ctaHrefEnRaw as ControlledCtaTarget)
      ? ctaHrefEnRaw as ControlledCtaTarget
      : "";
    addTextError(errors, `${prefix}.headingEn`, headingEn, 160, isEnabled && sectionType !== "announcement");
    addTextError(errors, `${prefix}.bodyEn`, bodyEn, 5_000, isEnabled && sectionType === "announcement");
    addTextError(errors, `${prefix}.ctaLabelEn`, ctaLabelEn, 80);
    if (ctaHrefEnRaw && !ctaHrefEn) errors[`${prefix}.ctaHrefEn`] = "请选择受控的站内目标。";

    const contentEn: HomepageTranslationContent = {};
    if (sectionType === "fulfillment") {
      for (const field of ["pickupTitle", "pickupBody", "deliveryTitle", "deliveryBody"] as const) {
        const key = `${prefix}.${field}En`;
        const value = text(formData, key);
        addTextError(errors, key, value, field.endsWith("Title") ? 120 : 2_000, isEnabled);
        contentEn[field] = value;
      }
    }
    if (sectionType === "faq") {
      const items: FaqItem[] = [];
      for (let index = 0; index < 5; index += 1) {
        const questionKey = `${prefix}.faqEn.${index}.question`;
        const answerKey = `${prefix}.faqEn.${index}.answer`;
        const question = text(formData, questionKey);
        const answer = text(formData, answerKey);
        if (!question && !answer) continue;
        addTextError(errors, questionKey, question, 200, true);
        addTextError(errors, answerKey, answer, 2_000, true);
        items.push({ question, answer });
      }
      if (isEnabled && items.length === 0) errors[`${prefix}.faqEn`] = "启用 FAQ 时至少填写一组英文问题和答案。";
      contentEn.items = items;
    }

    return {
      sectionType,
      isEnabled,
      sortOrder,
      settings,
      translation: { heading, body, ctaLabel, ctaHref, content },
      translationEn: { heading: headingEn, body: bodyEn, ctaLabel: ctaLabelEn, ctaHref: ctaHrefEn, content: contentEn },
    };
  });

  const siteSettings: HomepageSiteSettings = {
    contactEmail: text(formData, "site.contactEmail"),
    contactPhone: text(formData, "site.contactPhone"),
    pickupEnabled: formData.get("site.pickupEnabled") === "on",
    localDeliveryEnabled: formData.get("site.localDeliveryEnabled") === "on",
    serviceAreaDescription: text(formData, "site.serviceAreaDescription"),
    serviceAreaDescriptionEn: text(formData, "site.serviceAreaDescriptionEn"),
  };
  addTextError(errors, "site.contactEmail", siteSettings.contactEmail, 320);
  if (siteSettings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteSettings.contactEmail)) {
    errors["site.contactEmail"] = "请输入有效的公开联系邮箱。";
  }
  addTextError(errors, "site.contactPhone", siteSettings.contactPhone, 40);
  addTextError(errors, "site.serviceAreaDescription", siteSettings.serviceAreaDescription, 1_000);
  addTextError(errors, "site.serviceAreaDescriptionEn", siteSettings.serviceAreaDescriptionEn, 1_000);

  return Object.keys(errors).length > 0
    ? { success: false, fieldErrors: errors }
    : { success: true, value: { sections, siteSettings } };
}

export function getSection(configuration: HomepageConfiguration, type: HomepageSectionType) {
  return configuration.sections.find((section) => section.sectionType === type);
}
