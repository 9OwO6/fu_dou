import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createControlledTestImage, scanIncomingImages } from "@/tools/happy-beans-intake/image-files.ts";
import { LmStudioClient } from "@/tools/happy-beans-intake/lm-studio-client.ts";
import type { IntakeConfig } from "@/tools/happy-beans-intake/types.ts";

const roots: string[] = [];
const originalFetch = global.fetch;

function config(): IntakeConfig {
  return {
    rulesVersion: "test-v1", workspaceRoot: "E:\\HappyBeans-Inbox", directories: { incoming: "incoming", processing: "processing", completed: "completed", failed: "failed", output: "output" }, maxBatchImages: 30, maxImagesPerProduct: 10, analysisImageMaxPixels: 512, modelName: "trusted-vision-model", lmStudioBaseUrl: "http://127.0.0.1:1234/v1", minimumConfidence: 0.65, retryCount: 2, requestTimeoutMs: 1000, generatePreview: true, runMode: "dry_run", allowedTags: [{ slug: "cups", nameZh: "水杯" }],
  };
}

async function imageFixture() {
  const root = await mkdtemp(join(tmpdir(), "happy-beans-model-"));
  roots.push(root);
  await createControlledTestImage(join(root, "incoming", "controlled.png"), "CONTROLLED", "#a9e3ea");
  return scanIncomingImages({ incomingDirectory: join(root, "incoming"), processingDirectory: join(root, "processing"), maxBatchImages: 30, analysisImageMaxPixels: 512 });
}

afterEach(async () => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    const resolved = resolve(root);
    if (!resolved.startsWith(resolve(tmpdir()))) throw new Error("Refusing to remove a non-temporary test directory.");
    await rm(resolved, { recursive: true, force: true });
  }
});

describe("LM Studio local client failure boundaries", () => {
  it("fails safely when the configured local model is unavailable", async () => {
    const scan = await imageFixture();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: "another-model" }] }), { status: 200 }));
    await expect(new LmStudioClient(config()).group(scan.images, scan.contactSheetPath, "RULES")).rejects.toThrow("未暴露配置模型");
  });

  it("classifies a timeout without falling back to a cloud API", async () => {
    const scan = await imageFixture();
    global.fetch = vi.fn(async () => { throw new DOMException("timed out", "TimeoutError"); });
    await expect(new LmStudioClient(config()).group(scan.images, scan.contactSheetPath, "RULES")).rejects.toThrow("请求超时");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/^http:\/\/127\.0\.0\.1:1234\//);
  });

  it("rejects invalid JSON and model references to unknown images", async () => {
    const scan = await imageFixture();
    const ready = new Response(JSON.stringify({ data: [{ id: "trusted-vision-model" }] }), { status: 200 });
    global.fetch = vi.fn()
      .mockResolvedValueOnce(ready)
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "not-json" } }] }), { status: 200 }));
    await expect(new LmStudioClient(config()).group(scan.images, scan.contactSheetPath, "RULES")).rejects.toThrow("无效 JSON");

    global.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: "trusted-vision-model" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ groups: [{ groupId: "group-001", imageIds: ["img-999"], confidence: 0.9, uncertaintyReason: "" }] }) } }] }), { status: 200 }));
    await expect(new LmStudioClient(config()).group(scan.images, scan.contactSheetPath, "RULES")).rejects.toThrow("imageIds 无效");
  });

  it("injects the current Markdown rules into the next model request", async () => {
    const scan = await imageFixture();
    const requestBodies: string[] = [];
    global.fetch = vi.fn(async (_url, init) => {
      if (!init || init.method === "GET") return new Response(JSON.stringify({ data: [{ id: "trusted-vision-model" }] }), { status: 200 });
      requestBodies.push(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ groups: [{ groupId: "group-001", imageIds: ["img-001"], confidence: 0.9, uncertaintyReason: "" }] }) } }] }), { status: 200 });
    });
    await new LmStudioClient(config()).group(scan.images, scan.contactSheetPath, "CUSTOM-RULE-MARKER");
    expect(requestBodies[0]).toContain("CUSTOM-RULE-MARKER");
  });
});
