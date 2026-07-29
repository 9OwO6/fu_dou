import { readFile } from "node:fs/promises";

import type { GroupingResult, IntakeConfig, IntakeImage, ProductDraft } from "./types.ts";
import { draftJsonSchema, groupingJsonSchema, validateDraft, validateGrouping } from "./validation.ts";
import { draftPrompt, groupingPrompt } from "./prompts.ts";

type ChatContent = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

export interface IntakeModelClient {
  group(images: IntakeImage[], contactSheetPath: string, rules: string): Promise<GroupingResult>;
  draft(group: GroupingResult["groups"][number], images: IntakeImage[], rules: string, correction?: string): Promise<ProductDraft>;
}

export class ModelDraftValidationError extends Error {
  readonly correctionContext: string;
  readonly errors: string[];
  readonly invalidDraft: unknown;

  constructor(errors: string[], invalidDraft: unknown) {
    super(`模型草稿校验失败：${errors.join(" ")}`);
    this.name = "ModelDraftValidationError";
    this.errors = errors;
    this.invalidDraft = invalidDraft;
    this.correctionContext = JSON.stringify({ errors, invalidDraft });
  }
}

type ModelListResponse = { data?: Array<{ id?: unknown }> };
type ChatResponse = { choices?: Array<{ message?: { content?: unknown } }> };

export class LmStudioClient implements IntakeModelClient {
  private readonly config: IntakeConfig;

  constructor(config: IntakeConfig) {
    this.config = config;
  }

  async assertReady() {
    const response = await this.fetchLocal(`${this.config.lmStudioBaseUrl}/models`, { method: "GET" });
    const body = await response.json() as ModelListResponse;
    const models = Array.isArray(body.data) ? body.data.map((entry) => entry.id).filter((id): id is string => typeof id === "string") : [];
    if (!models.includes(this.config.modelName)) {
      throw new Error(`本地模型未就绪：LM Studio 未暴露配置模型 ${this.config.modelName}。`);
    }
  }

  async group(images: IntakeImage[], contactSheetPath: string, rules: string) {
    await this.assertReady();
    const dataUrl = await imageDataUrl(contactSheetPath, "image/jpeg");
    const value = await this.chat("happy_beans_grouping", groupingJsonSchema, [
      { type: "text", text: groupingPrompt(images, rules) },
      { type: "image_url", image_url: { url: dataUrl } },
    ]);
    const parsed = validateGrouping(value, images.map((image) => image.imageId), this.config.maxImagesPerProduct);
    if (!parsed.success) throw new Error(`模型分组校验失败：${parsed.errors.join(" ")}`);
    return parsed.value;
  }

  async draft(group: GroupingResult["groups"][number], images: IntakeImage[], rules: string, correction?: string) {
    const groupImages = images.filter((image) => group.imageIds.includes(image.imageId));
    const content: ChatContent[] = [{ type: "text", text: draftPrompt(group, groupImages, this.config.allowedTags, rules, correction) }];
    for (const image of groupImages) content.push({ type: "image_url", image_url: { url: await imageDataUrl(image.thumbnailPath, "image/jpeg") } });
    const value = await this.chat("happy_beans_product_draft", draftJsonSchema, content, correction ? 0.8 : 0.2);
    const parsed = validateDraft(value, group, this.config.allowedTags.map((tag) => tag.slug));
    if (!parsed.success) throw new ModelDraftValidationError(parsed.errors, value);
    return parsed.value;
  }

  private async chat(name: string, schema: object, content: ChatContent[], temperature = 0.2) {
    const response = await this.fetchLocal(`${this.config.lmStudioBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.config.modelName,
        messages: [
          { role: "system", content: "你是 Happy Beans 的本地离线商品图片整理助手。严格服从 schema 与安全边界。" },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
        temperature,
        max_tokens: 1800,
        stream: false,
      }),
    });
    const body = await response.json() as ChatResponse;
    const raw = body.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) throw new Error("LM Studio 返回空内容。");
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new Error("LM Studio 返回无效 JSON。");
    }
  }

  private async fetchLocal(url: string, init: RequestInit) {
    const endpoint = new URL(url);
    if (endpoint.protocol !== "http:" || endpoint.hostname !== "127.0.0.1" || endpoint.port !== "1234") throw new Error("已阻止非本机 LM Studio 请求。");
    try {
      const response = await fetch(endpoint, { ...init, signal: AbortSignal.timeout(this.config.requestTimeoutMs) });
      if (!response.ok) throw new Error(`LM Studio HTTP ${response.status}`);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") throw new Error("LM Studio 请求超时。");
      throw error;
    }
  }
}

async function imageDataUrl(path: string, mimeType: string) {
  const buffer = await readFile(path);
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
