import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createControlledTestImage } from "@/tools/happy-beans-intake/image-files.ts";
import type { IntakeModelClient } from "@/tools/happy-beans-intake/lm-studio-client.ts";
import { ModelDraftValidationError } from "@/tools/happy-beans-intake/lm-studio-client.ts";
import { runIntake } from "@/tools/happy-beans-intake/pipeline.ts";
import type { GroupingResult, IntakeImage, ProductDraft } from "@/tools/happy-beans-intake/types.ts";
import { validateManifest } from "@/tools/happy-beans-intake/validation.ts";

const roots: string[] = [];

class ControlledModel implements IntakeModelClient {
  draftAttempts = new Map<string, number>();
  draftCorrections = new Map<string, Array<string | undefined>>();
  constructor(private readonly failFirstGroupOnce = false) {}
  async group(images: IntakeImage[]): Promise<GroupingResult> {
    return { groups: images.map((image, index) => ({ groupId: `group-${String(index + 1).padStart(3, "0")}`, imageIds: [image.imageId], confidence: 0.91, uncertaintyReason: "受控测试图片，仅验证管线。" })) };
  }
  async draft(group: GroupingResult["groups"][number], _images: IntakeImage[], _rules: string, correction?: string): Promise<ProductDraft> {
    const attempts = (this.draftAttempts.get(group.groupId) ?? 0) + 1;
    this.draftAttempts.set(group.groupId, attempts);
    this.draftCorrections.set(group.groupId, [...(this.draftCorrections.get(group.groupId) ?? []), correction]);
    if (this.failFirstGroupOnce && group.groupId === "group-001" && attempts === 1) throw new Error("controlled group failure");
    const imageId = group.imageIds[0];
    return { groupId: group.groupId, imageIds: group.imageIds, titleZh: `受控测试商品 ${group.groupId}`, descriptionZh: "这是明确标记的受控测试草稿，只用于验证本地处理管线。", suggestedTags: ["gifts"], coverImageId: imageId, orderedImageIds: group.imageIds, altTexts: [{ imageId, altZh: "受控测试图中的抽象商品轮廓" }], confidence: 0.86, uncertainFields: ["真实商品信息"], warnings: ["必须用真实商品照片人工复核"] };
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "happy-beans-pipeline-"));
  roots.push(root);
  const configPath = join(root, "import.config.json");
  const rulesPath = join(root, "AI_RULES.md");
  await writeFile(configPath, JSON.stringify({ rulesVersion: "controlled-test-v1", workspaceRoot: root, directories: { incoming: "incoming", processing: "processing", completed: "completed", failed: "failed", output: "output" }, maxBatchImages: 30, maxImagesPerProduct: 10, analysisImageMaxPixels: 512, modelName: "controlled-local-model", lmStudioBaseUrl: "http://127.0.0.1:1234/v1", minimumConfidence: 0.65, retryCount: 2, requestTimeoutMs: 1000, generatePreview: true, runMode: "dry_run", allowedTags: [{ slug: "gifts", nameZh: "礼物" }] }), "utf8");
  await writeFile(rulesPath, "# CONTROLLED TEST RULES\n不得虚构商品事实。", "utf8");
  return { root, configPath, rulesPath };
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    const resolved = resolve(root);
    if (!resolved.startsWith(resolve(tmpdir()))) throw new Error("Refusing to remove a non-temporary test directory.");
    await rm(resolved, { recursive: true, force: true });
  }
});

describe("recoverable local intake pipeline", () => {
  it("runs a multi-image controlled batch, retries only the failed group, and emits a validated manifest and preview", async () => {
    const paths = await fixture();
    await createControlledTestImage(join(paths.root, "incoming", "商品 A.png"), "CONTROLLED A", "#f7e653");
    await createControlledTestImage(join(paths.root, "incoming", "商品 B.webp"), "CONTROLLED B", "#a9e3ea");
    const model = new ControlledModel(true);
    const progress: string[] = [];
    const result = await runIntake({ configPath: paths.configPath, rulesPath: paths.rulesPath, modelClient: model, now: () => new Date("2026-07-27T12:00:00.000Z"), onProgress: (message) => progress.push(message) });
    expect(result.status).toBe("completed");
    expect(model.draftAttempts.get("group-001")).toBe(2);
    expect(model.draftAttempts.get("group-002")).toBe(1);
    expect(model.draftCorrections.get("group-001")).toEqual([undefined, "controlled group failure"]);
    const manifest = JSON.parse(await readFile(result.manifestPath!, "utf8"));
    expect(validateManifest(manifest, ["gifts"])).toMatchObject({ success: true });
    expect(manifest).toMatchObject({ runMode: "dry_run", modelName: "controlled-local-model", rulesVersion: "controlled-test-v1" });
    const preview = await readFile(result.previewPath!, "utf8");
    expect(preview).toContain("Happy Beans 上新检查台");
    expect(preview).toContain("商品 A.png");
    expect(progress.some((message) => message.includes("正在扫描 incoming"))).toBe(true);
    expect(progress.some((message) => message.includes("安全校验未通过，正在局部重试"))).toBe(true);
    expect(progress.at(-1)).toContain("已完成");
  });

  it("reports the failure path and does not create an empty batch output directory", async () => {
    const paths = await fixture();
    await createControlledTestImage(join(paths.root, "incoming", "失败测试.png"), "FAIL", "#f7e653");
    const progress: string[] = [];
    const failingModel: IntakeModelClient = {
      group: async (images) => ({ groups: [{ groupId: "group-001", imageIds: [images[0].imageId], confidence: 0.9, uncertaintyReason: "" }] }),
      draft: async () => { throw new Error("controlled drafting failure"); },
    };

    await expect(runIntake({ configPath: paths.configPath, rulesPath: paths.rulesPath, modelClient: failingModel, onProgress: (message) => progress.push(message) })).rejects.toThrow("controlled drafting failure");
    const processingEntries = await readdir(join(paths.root, "processing"));
    const batchId = processingEntries.find((entry) => entry.startsWith("hb-"));
    expect(batchId).toBeTruthy();
    await expect(access(join(paths.root, "output", batchId!))).rejects.toThrow();
    expect(progress.at(-1)).toContain("failed");
    expect(progress.at(-1)).toContain("安全停止");
  });

  it("uses a low-confidence controlled fallback only after material-only retries are exhausted", async () => {
    const paths = await fixture();
    await createControlledTestImage(join(paths.root, "incoming", "透明杯.png"), "MATERIAL", "#a9e3ea");
    const progress: string[] = [];
    let attempts = 0;
    const materialModel: IntakeModelClient = {
      group: async (images) => ({ groups: [{ groupId: "group-001", imageIds: [images[0].imageId], confidence: 0.9, uncertaintyReason: "" }] }),
      draft: async (group) => {
        attempts += 1;
        const imageId = group.imageIds[0];
        const invalid = { groupId: group.groupId, imageIds: group.imageIds, titleZh: "透明玻璃杯", descriptionZh: "透明玻璃杯放在桌面上。", suggestedTags: ["gifts"], coverImageId: imageId, orderedImageIds: group.imageIds, altTexts: [{ imageId, altZh: "木质背景中的透明玻璃杯" }], confidence: 0.9, uncertainFields: [], warnings: [] };
        throw new ModelDraftValidationError([`草稿 titleZh 包含代码禁止从图片推断的材质声明（命中词：玻璃）。`], invalid);
      },
    };

    const result = await runIntake({ configPath: paths.configPath, rulesPath: paths.rulesPath, modelClient: materialModel, onProgress: (message) => progress.push(message) });
    expect(result.status).toBe("completed");
    expect(attempts).toBe(3);
    const manifest = JSON.parse(await readFile(result.manifestPath!, "utf8"));
    expect(manifest.groups[0].titleZh).toBe("透明杯");
    expect(manifest.groups[0].confidence).toBe(0.64);
    expect(manifest.groups[0].warnings.at(-1)).toContain("必须人工复核");
    expect(progress.some((message) => message.includes("受控删除禁用材质词"))).toBe(true);
  });

  it("does not regenerate the same completed batch", async () => {
    const paths = await fixture();
    await createControlledTestImage(join(paths.root, "incoming", "same.png"), "SAME", "#89c43f");
    const model = new ControlledModel();
    const first = await runIntake({ configPath: paths.configPath, rulesPath: paths.rulesPath, modelClient: model });
    const second = await runIntake({ configPath: paths.configPath, rulesPath: paths.rulesPath, modelClient: { group: async () => { throw new Error("must not run"); }, draft: async () => { throw new Error("must not run"); } } });
    expect(first.status).toBe("completed");
    expect(second).toEqual({ status: "already_completed", batchId: first.batchId });
  });
});
