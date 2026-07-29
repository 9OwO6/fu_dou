import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

import sharp from "sharp";

import type { DuplicateFile, IntakeImage, RejectedFile } from "./types.ts";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MIME_BY_EXTENSION = new Map<string, IntakeImage["mimeType"]>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
] as const);

const SHARP_FORMAT_BY_MIME = new Map([
  ["image/jpeg", "jpeg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
] as const);

export class IntakeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntakeFileError";
  }
}

export class AlreadyCompletedError extends Error {
  readonly batchId: string;

  constructor(batchId: string) {
    super(`批次 ${batchId} 已完成；未重复生成。`);
    this.name = "AlreadyCompletedError";
    this.batchId = batchId;
  }
}

async function sha256File(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] ?? character);
}

export type ScanResult = {
  batchId: string;
  images: IntakeImage[];
  duplicateFiles: DuplicateFile[];
  rejectedFiles: RejectedFile[];
  contactSheetPath: string;
  totalFiles: number;
};

export async function scanIncomingImages(options: {
  incomingDirectory: string;
  processingDirectory: string;
  completedDirectory?: string;
  maxBatchImages: number;
  analysisImageMaxPixels: number;
}): Promise<ScanResult> {
  await mkdir(options.incomingDirectory, { recursive: true });
  const entries = (await readdir(options.incomingDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .sort((left, right) => left.name.localeCompare(right.name, "zh-Hans-CN"));
  if (!entries.length) throw new IntakeFileError("incoming 文件夹为空；请放入 1–30 张 JPEG、PNG 或 WebP 图片。");
  if (entries.length > options.maxBatchImages) throw new IntakeFileError(`本批共有 ${entries.length} 个文件，超过 ${options.maxBatchImages} 个文件的硬性上限。`);

  const loaded = await Promise.all(entries.map(async (entry) => {
    const sourcePath = join(options.incomingDirectory, entry.name);
    const fileStat = await stat(sourcePath);
    return { entry, sourcePath, fileStat, hash: await sha256File(sourcePath) };
  }));
  const batchSeed = loaded.map((file) => file.hash).sort().join(":");
  const batchId = `hb-${createHash("sha256").update(batchSeed).digest("hex").slice(0, 16)}`;
  if (options.completedDirectory) {
    try {
      await access(join(options.completedDirectory, `${batchId}.json`));
      throw new AlreadyCompletedError(batchId);
    } catch (error) {
      if (error instanceof AlreadyCompletedError) throw error;
    }
  }
  const batchProcessingDirectory = join(options.processingDirectory, batchId);
  const thumbnailDirectory = join(batchProcessingDirectory, "thumbnails");
  await mkdir(thumbnailDirectory, { recursive: true });

  const images: IntakeImage[] = [];
  const duplicateFiles: DuplicateFile[] = [];
  const rejectedFiles: RejectedFile[] = [];
  const acceptedByHash = new Map<string, IntakeImage>();

  for (const file of loaded) {
    const extension = extname(file.entry.name).toLowerCase();
    const mimeType = MIME_BY_EXTENSION.get(extension);
    if (!mimeType) {
      rejectedFiles.push({ originalFileName: file.entry.name, reason: "不支持的文件类型；仅支持 JPEG、PNG、WebP。" });
      continue;
    }
    if (file.fileStat.size === 0) {
      rejectedFiles.push({ originalFileName: file.entry.name, reason: "空文件。" });
      continue;
    }
    if (file.fileStat.size > MAX_SOURCE_BYTES) {
      rejectedFiles.push({ originalFileName: file.entry.name, reason: "文件超过 10 MiB 安全上限。" });
      continue;
    }
    const duplicateOf = acceptedByHash.get(file.hash);
    if (duplicateOf) {
      duplicateFiles.push({ originalFileName: file.entry.name, contentHash: file.hash, duplicateOfImageId: duplicateOf.imageId });
      continue;
    }

    try {
      const image = sharp(await readFile(file.sourcePath), { failOn: "error" });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height || metadata.pages && metadata.pages > 1 || metadata.format !== SHARP_FORMAT_BY_MIME.get(mimeType)) {
        throw new Error("图片格式、尺寸或页数不符合要求。");
      }
      const imageId = `img-${String(images.length + 1).padStart(3, "0")}`;
      const thumbnailPath = join(thumbnailDirectory, `${imageId}.jpg`);
      await image.clone().rotate().resize({ width: options.analysisImageMaxPixels, height: options.analysisImageMaxPixels, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 86, chromaSubsampling: "4:4:4" }).toFile(thumbnailPath);
      const accepted: IntakeImage = {
        imageId,
        originalFileName: file.entry.name,
        contentHash: file.hash,
        mimeType,
        width: metadata.width,
        height: metadata.height,
        byteSize: file.fileStat.size,
        sourcePath: file.sourcePath,
        thumbnailPath,
      };
      images.push(accepted);
      acceptedByHash.set(file.hash, accepted);
    } catch {
      rejectedFiles.push({ originalFileName: file.entry.name, reason: "图片损坏、内容与扩展名不一致，或无法安全解码。" });
    }
  }

  if (!images.length) throw new IntakeFileError("本批没有可安全解码的有效图片；原始文件未被修改。");
  const contactSheetPath = join(batchProcessingDirectory, "contact-sheet.jpg");
  await createContactSheet(images, contactSheetPath);
  return { batchId, images, duplicateFiles, rejectedFiles, contactSheetPath, totalFiles: entries.length };
}

async function createContactSheet(images: IntakeImage[], outputPath: string) {
  const columns = Math.min(4, images.length);
  const rows = Math.ceil(images.length / columns);
  const cellWidth = 300;
  const cellHeight = 340;
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (const [index, image] of images.entries()) {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    const picture = await sharp(image.thumbnailPath).resize({ width: 280, height: 280, fit: "contain", background: "#fffdf8" }).jpeg().toBuffer();
    composites.push({ input: picture, left: left + 10, top: top + 10 });
    const label = Buffer.from(`<svg width="280" height="36" xmlns="http://www.w3.org/2000/svg"><rect width="280" height="36" rx="8" fill="#A9E3EA"/><text x="140" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#2F3133">${escapeXml(image.imageId)}</text></svg>`);
    composites.push({ input: label, left: left + 10, top: top + 294 });
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: "#fffdf8" } }).composite(composites).jpeg({ quality: 88 }).toFile(outputPath);
}

export async function copyPreviewAssets(images: IntakeImage[], outputDirectory: string) {
  const assetsDirectory = join(outputDirectory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  for (const image of images) await copyFile(image.thumbnailPath, join(assetsDirectory, `${image.imageId}.jpg`));
  return assetsDirectory;
}

export async function createControlledTestImage(path: string, label: string, color: string) {
  await mkdir(dirname(path), { recursive: true });
  const safeLabel = escapeXml(label);
  const svg = Buffer.from(`<svg width="720" height="720" xmlns="http://www.w3.org/2000/svg"><rect width="720" height="720" fill="${color}"/><rect x="140" y="130" width="440" height="420" rx="80" fill="#fffdf8" stroke="#2F3133" stroke-width="12"/><text x="360" y="620" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#2F3133">${safeLabel}</text></svg>`);
  const extension = extname(path).toLowerCase();
  const image = sharp(svg);
  if (extension === ".webp") await image.webp().toFile(path);
  else if (extension === ".jpg" || extension === ".jpeg") await image.jpeg().toFile(path);
  else await image.png().toFile(path);
}

export async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function displayName(path: string) {
  return basename(path);
}
