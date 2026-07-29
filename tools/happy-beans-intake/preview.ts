import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { IntakeManifest } from "./types.ts";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function list(values: string[], empty: string) {
  if (!values.length) return `<span class="muted">${escapeHtml(empty)}</span>`;
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

export async function generatePreview(manifest: IntakeManifest, outputDirectory: string, minimumConfidence: number) {
  const sourceById = new Map(manifest.sourceFiles.map((file) => [file.imageId, file]));
  const groups = manifest.groups.map((group) => {
    const images = group.orderedImageIds.map((imageId) => {
      const source = sourceById.get(imageId);
      const alt = group.altTexts.find((entry) => entry.imageId === imageId)?.altZh ?? "商品图片";
      return `<figure class="thumb ${imageId === group.coverImageId ? "cover" : ""}"><img src="assets/${encodeURIComponent(imageId)}.jpg" alt="${escapeHtml(alt)}"><figcaption><strong>${escapeHtml(imageId)}</strong>${imageId === group.coverImageId ? " · 推荐封面" : ""}<br><span>${escapeHtml(source?.originalFileName ?? "未知文件")}</span></figcaption></figure>`;
    }).join("");
    const confidenceClass = group.confidence < minimumConfidence ? "low" : "good";
    return `<article class="group"><header><div><p class="eyebrow">${escapeHtml(group.groupId)}</p><h2>${escapeHtml(group.titleZh)}</h2></div><span class="confidence ${confidenceClass}">${Math.round(group.confidence * 100)}%</span></header><p class="description">${escapeHtml(group.descriptionZh)}</p><div class="tags">${group.suggestedTags.length ? group.suggestedTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("") : "<span class=\"empty-tag\">未建议标签</span>"}</div><div class="gallery">${images}</div><div class="notes"><section><h3>不确定字段</h3>${list(group.uncertainFields, "无")}</section><section><h3>警告</h3>${list(group.warnings, "无")}</section></div></article>`;
  }).join("\n");
  const duplicateList = manifest.duplicateFiles.map((file) => `${file.originalFileName}（重复于 ${file.duplicateOfImageId}）`);
  const rejectedList = manifest.rejectedFiles.map((file) => `${file.originalFileName}：${file.reason}`);
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Happy Beans 本地 AI 上新预览 · ${escapeHtml(manifest.batchId)}</title><style>
:root{color-scheme:light;--ink:#2f3133;--paper:#fffdf8;--yellow:#f7e653;--blue:#a9e3ea;--line:#e9e4d9;--warn:#b85454;--good:#4f8a4c}*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#fffdf8,#f7fbfc);color:var(--ink);font-family:"Microsoft YaHei",system-ui,sans-serif;overflow-wrap:anywhere}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:32px 0 64px}.hero{padding:28px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(135deg,#fff8b6,#dff7fa);box-shadow:0 16px 45px #a9e3ea35}.eyebrow{margin:0 0 6px;font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(1.7rem,4vw,3rem);margin-bottom:10px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px}.metric{padding:14px;border-radius:16px;background:#ffffffc9}.metric strong{display:block;font-size:1.55rem}.issues,.group{margin-top:22px;border:1px solid var(--line);border-radius:24px;background:white;padding:22px}.issues{display:grid;grid-template-columns:1fr 1fr;gap:20px}.group header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.confidence{flex:none;padding:8px 12px;border-radius:999px;font-weight:800}.confidence.good{background:#e8f5e7;color:var(--good)}.confidence.low{background:#fff0ef;color:var(--warn)}.description{font-size:1.04rem;line-height:1.75}.tags{display:flex;flex-wrap:wrap;gap:8px}.tags span{padding:5px 10px;border-radius:999px;background:#eef9fb;border:1px solid var(--blue)}.tags .empty-tag{background:#f4f4f4;border-color:#ddd;color:#666}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:14px;margin-top:20px}.thumb{margin:0;border:2px solid transparent;border-radius:18px;background:var(--paper);overflow:hidden}.thumb.cover{border-color:var(--yellow)}.thumb img{display:block;width:100%;aspect-ratio:1/1;object-fit:contain;background:#f7f4ed}.thumb figcaption{padding:10px;font-size:.86rem;line-height:1.45}.thumb figcaption span{color:#686868}.notes{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.notes section{padding:14px;border-radius:16px;background:#faf9f5}.notes h3,.issues h2{font-size:1rem;margin-bottom:8px}ul{margin:0;padding-left:1.2rem}.muted{color:#777}footer{padding-top:24px;color:#666;font-size:.86rem}@media(max-width:720px){main{width:min(100% - 20px,1180px);padding-top:12px}.hero,.group,.issues{border-radius:18px;padding:17px}.summary{grid-template-columns:1fr 1fr}.issues,.notes{grid-template-columns:1fr}.group header{align-items:center}.gallery{grid-template-columns:1fr 1fr}}@media(max-width:420px){.gallery{grid-template-columns:1fr}.summary{grid-template-columns:1fr 1fr}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style></head><body><main><section class="hero"><p class="eyebrow">本地离线草稿 · dry run</p><h1>Happy Beans 上新检查台</h1><p>此页面只用于人工检查，不会上传、发布或修改网站数据。</p><div class="summary"><div class="metric"><strong>${manifest.sourceFiles.length + manifest.duplicateFiles.length + manifest.rejectedFiles.length}</strong>本批文件</div><div class="metric"><strong>${manifest.sourceFiles.length}</strong>有效图片</div><div class="metric"><strong>${manifest.groups.length}</strong>AI 商品组</div><div class="metric"><strong>${manifest.duplicateFiles.length + manifest.rejectedFiles.length}</strong>重复 / 失败</div></div></section><section class="issues"><div><h2>重复图片</h2>${list(duplicateList, "无")}</div><div><h2>失败图片</h2>${list(rejectedList, "无")}</div></section>${groups}<footer>批次 ${escapeHtml(manifest.batchId)} · 模型 ${escapeHtml(manifest.modelName)} · 规则 ${escapeHtml(manifest.rulesVersion)} · ${escapeHtml(manifest.createdAt)}</footer></main></body></html>`;
  const previewPath = join(outputDirectory, "preview.html");
  await writeFile(previewPath, html, "utf8");
  return previewPath;
}
