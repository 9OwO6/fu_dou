import { isUuid } from "./admin-validation";

export type VariantOptionValueInput = {
  id: string;
  label: string;
};

export type VariantOptionInput = {
  id: string;
  label: string;
  values: VariantOptionValueInput[];
};

export type VariantInput = {
  id: string;
  optionValueIds: string[];
  sku: string;
  priceCad: string;
  compareAtPriceCad: string;
  saleStartsAt: string;
  saleEndsAt: string;
  stockQty: string;
  isActive: boolean;
};

export type VariantConfiguration = {
  options: VariantOptionInput[];
  variants: VariantInput[];
};

export type VariantConfigurationResult =
  | { success: true; values: VariantConfiguration }
  | { success: false; fieldErrors: Record<string, string> };

const moneyPattern = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
const maximumCombinations = 500;

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function combinationSignature(valueIds: string[]) {
  return [...valueIds].sort().join("|");
}

function cartesianSignatures(options: VariantOptionInput[]) {
  if (options.length === 0) return new Set([""]);
  let combinations: string[][] = [[]];
  for (const option of options) {
    combinations = combinations.flatMap((combination) =>
      option.values.map((value) => [...combination, value.id]),
    );
  }
  return new Set(combinations.map(combinationSignature));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseVariantConfiguration(raw: string): VariantConfigurationResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { success: false, fieldErrors: { configuration: "规格数据无法读取，请刷新页面后重试。" } };
  }

  if (!isRecord(value) || !Array.isArray(value.options) || !Array.isArray(value.variants)) {
    return { success: false, fieldErrors: { configuration: "规格数据格式不正确。" } };
  }

  const options: VariantOptionInput[] = [];
  const variants: VariantInput[] = [];
  const fieldErrors: Record<string, string> = {};
  const allIds = new Set<string>();

  if (value.options.length > 8) fieldErrors.options = "一个商品最多可设置 8 个规格。";

  value.options.forEach((rawOption, optionIndex) => {
    if (!isRecord(rawOption) || !Array.isArray(rawOption.values)) {
      fieldErrors[`options.${optionIndex}`] = "规格数据格式不正确。";
      return;
    }
    const id = typeof rawOption.id === "string" ? rawOption.id : "";
    const label = typeof rawOption.label === "string" ? rawOption.label.trim() : "";
    if (!isUuid(id) || allIds.has(id)) fieldErrors[`options.${optionIndex}.id`] = "规格标识无效，请刷新页面后重试。";
    allIds.add(id);
    if (!label || label.length > 100) fieldErrors[`options.${optionIndex}.label`] = "规格名称为必填，且不能超过 100 个字符。";
    if (rawOption.values.length === 0 || rawOption.values.length > 50) {
      fieldErrors[`options.${optionIndex}.values`] = "每个规格需要 1–50 个值。";
    }

    const values: VariantOptionValueInput[] = [];
    const labels = new Set<string>();
    rawOption.values.forEach((rawValue, valueIndex) => {
      if (!isRecord(rawValue)) {
        fieldErrors[`options.${optionIndex}.values.${valueIndex}`] = "规格值格式不正确。";
        return;
      }
      const valueId = typeof rawValue.id === "string" ? rawValue.id : "";
      const valueLabel = typeof rawValue.label === "string" ? rawValue.label.trim() : "";
      if (!isUuid(valueId) || allIds.has(valueId)) fieldErrors[`options.${optionIndex}.values.${valueIndex}.id`] = "规格值标识无效，请刷新页面后重试。";
      allIds.add(valueId);
      if (!valueLabel || valueLabel.length > 100) fieldErrors[`options.${optionIndex}.values.${valueIndex}.label`] = "规格值为必填，且不能超过 100 个字符。";
      const normalized = normalizeLabel(valueLabel);
      if (normalized && labels.has(normalized)) fieldErrors[`options.${optionIndex}.values.${valueIndex}.label`] = "同一规格内不能有重复的规格值。";
      labels.add(normalized);
      values.push({ id: valueId, label: valueLabel });
    });
    options.push({ id, label, values });
  });

  const optionLabels = new Set<string>();
  options.forEach((option, index) => {
    const normalized = normalizeLabel(option.label);
    if (normalized && optionLabels.has(normalized)) fieldErrors[`options.${index}.label`] = "规格名称不能重复。";
    optionLabels.add(normalized);
  });

  const expectedSignatures = cartesianSignatures(options);
  if (expectedSignatures.size > maximumCombinations) {
    fieldErrors.variants = `规格组合不能超过 ${maximumCombinations} 个，请减少规格值。`;
  }

  const valueToOption = new Map<string, string>();
  options.forEach((option) => option.values.forEach((item) => valueToOption.set(item.id, option.id)));
  const variantIds = new Set<string>();
  const skuSet = new Set<string>();
  const signatures = new Set<string>();

  value.variants.forEach((rawVariant, variantIndex) => {
    if (!isRecord(rawVariant) || !Array.isArray(rawVariant.optionValueIds)) {
      fieldErrors[`variants.${variantIndex}`] = "组合数据格式不正确。";
      return;
    }
    const id = typeof rawVariant.id === "string" ? rawVariant.id : "";
    const optionValueIds = rawVariant.optionValueIds.filter((item): item is string => typeof item === "string");
    const sku = typeof rawVariant.sku === "string" ? rawVariant.sku.trim() : "";
    const priceCad = typeof rawVariant.priceCad === "string" ? rawVariant.priceCad.trim() : "";
    const compareAtPriceCad = typeof rawVariant.compareAtPriceCad === "string" ? rawVariant.compareAtPriceCad.trim() : "";
    const saleStartsAt = typeof rawVariant.saleStartsAt === "string" ? rawVariant.saleStartsAt.trim() : "";
    const saleEndsAt = typeof rawVariant.saleEndsAt === "string" ? rawVariant.saleEndsAt.trim() : "";
    const stockQty = typeof rawVariant.stockQty === "string" ? rawVariant.stockQty.trim() : "";
    const isActive = rawVariant.isActive === true;

    if (!isUuid(id) || variantIds.has(id)) fieldErrors[`variants.${variantIndex}.id`] = "组合标识无效，请重新生成组合。";
    variantIds.add(id);

    const selectedOptions = new Set(optionValueIds.map((valueId) => valueToOption.get(valueId)));
    if (
      optionValueIds.length !== options.length
      || selectedOptions.has(undefined)
      || selectedOptions.size !== options.length
    ) {
      fieldErrors[`variants.${variantIndex}.combination`] = "组合必须为每个规格选择且只选择一个值。";
    }
    const signature = combinationSignature(optionValueIds);
    if (signatures.has(signature)) fieldErrors[`variants.${variantIndex}.combination`] = "不能保存重复的规格组合。";
    signatures.add(signature);

    const normalizedSku = sku.toLocaleLowerCase("en-CA");
    if (!sku || sku.length > 100) fieldErrors[`variants.${variantIndex}.sku`] = "SKU 为必填，且不能超过 100 个字符。";
    if (normalizedSku && skuSet.has(normalizedSku)) fieldErrors[`variants.${variantIndex}.sku`] = "同一商品内 SKU 不能重复（不区分大小写）。";
    skuSet.add(normalizedSku);

    if (!moneyPattern.test(priceCad) || Number(priceCad) <= 0) fieldErrors[`variants.${variantIndex}.priceCad`] = "CAD 价格必须大于 0，且最多保留两位小数。";
    if (compareAtPriceCad && (!moneyPattern.test(compareAtPriceCad) || Number(compareAtPriceCad) <= Number(priceCad))) {
      fieldErrors[`variants.${variantIndex}.compareAtPriceCad`] = "原价必须留空或高于当前 CAD 价格。";
    }
    const saleStartTime = saleStartsAt ? Date.parse(saleStartsAt) : Number.NaN;
    const saleEndTime = saleEndsAt ? Date.parse(saleEndsAt) : Number.NaN;
    if (saleStartsAt && !Number.isFinite(saleStartTime)) {
      fieldErrors[`variants.${variantIndex}.saleStartsAt`] = "特价开始时间无效。";
    }
    if (saleEndsAt && !Number.isFinite(saleEndTime)) {
      fieldErrors[`variants.${variantIndex}.saleEndsAt`] = "特价结束时间无效。";
    }
    if ((saleStartsAt || saleEndsAt) && !compareAtPriceCad) {
      fieldErrors[`variants.${variantIndex}.saleWindow`] = "设置特价时间前必须填写高于现价的原价。";
    }
    if (Number.isFinite(saleStartTime) && Number.isFinite(saleEndTime) && saleEndTime <= saleStartTime) {
      fieldErrors[`variants.${variantIndex}.saleEndsAt`] = "特价结束时间必须晚于开始时间。";
    }
    if (!/^\d+$/.test(stockQty) || Number(stockQty) > 2_147_483_647) fieldErrors[`variants.${variantIndex}.stockQty`] = "库存必须是非负整数。";

    variants.push({ id, optionValueIds, sku, priceCad, compareAtPriceCad, saleStartsAt, saleEndsAt, stockQty, isActive });
  });

  if (variants.length !== expectedSignatures.size || [...expectedSignatures].some((signature) => !signatures.has(signature))) {
    fieldErrors.variants = "规格组合与当前规格值不同步，请先点击“生成/同步组合”。";
  }

  return Object.keys(fieldErrors).length > 0
    ? { success: false, fieldErrors }
    : { success: true, values: { options, variants } };
}
