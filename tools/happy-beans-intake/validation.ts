import { isAbsolute, resolve } from "node:path";

import type {
  GroupingResult,
  IntakeConfig,
  IntakeManifest,
  ProductDraft,
  SourceFile,
} from "./types.ts";

type ValidationResult<T> = { success: true; value: T } | { success: false; errors: string[] };

const GROUP_ID = /^group-[0-9]{3}$/;
const IMAGE_ID = /^img-[0-9]{3}$/;
const BATCH_ID = /^hb-[a-f0-9]{16}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MATERIAL_FACT_PATTERN = /(?:材质|陶瓷|玻璃|塑料|树脂|木制|木质|金属|棉|羊毛|聚酯|亚克力)/gu;
const MATERIAL_ERROR_MARKER = "禁止从图片推断的材质声明";
const FORBIDDEN_FACT_PATTERNS = [
  { category: "价格或库存", pattern: /(?:SKU|库存|现货|缺货|CAD|加元|价格|售价|折扣)/iu },
  { category: "材质", pattern: MATERIAL_FACT_PATTERN },
  { category: "容量", pattern: /(?:容量|\d+(?:\.\d+)?\s*(?:ml|毫升|l|升))/iu },
  { category: "尺寸", pattern: /(?:尺寸|\d+(?:\.\d+)?\s*(?:cm|mm|厘米|毫米|英寸|寸))/iu },
  { category: "产地", pattern: /(?:产地|原产|制造于|made in)/iu },
  { category: "认证或护理", pattern: /(?:认证|食品级|微波炉|洗碗机|机洗|手洗|护理|保养)/iu },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  const expected = new Set(keys);
  return Object.keys(value).every((key) => expected.has(key)) && keys.every((key) => key in value);
}

function text(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function stringArray(value: unknown, max = 100) {
  return Array.isArray(value) && value.length <= max && value.every((entry) => typeof entry === "string");
}

function confidence(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function validateConfig(value: unknown): ValidationResult<IntakeConfig> {
  const errors: string[] = [];
  if (!isRecord(value)) return { success: false, errors: ["配置必须是 JSON object。"] };
  const directories = value.directories;
  const allowedTags = value.allowedTags;
  if (!text(value.rulesVersion, 1, 80)) errors.push("rulesVersion 无效。");
  if (!text(value.workspaceRoot, 1, 500) || !isAbsolute(String(value.workspaceRoot))) errors.push("workspaceRoot 必须是绝对路径。");
  if (!isRecord(directories) || !exactKeys(directories, ["incoming", "processing", "completed", "failed", "output"]) || Object.values(directories).some((entry) => !text(entry, 1, 80) || isAbsolute(String(entry)) || String(entry).includes(".."))) {
    errors.push("directories 必须只包含安全的相对目录名。");
  }
  if (!Number.isSafeInteger(value.maxBatchImages) || Number(value.maxBatchImages) < 1 || Number(value.maxBatchImages) > 30) errors.push("maxBatchImages 必须在 1–30 之间。");
  if (!Number.isSafeInteger(value.maxImagesPerProduct) || Number(value.maxImagesPerProduct) < 1 || Number(value.maxImagesPerProduct) > 10) errors.push("maxImagesPerProduct 必须在 1–10 之间。");
  if (!Number.isSafeInteger(value.analysisImageMaxPixels) || Number(value.analysisImageMaxPixels) < 256 || Number(value.analysisImageMaxPixels) > 2048) errors.push("analysisImageMaxPixels 必须在 256–2048 之间。");
  if (!text(value.modelName, 1, 200)) errors.push("modelName 无效。");
  try {
    const endpoint = new URL(String(value.lmStudioBaseUrl));
    if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || endpoint.port !== "1234" || endpoint.pathname.replace(/\/$/, "") !== "/v1") {
      errors.push("lmStudioBaseUrl 只能是 http://127.0.0.1:1234/v1。");
    }
  } catch {
    errors.push("lmStudioBaseUrl 无效。");
  }
  if (!confidence(value.minimumConfidence)) errors.push("minimumConfidence 必须在 0–1 之间。");
  if (!Number.isSafeInteger(value.retryCount) || Number(value.retryCount) < 0 || Number(value.retryCount) > 5) errors.push("retryCount 必须在 0–5 之间。");
  if (!Number.isSafeInteger(value.requestTimeoutMs) || Number(value.requestTimeoutMs) < 1000 || Number(value.requestTimeoutMs) > 300000) errors.push("requestTimeoutMs 必须在 1000–300000 之间。");
  if (typeof value.generatePreview !== "boolean") errors.push("generatePreview 必须是 boolean。");
  if (value.runMode !== "dry_run") errors.push("Phase 12A 只允许 dry_run。");
  if (!Array.isArray(allowedTags) || allowedTags.length < 1 || allowedTags.length > 30 || allowedTags.some((tag) => !isRecord(tag) || !exactKeys(tag, ["slug", "nameZh"]) || !text(tag.slug, 1, 60) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(tag.slug)) || !text(tag.nameZh, 1, 30))) {
    errors.push("allowedTags 无效。");
  } else if (new Set(allowedTags.map((tag) => String(tag.slug))).size !== allowedTags.length) {
    errors.push("allowedTags slug 不能重复。");
  }
  return errors.length ? { success: false, errors } : { success: true, value: value as IntakeConfig };
}

export function resolveWorkspaceDirectories(config: IntakeConfig) {
  const root = resolve(config.workspaceRoot);
  return Object.fromEntries(Object.entries(config.directories).map(([key, directory]) => [key, resolve(root, directory)])) as Record<keyof IntakeConfig["directories"], string>;
}

export function validateGrouping(value: unknown, imageIds: string[], maxImagesPerProduct: number): ValidationResult<GroupingResult> {
  const errors: string[] = [];
  if (!isRecord(value) || !exactKeys(value, ["groups"]) || !Array.isArray(value.groups) || value.groups.length < 1) {
    return { success: false, errors: ["分组响应必须只包含非空 groups 数组。"] };
  }
  const seenGroups = new Set<string>();
  const seenImages = new Set<string>();
  for (const group of value.groups) {
    if (!isRecord(group) || !exactKeys(group, ["groupId", "imageIds", "confidence", "uncertaintyReason"])) {
      errors.push("分组字段不完整或包含额外字段。");
      continue;
    }
    if (typeof group.groupId !== "string" || !GROUP_ID.test(group.groupId) || seenGroups.has(group.groupId)) errors.push("groupId 重复或无效。");
    if (!Array.isArray(group.imageIds) || group.imageIds.length < 1 || group.imageIds.length > maxImagesPerProduct || group.imageIds.some((id) => typeof id !== "string" || !imageIds.includes(id) || seenImages.has(id))) errors.push(`分组 ${String(group.groupId)} 的 imageIds 无效、重复或超限。`);
    if (!confidence(group.confidence)) errors.push(`分组 ${String(group.groupId)} 的 confidence 无效。`);
    if (!text(group.uncertaintyReason, 0, 300)) errors.push(`分组 ${String(group.groupId)} 的 uncertaintyReason 无效。`);
    if (typeof group.groupId === "string") seenGroups.add(group.groupId);
    if (Array.isArray(group.imageIds)) group.imageIds.forEach((id) => { if (typeof id === "string") seenImages.add(id); });
  }
  if (seenImages.size !== imageIds.length || imageIds.some((id) => !seenImages.has(id))) errors.push("每张有效图片必须且只能出现一次。");
  return errors.length ? { success: false, errors } : { success: true, value: value as GroupingResult };
}

function validateNoForbiddenClaims(draft: ProductDraft, errors: string[]) {
  const fields = [
    { name: "titleZh", value: draft.titleZh },
    { name: "descriptionZh", value: draft.descriptionZh },
    ...draft.altTexts.map((entry) => ({ name: `altTexts.${entry.imageId}`, value: entry.altZh })),
  ];
  for (const field of fields) {
    const matched = FORBIDDEN_FACT_PATTERNS.map((entry) => ({ ...entry, match: field.value.match(entry.pattern)?.[0] })).find((entry) => entry.match);
    if (matched) {
      errors.push(`草稿 ${field.name} 包含代码禁止从图片推断的${matched.category}声明（命中词：${matched.match}）。`);
      return;
    }
  }
}

export function validateDraft(value: unknown, expectedGroup: { groupId: string; imageIds: string[] }, allowedTags: string[]): ValidationResult<ProductDraft> {
  const errors: string[] = [];
  const keys = ["groupId", "imageIds", "titleZh", "descriptionZh", "suggestedTags", "coverImageId", "orderedImageIds", "altTexts", "confidence", "uncertainFields", "warnings"];
  if (!isRecord(value) || !exactKeys(value, keys)) return { success: false, errors: ["草稿字段不完整或包含禁止的额外字段。"] };
  if (value.groupId !== expectedGroup.groupId) errors.push("草稿 groupId 与请求不一致。");
  const expected = new Set(expectedGroup.imageIds);
  const imageIds = Array.isArray(value.imageIds) ? value.imageIds : [];
  const ordered = Array.isArray(value.orderedImageIds) ? value.orderedImageIds : [];
  if (imageIds.length !== expected.size || new Set(imageIds).size !== expected.size || imageIds.some((id) => typeof id !== "string" || !expected.has(id))) errors.push("草稿 imageIds 必须精确覆盖该组图片。");
  if (!text(value.titleZh, 1, 40)) errors.push("titleZh 必须为 1–40 字符。");
  if (!text(value.descriptionZh, 1, 160)) errors.push("descriptionZh 必须为 1–160 字符。");
  if (!stringArray(value.suggestedTags, 10) || (value.suggestedTags as string[]).some((tag) => !allowedTags.includes(tag)) || new Set(value.suggestedTags as string[]).size !== (value.suggestedTags as string[]).length) errors.push("suggestedTags 只能使用允许且不重复的标签。");
  if (typeof value.coverImageId !== "string" || !expected.has(value.coverImageId)) errors.push("coverImageId 不属于该组。");
  if (ordered.length !== expected.size || new Set(ordered).size !== expected.size || ordered.some((id) => typeof id !== "string" || !expected.has(id))) errors.push("orderedImageIds 必须精确覆盖该组图片。");
  if (!Array.isArray(value.altTexts) || value.altTexts.length !== expected.size) {
    errors.push("altTexts 必须逐图提供。");
  } else {
    const altIds = new Set<string>();
    for (const alt of value.altTexts) {
      if (!isRecord(alt) || !exactKeys(alt, ["imageId", "altZh"]) || typeof alt.imageId !== "string" || !expected.has(alt.imageId) || altIds.has(alt.imageId) || !text(alt.altZh, 1, 120)) errors.push("altTexts 包含缺失、重复或无效图片引用。");
      if (isRecord(alt) && typeof alt.imageId === "string") altIds.add(alt.imageId);
    }
  }
  if (!confidence(value.confidence)) errors.push("confidence 必须在 0–1 之间。");
  if (!stringArray(value.uncertainFields, 30) || !stringArray(value.warnings, 30)) errors.push("uncertainFields 或 warnings 无效。");
  if (!errors.length) validateNoForbiddenClaims(value as ProductDraft, errors);
  return errors.length ? { success: false, errors } : { success: true, value: value as ProductDraft };
}

function cleanMaterialTerms(value: string) {
  return value
    .replace(MATERIAL_FACT_PATTERN, "")
    .replace(/透明透明/gu, "透明")
    .replace(/[ \t]{2,}/gu, " ")
    .replace(/([，、。；：])\1+/gu, "$1")
    .replace(/^[，、。；：\s]+|[，、；：\s]+$/gu, "")
    .trim();
}

export function createControlledMaterialFallback(
  value: unknown,
  expectedGroup: { groupId: string; imageIds: string[] },
  allowedTags: string[],
  minimumConfidence: number,
): ValidationResult<ProductDraft> {
  const original = validateDraft(value, expectedGroup, allowedTags);
  if (original.success) return original;
  if (!original.errors.length || original.errors.some((error) => !error.includes(MATERIAL_ERROR_MARKER))) return original;

  // validateDraft only reaches forbidden-claim checks after every structural and relational check succeeds.
  const draft = value as ProductDraft;
  const affectedFields: string[] = [];
  const cleanField = (field: string, textValue: string) => {
    const cleaned = cleanMaterialTerms(textValue);
    if (cleaned !== textValue) affectedFields.push(field);
    return cleaned;
  };
  const controlled: ProductDraft = {
    ...draft,
    titleZh: cleanField("titleZh", draft.titleZh),
    descriptionZh: cleanField("descriptionZh", draft.descriptionZh),
    altTexts: draft.altTexts.map((entry) => ({ ...entry, altZh: cleanField(`altTexts.${entry.imageId}`, entry.altZh) })),
    confidence: Math.min(draft.confidence, Math.max(0, minimumConfidence - 0.01)),
    uncertainFields: [...new Set([...draft.uncertainFields, ...affectedFields])],
    warnings: [...new Set([
      ...draft.warnings,
      `本地安全兜底已自动删除未经图片证实的材质词；必须人工复核受影响字段：${affectedFields.join("、")}。`,
    ])],
  };
  const validated = validateDraft(controlled, expectedGroup, allowedTags);
  if (!validated.success) return validated;
  return { success: true, value: validated.value };
}

function validateSourceFiles(files: SourceFile[], errors: string[]) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 30) errors.push("sourceFiles 数量必须在 1–30 之间。");
  const ids = new Set<string>();
  for (const file of files) {
    if (!IMAGE_ID.test(file.imageId) || ids.has(file.imageId) || !text(file.originalFileName, 1, 500) || !SHA256.test(file.contentHash) || !SUPPORTED_MIME.has(file.mimeType) || !Number.isSafeInteger(file.width) || file.width < 1 || !Number.isSafeInteger(file.height) || file.height < 1 || !Number.isSafeInteger(file.byteSize) || file.byteSize < 1) errors.push("sourceFiles 包含无效记录。");
    ids.add(file.imageId);
  }
}

export function validateManifest(value: unknown, allowedTags: string[]): ValidationResult<IntakeManifest> {
  const errors: string[] = [];
  const keys = ["schemaVersion", "batchId", "sourceFiles", "duplicateFiles", "rejectedFiles", "groups", "modelName", "rulesVersion", "createdAt", "runMode"];
  if (!isRecord(value) || !exactKeys(value, keys)) return { success: false, errors: ["manifest 字段不完整或包含额外字段。"] };
  if (value.schemaVersion !== "0.1" || typeof value.batchId !== "string" || !BATCH_ID.test(value.batchId) || value.runMode !== "dry_run") errors.push("manifest 版本、batchId 或运行模式无效。");
  if (!Array.isArray(value.sourceFiles)) errors.push("sourceFiles 无效。"); else validateSourceFiles(value.sourceFiles as SourceFile[], errors);
  const knownIds = new Set(Array.isArray(value.sourceFiles) ? (value.sourceFiles as SourceFile[]).map((file) => file.imageId) : []);
  if (!Array.isArray(value.duplicateFiles) || value.duplicateFiles.some((file) => !isRecord(file) || !exactKeys(file, ["originalFileName", "contentHash", "duplicateOfImageId"]) || !text(file.originalFileName, 1, 500) || typeof file.contentHash !== "string" || !SHA256.test(file.contentHash) || typeof file.duplicateOfImageId !== "string" || !knownIds.has(file.duplicateOfImageId))) errors.push("duplicateFiles 无效。");
  if (!Array.isArray(value.rejectedFiles) || value.rejectedFiles.some((file) => !isRecord(file) || !exactKeys(file, ["originalFileName", "reason"]) || !text(file.originalFileName, 1, 500) || !text(file.reason, 1, 300))) errors.push("rejectedFiles 无效。");
  if (!Array.isArray(value.groups) || value.groups.length < 1) errors.push("groups 无效。");
  else {
    const covered = new Set<string>();
    for (const group of value.groups) {
      const expectedIds = isRecord(group) && Array.isArray(group.imageIds) ? group.imageIds.filter((id): id is string => typeof id === "string") : [];
      const parsed = validateDraft(group, { groupId: isRecord(group) && typeof group.groupId === "string" ? group.groupId : "", imageIds: expectedIds }, allowedTags);
      if (!parsed.success) errors.push(...parsed.errors);
      expectedIds.forEach((id) => { if (covered.has(id)) errors.push("图片不能跨组重复。"); covered.add(id); });
    }
    if (covered.size !== knownIds.size || [...knownIds].some((id) => !covered.has(id))) errors.push("groups 必须精确覆盖 sourceFiles。");
  }
  if (!text(value.modelName, 1, 200) || !text(value.rulesVersion, 1, 80) || typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) errors.push("manifest 元数据无效。");
  return errors.length ? { success: false, errors } : { success: true, value: value as IntakeManifest };
}

export const groupingJsonSchema = {
  type: "object", additionalProperties: false, required: ["groups"], properties: {
    groups: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["groupId", "imageIds", "confidence", "uncertaintyReason"], properties: {
      groupId: { type: "string", pattern: "^group-[0-9]{3}$" }, imageIds: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "string" } }, confidence: { type: "number", minimum: 0, maximum: 1 }, uncertaintyReason: { type: "string", maxLength: 300 },
    } } },
  },
} as const;

export const draftJsonSchema = {
  type: "object", additionalProperties: false, required: ["groupId", "imageIds", "titleZh", "descriptionZh", "suggestedTags", "coverImageId", "orderedImageIds", "altTexts", "confidence", "uncertainFields", "warnings"], properties: {
    groupId: { type: "string" }, imageIds: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "string" } }, titleZh: { type: "string", minLength: 1, maxLength: 40 }, descriptionZh: { type: "string", minLength: 1, maxLength: 160 }, suggestedTags: { type: "array", maxItems: 10, uniqueItems: true, items: { type: "string" } }, coverImageId: { type: "string" }, orderedImageIds: { type: "array", minItems: 1, maxItems: 10, uniqueItems: true, items: { type: "string" } }, altTexts: { type: "array", minItems: 1, maxItems: 10, items: { type: "object", additionalProperties: false, required: ["imageId", "altZh"], properties: { imageId: { type: "string" }, altZh: { type: "string", minLength: 1, maxLength: 120 } } } }, confidence: { type: "number", minimum: 0, maximum: 1 }, uncertainFields: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } },
  },
} as const;
