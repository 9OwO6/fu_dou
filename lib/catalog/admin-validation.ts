export type ProductStatus = "draft" | "published" | "archived";

export type ProductFormValues = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
};

export type ProductField = keyof ProductFormValues;

export type CategoryFormValues = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isVisible: boolean;
};

export type CategoryField = "slug" | "name" | "description" | "sortOrder";

export type FormResult<TValues, TField extends string> =
  | { success: true; values: TValues }
  | { success: false; fieldErrors: Partial<Record<TField, string>> };

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateOptionalLength(
  value: string,
  maximum: number,
  message: string,
) {
  return value.length > maximum ? message : null;
}

export function parseProductForm(formData: FormData): FormResult<ProductFormValues, ProductField> {
  const values: ProductFormValues = {
    slug: text(formData, "slug").toLowerCase(),
    title: text(formData, "title"),
    shortDescription: text(formData, "shortDescription"),
    description: text(formData, "description"),
    seoTitle: text(formData, "seoTitle"),
    seoDescription: text(formData, "seoDescription"),
  };
  const fieldErrors: Partial<Record<ProductField, string>> = {};

  if (!slugPattern.test(values.slug) || values.slug.length > 160) {
    fieldErrors.slug = "网址标识只能使用小写字母、数字和单个连字符，且不超过 160 个字符。";
  }
  if (!values.title || values.title.length > 200) {
    fieldErrors.title = "中文标题为必填，且不能超过 200 个字符。";
  }

  const optionalChecks: Array<[ProductField, number, string]> = [
    ["shortDescription", 300, "简短描述不能超过 300 个字符。"],
    ["description", 10_000, "商品描述不能超过 10,000 个字符。"],
    ["seoTitle", 70, "SEO 标题不能超过 70 个字符。"],
    ["seoDescription", 160, "SEO 描述不能超过 160 个字符。"],
  ];
  for (const [field, maximum, message] of optionalChecks) {
    const error = validateOptionalLength(values[field], maximum, message);
    if (error) fieldErrors[field] = error;
  }

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, values };
}

export function parseCategoryForm(formData: FormData): FormResult<CategoryFormValues, CategoryField> {
  const rawSortOrder = text(formData, "sortOrder");
  const values: CategoryFormValues = {
    slug: text(formData, "slug").toLowerCase(),
    name: text(formData, "name"),
    description: text(formData, "description"),
    sortOrder: Number(rawSortOrder),
    isVisible: formData.get("isVisible") === "on",
  };
  const fieldErrors: Partial<Record<CategoryField, string>> = {};

  if (!slugPattern.test(values.slug) || values.slug.length > 160) {
    fieldErrors.slug = "网址标识只能使用小写字母、数字和单个连字符，且不超过 160 个字符。";
  }
  if (!values.name || values.name.length > 160) {
    fieldErrors.name = "中文分类名称为必填，且不能超过 160 个字符。";
  }
  if (values.description.length > 2_000) {
    fieldErrors.description = "分类描述不能超过 2,000 个字符。";
  }
  if (!Number.isInteger(values.sortOrder) || values.sortOrder < 0 || values.sortOrder > 99_999) {
    fieldErrors.sortOrder = "排序必须是 0 到 99,999 之间的整数。";
  }

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, values };
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function isProductStatus(value: string): value is ProductStatus {
  return value === "draft" || value === "published" || value === "archived";
}
