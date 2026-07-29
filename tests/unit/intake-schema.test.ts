import { describe, expect, it } from "vitest";

import { createControlledMaterialFallback, validateConfig, validateDraft, validateManifest } from "@/tools/happy-beans-intake/validation.ts";

const draft = {
  groupId: "group-001", imageIds: ["img-001"], titleZh: "可爱小熊杯", descriptionZh: "圆润小熊造型，适合作为日常桌面上的轻松点缀。", suggestedTags: ["cups"], coverImageId: "img-001", orderedImageIds: ["img-001"], altTexts: [{ imageId: "img-001", altZh: "浅色背景中的小熊造型杯正面" }], confidence: 0.9, uncertainFields: [], warnings: [],
};

describe("intake schema and hard safety validation", () => {
  it("rejects non-dry-run or non-local LM Studio configuration", () => {
    const base = { rulesVersion: "v1", workspaceRoot: "E:\\HappyBeans-Inbox", directories: { incoming: "incoming", processing: "processing", completed: "completed", failed: "failed", output: "output" }, maxBatchImages: 30, maxImagesPerProduct: 10, analysisImageMaxPixels: 1024, modelName: "trusted", lmStudioBaseUrl: "https://cloud.example/v1", minimumConfidence: 0.6, retryCount: 2, requestTimeoutMs: 120000, generatePreview: true, runMode: "publish", allowedTags: [{ slug: "cups", nameZh: "水杯" }] };
    expect(validateConfig(base)).toMatchObject({ success: false });
  });

  it("rejects forbidden inferred facts and unknown tags even when the shape is valid", () => {
    const forbidden = validateDraft({ ...draft, descriptionZh: "500ml 陶瓷杯，可用于微波炉。" }, { groupId: "group-001", imageIds: ["img-001"] }, ["cups"]);
    expect(forbidden.success).toBe(false);
    if (forbidden.success) throw new Error("测试数据应被安全校验拒绝。");
    expect(forbidden.errors).toContain("草稿 descriptionZh 包含代码禁止从图片推断的材质声明（命中词：陶瓷）。");
    expect(validateDraft({ ...draft, suggestedTags: ["unknown"] }, { groupId: "group-001", imageIds: ["img-001"] }, ["cups"])).toMatchObject({ success: false });
  });

  it("only removes material terms in the controlled fallback and forces manual review", () => {
    const result = createControlledMaterialFallback({
      ...draft,
      titleZh: "透明玻璃小熊杯",
      descriptionZh: "透明玻璃杯放在木质桌面上。",
      altTexts: [{ imageId: "img-001", altZh: "木质背景中的透明玻璃小熊杯" }],
    }, { groupId: "group-001", imageIds: ["img-001"] }, ["cups"], 0.65);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.errors.join(" "));
    expect(result.value.titleZh).toBe("透明小熊杯");
    expect(result.value.descriptionZh).toBe("透明杯放在桌面上。");
    expect(result.value.altTexts[0].altZh).toBe("背景中的透明小熊杯");
    expect(result.value.confidence).toBe(0.64);
    expect(result.value.uncertainFields).toEqual(expect.arrayContaining(["titleZh", "descriptionZh", "altTexts.img-001"]));
    expect(result.value.warnings.at(-1)).toContain("必须人工复核");
    expect(createControlledMaterialFallback({ ...draft, descriptionZh: "容量 500ml。" }, { groupId: "group-001", imageIds: ["img-001"] }, ["cups"], 0.65)).toMatchObject({ success: false });
  });

  it("validates the complete manifest and rejects missing or duplicate image coverage", () => {
    const manifest = { schemaVersion: "0.1", batchId: "hb-0123456789abcdef", sourceFiles: [{ imageId: "img-001", originalFileName: "图.png", contentHash: "a".repeat(64), mimeType: "image/png", width: 720, height: 720, byteSize: 100 }], duplicateFiles: [], rejectedFiles: [], groups: [draft], modelName: "trusted", rulesVersion: "v1", createdAt: "2026-07-27T12:00:00.000Z", runMode: "dry_run" };
    expect(validateManifest(manifest, ["cups"])).toMatchObject({ success: true });
    expect(validateManifest({ ...manifest, groups: [] }, ["cups"])).toMatchObject({ success: false });
  });
});
