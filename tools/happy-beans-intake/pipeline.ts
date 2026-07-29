import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AlreadyCompletedError, copyPreviewAssets, scanIncomingImages, writeJson } from "./image-files.ts";
import { LmStudioClient, ModelDraftValidationError, type IntakeModelClient } from "./lm-studio-client.ts";
import { generatePreview } from "./preview.ts";
import type { IntakeManifest, PipelineStage, PipelineState, ProductDraft } from "./types.ts";
import { createControlledMaterialFallback, resolveWorkspaceDirectories, validateConfig, validateDraft, validateGrouping, validateManifest } from "./validation.ts";

const TOOL_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = resolve(TOOL_DIRECTORY, "..", "..");
export const DEFAULT_CONFIG_PATH = join(REPOSITORY_ROOT, "config", "content-ai", "import.config.json");
export const DEFAULT_RULES_PATH = join(REPOSITORY_ROOT, "config", "content-ai", "AI_RULES.md");

export type IntakeRunResult = {
  status: "completed" | "already_completed";
  batchId: string;
  manifestPath?: string;
  previewPath?: string;
};

class StageError extends Error {
  readonly stage: PipelineStage;

  constructor(stage: PipelineStage, message: string) {
    super(message);
    this.name = "StageError";
    this.stage = stage;
  }
}

export async function loadIntakeConfig(configPath = DEFAULT_CONFIG_PATH) {
  let value: unknown;
  try {
    value = JSON.parse(await readFile(configPath, "utf8"));
  } catch {
    throw new Error("无法读取 import.config.json；请确认它是有效 UTF-8 JSON。");
  }
  const parsed = validateConfig(value);
  if (!parsed.success) throw new Error(`运行配置无效：${parsed.errors.join(" ")}`);
  return parsed.value;
}

async function loadState(path: string, batchId: string): Promise<PipelineState> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as Partial<PipelineState>;
    if (value.batchId === batchId && value.drafts && typeof value.drafts === "object") return value as PipelineState;
  } catch {
    // A missing or interrupted state file safely restarts from the first incomplete stage.
  }
  return { batchId, stage: "file_validation", drafts: {}, updatedAt: new Date().toISOString() };
}

async function saveState(path: string, state: PipelineState) {
  state.updatedAt = new Date().toISOString();
  await writeJson(path, state);
}

async function retry<T>(attempts: number, operation: (lastError: Error | undefined, attempt: number, totalAttempts: number) => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await operation(lastError instanceof Error ? lastError : undefined, attempt + 1, attempts); } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("本地模型调用失败。");
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "未知错误";
  return message.replace(/[A-Za-z]:\\[^\r\n]+/g, "[local-path]").slice(0, 1000);
}

export async function runIntake(options: {
  configPath?: string;
  rulesPath?: string;
  modelClient?: IntakeModelClient;
  now?: () => Date;
  onProgress?: (message: string) => void;
} = {}): Promise<IntakeRunResult> {
  const report = options.onProgress ?? (() => undefined);
  report("正在读取本地配置与 AI 规则……");
  const config = await loadIntakeConfig(options.configPath);
  const directories = resolveWorkspaceDirectories(config);
  await Promise.all(Object.values(directories).map((directory) => mkdir(directory, { recursive: true })));
  const rules = await readFile(options.rulesPath ?? DEFAULT_RULES_PATH, "utf8");
  if (!rules.trim()) throw new Error("AI_RULES.md 不能为空。");
  let batchId = "unassigned";
  let stage: PipelineStage = "file_validation";
  try {
    report("正在扫描 incoming，并校验图片格式、大小与重复内容……");
    const scan = await scanIncomingImages({
      incomingDirectory: directories.incoming,
      processingDirectory: directories.processing,
      completedDirectory: directories.completed,
      maxBatchImages: config.maxBatchImages,
      analysisImageMaxPixels: config.analysisImageMaxPixels,
    });
    batchId = scan.batchId;
    report(`批次 ${batchId}：${scan.images.length} 张有效图片、${scan.duplicateFiles.length} 张重复、${scan.rejectedFiles.length} 张拒绝。`);
    const batchProcessingDirectory = join(directories.processing, batchId);
    const statePath = join(batchProcessingDirectory, "state.json");
    const outputDirectory = join(directories.output, batchId);
    const state = await loadState(statePath, batchId);
    const model = options.modelClient ?? new LmStudioClient(config);
    const imageIds = scan.images.map((image) => image.imageId);

    stage = "grouping";
    const savedGrouping = state.grouping ? validateGrouping(state.grouping, imageIds, config.maxImagesPerProduct) : null;
    if (!savedGrouping?.success) {
      state.grouping = await retry(config.retryCount + 1, (_lastError, attempt, totalAttempts) => {
        report(`正在请求本地模型分组（第 ${attempt}/${totalAttempts} 次）……`);
        return model.group(scan.images, scan.contactSheetPath, rules);
      });
      state.stage = "grouping";
      await saveState(statePath, state);
      report(`图片分组完成：共 ${state.grouping.groups.length} 组。`);
    } else {
      state.grouping = savedGrouping.value;
      report(`已复用断点中的 ${state.grouping.groups.length} 个图片分组。`);
    }

    stage = "drafting";
    for (const [groupIndex, group] of state.grouping.groups.entries()) {
      const groupLabel = `${group.groupId}（${groupIndex + 1}/${state.grouping.groups.length}，${group.imageIds.length} 张图）`;
      const saved = state.drafts[group.groupId];
      const savedDraft = saved ? validateDraft(saved, group, config.allowedTags.map((tag) => tag.slug)) : null;
      if (savedDraft?.success) {
        state.drafts[group.groupId] = savedDraft.value;
        report(`已复用 ${groupLabel} 的合格草稿。`);
        continue;
      }
      let draft: ProductDraft;
      try {
        draft = await retry(config.retryCount + 1, (lastError, attempt, totalAttempts) => {
          report(`${attempt === 1 ? "正在生成" : "安全校验未通过，正在局部重试"} ${groupLabel}（第 ${attempt}/${totalAttempts} 次）……`);
          return model.draft(
            group,
            scan.images,
            rules,
            lastError instanceof ModelDraftValidationError ? lastError.correctionContext : lastError?.message,
          );
        });
      } catch (error) {
        if (!(error instanceof ModelDraftValidationError)) throw error;
        const controlled = createControlledMaterialFallback(
          error.invalidDraft,
          group,
          config.allowedTags.map((tag) => tag.slug),
          config.minimumConfidence,
        );
        if (!controlled.success) throw error;
        draft = controlled.value;
        report(`${groupLabel} 连续重试仍只命中材质禁区；已受控删除禁用材质词、降低置信度并写入人工复核警告。`);
      }
      state.drafts[group.groupId] = draft;
      state.stage = "drafting";
      await saveState(statePath, state);
      report(`${groupLabel} 草稿已通过安全校验并保存断点。`);
    }

    stage = "manifest";
    report("所有分组草稿已完成，正在校验 manifest……");
    const createdAt = (options.now ?? (() => new Date()))().toISOString();
    const manifest: IntakeManifest = {
      schemaVersion: "0.1",
      batchId,
      sourceFiles: scan.images.map((image) => ({
        imageId: image.imageId,
        originalFileName: image.originalFileName,
        contentHash: image.contentHash,
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        byteSize: image.byteSize,
      })),
      duplicateFiles: scan.duplicateFiles,
      rejectedFiles: scan.rejectedFiles,
      groups: state.grouping.groups.map((group) => state.drafts[group.groupId]).filter((draft): draft is ProductDraft => Boolean(draft)),
      modelName: config.modelName,
      rulesVersion: config.rulesVersion,
      createdAt,
      runMode: "dry_run",
    };
    const validManifest = validateManifest(manifest, config.allowedTags.map((tag) => tag.slug));
    if (!validManifest.success) throw new StageError(stage, `manifest schema 校验失败：${validManifest.errors.join(" ")}`);
    report("manifest 校验通过，正在复制预览缩略图……");
    await copyPreviewAssets(scan.images, outputDirectory);
    const manifestPath = join(outputDirectory, "manifest.json");
    await writeJson(manifestPath, validManifest.value);

    stage = "preview";
    report("正在生成本地只读预览……");
    const previewPath = config.generatePreview ? await generatePreview(validManifest.value, outputDirectory, config.minimumConfidence) : undefined;
    state.stage = "completed";
    await saveState(statePath, state);
    await writeJson(join(directories.completed, `${batchId}.json`), { batchId, status: "completed", manifest: join(batchId, "manifest.json"), preview: previewPath ? join(batchId, "preview.html") : null, completedAt: createdAt });
    report(`批次 ${batchId} 已完成。`);
    return { status: "completed", batchId, manifestPath, previewPath };
  } catch (error) {
    if (error instanceof AlreadyCompletedError) {
      report(`批次 ${error.batchId} 已完成，本次不会重复生成。`);
      return { status: "already_completed", batchId: error.batchId };
    }
    const message = safeErrorMessage(error);
    const failureName = `${batchId}-${Date.now()}.json`;
    const failedStage = error instanceof StageError ? error.stage : stage;
    const failurePath = join(directories.failed, failureName);
    await writeFile(failurePath, `${JSON.stringify({ batchId, status: "failed", stage: failedStage, message, failedAt: new Date().toISOString() }, null, 2)}\n`, "utf8");
    report(`批次已在 ${failedStage} 阶段安全停止。失败摘要：${failurePath}`);
    throw new StageError(failedStage, message);
  }
}
