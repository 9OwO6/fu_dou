import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { createControlledTestImage, scanIncomingImages } from "@/tools/happy-beans-intake/image-files.ts";

const roots: string[] = [];

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "happy-beans-intake-"));
  roots.push(root);
  return { root, incoming: join(root, "incoming"), processing: join(root, "processing"), completed: join(root, "completed") };
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    const resolved = resolve(root);
    if (!resolved.startsWith(resolve(tmpdir()))) throw new Error("Refusing to remove a non-temporary test directory.");
    await rm(resolved, { recursive: true, force: true });
  }
});

describe("local intake file validation", () => {
  it("rejects an empty incoming folder", async () => {
    const paths = await fixture();
    await expect(scanIncomingImages({ incomingDirectory: paths.incoming, processingDirectory: paths.processing, maxBatchImages: 30, analysisImageMaxPixels: 512 })).rejects.toThrow("incoming 文件夹为空");
  });

  it("accepts one valid image with Chinese, spaces, and special characters without modifying it", async () => {
    const paths = await fixture();
    const source = join(paths.incoming, "小熊 杯 (正面)#1.png");
    await createControlledTestImage(source, "CONTROLLED TEST", "#a9e3ea");
    const before = await readFile(source);
    const result = await scanIncomingImages({ incomingDirectory: paths.incoming, processingDirectory: paths.processing, maxBatchImages: 30, analysisImageMaxPixels: 512 });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]).toMatchObject({ imageId: "img-001", originalFileName: "小熊 杯 (正面)#1.png", mimeType: "image/png" });
    expect(await readFile(source)).toEqual(before);
    expect(await readFile(result.contactSheetPath)).not.toHaveLength(0);
  });

  it("keeps multiple images, records content duplicates, and rejects invalid or corrupt files", async () => {
    const paths = await fixture();
    const first = join(paths.incoming, "一.png");
    await createControlledTestImage(first, "ONE", "#f7e653");
    await writeFile(join(paths.incoming, "重复副本.png"), await readFile(first));
    await createControlledTestImage(join(paths.incoming, "二.webp"), "TWO", "#f28fb2");
    await writeFile(join(paths.incoming, "说明.txt"), "not an image", "utf8");
    await writeFile(join(paths.incoming, "损坏.jpg"), Buffer.from("not-a-jpeg"));
    const result = await scanIncomingImages({ incomingDirectory: paths.incoming, processingDirectory: paths.processing, maxBatchImages: 30, analysisImageMaxPixels: 512 });
    expect(result.images).toHaveLength(2);
    expect(result.duplicateFiles).toHaveLength(1);
    expect(result.rejectedFiles.map((file) => file.originalFileName)).toEqual(expect.arrayContaining(["说明.txt", "损坏.jpg"]));
  });

  it("hard-fails when the folder contains more than 30 files", async () => {
    const paths = await fixture();
    await mkdir(paths.incoming, { recursive: true });
    for (let index = 0; index < 31; index += 1) await writeFile(join(paths.incoming, `${index}.txt`), String(index), "utf8");
    await expect(scanIncomingImages({ incomingDirectory: paths.incoming, processingDirectory: paths.processing, maxBatchImages: 30, analysisImageMaxPixels: 512 })).rejects.toThrow("超过 30");
  });
});
