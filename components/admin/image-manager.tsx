/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deleteProductImageAction,
  saveProductImagesAction,
  type MediaActionState,
} from "@/app/admin/(protected)/products/[id]/media-actions";
import type { AdminProductImage } from "@/lib/catalog/admin-images";
import {
  readImageDimensions,
  releasePendingImagePreviews,
  type PendingProductImage,
  uploadPendingProductImages,
} from "@/lib/catalog/client-image-upload";
import {
  MAX_IMAGE_BATCH,
  validateClientImageFile,
} from "@/lib/catalog/media-validation";

import { SubmitButton } from "./submit-button";

const initialState: MediaActionState = { status: "idle", message: "" };
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200";

type VariantChoice = { id: string; label: string };

export function ImageManager({
  productId,
  productTitle,
  initialImages,
  variants,
}: {
  productId: string;
  productTitle: string;
  initialImages: AdminProductImage[];
  variants: VariantChoice[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingImagesRef = useRef<PendingProductImage[]>([]);
  const [images, setImages] = useState(initialImages);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveState, saveAction] = useActionState(saveProductImagesAction.bind(null, productId), initialState);

  useEffect(() => () => releasePendingImagePreviews(pendingImagesRef.current), []);

  function replacePendingImages(next: PendingProductImage[]) {
    releasePendingImagePreviews(pendingImagesRef.current);
    pendingImagesRef.current = next;
    setPendingImages(next);
  }

  async function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length > MAX_IMAGE_BATCH) {
      setMessage(`每次最多选择 ${MAX_IMAGE_BATCH} 张图片。`);
      return;
    }
    const next: PendingProductImage[] = [];
    for (const [index, file] of selected.entries()) {
      const validation = validateClientImageFile(file);
      if (!validation.success) {
        next.forEach((image) => URL.revokeObjectURL(image.previewUrl));
        setMessage(validation.message);
        return;
      }
      const dimensions = await readImageDimensions(file);
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        altText: `${productTitle || "商品"} 图片 ${images.length + index + 1}`,
        altTextEn: "",
        variantId: "",
        ...dimensions,
      });
    }
    replacePendingImages(next);
    setMessage("");
  }

  function updatePending(index: number, values: Partial<PendingProductImage>) {
    setPendingImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, ...values } : image));
  }

  async function uploadSelectedImages() {
    if (!pendingImages.length || pendingImages.some((image) => !image.altText.trim())) {
      setMessage("请选择图片并为每张图片填写替代文字。");
      return;
    }
    setIsUploading(true);
    setMessage("");
    const result = await uploadPendingProductImages(productId, pendingImages);
    if (result.status === "error") {
      setMessage(result.message);
      setIsUploading(false);
      return;
    }

    replacePendingImages([]);
    if (fileInput.current) fileInput.current.value = "";
    setMessage(result.message);
    setIsUploading(false);
    router.refresh();
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function setCover(index: number) {
    setImages((current) => [current[index], ...current.filter((_, imageIndex) => imageIndex !== index)]);
  }

  function updateImage(index: number, values: Partial<AdminProductImage>) {
    setImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, ...values } : image));
  }

  async function deleteImage(image: AdminProductImage) {
    if (!window.confirm(`确认永久删除“${image.altText}”？此操作会同时删除 Storage 文件和数据库记录。`)) return;
    setIsDeleting(true);
    const result = await deleteProductImageAction(productId, image.id);
    setMessage(result.message);
    if (result.status === "success") {
      setImages((current) => current.filter((item) => item.id !== image.id));
      router.refresh();
    }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="image-upload-heading">
        <h3 className="text-lg font-semibold" id="image-upload-heading">批量上传与预览</h3>
        <p className="mt-1 text-sm text-slate-600">每批最多 20 张；只接受扩展名与 MIME 一致的 JPEG、PNG、WebP，单张不超过 10 MiB。文件直接上传到受 RLS 保护的 Storage。</p>
        <label className="mt-4 block text-sm font-medium">
          选择商品图片
          <input accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className={`${inputClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-900`} multiple onChange={(event) => void selectFiles(event.target.files)} ref={fileInput} type="file" />
        </label>
        {pendingImages.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingImages.map((image, index) => (
              <article className="rounded-xl border border-slate-200 p-4" key={`${image.file.name}-${image.file.lastModified}`}>
                <img alt="待上传预览" className="aspect-[4/5] w-full rounded-xl bg-slate-100 object-cover" src={image.previewUrl} />
                <p className="mt-2 truncate text-xs text-slate-500">{image.file.name} · {(image.file.size / 1024 / 1024).toFixed(2)} MiB</p>
                <label className="mt-3 block text-sm font-medium">替代文字
                  <input className={`${inputClass} mt-1`} maxLength={300} onChange={(event) => updatePending(index, { altText: event.target.value })} value={image.altText} />
                </label>
                <label className="mt-3 block text-sm font-medium">English alt text
                  <input className={`${inputClass} mt-1`} lang="en" maxLength={300} onChange={(event) => updatePending(index, { altTextEn: event.target.value })} value={image.altTextEn} />
                </label>
                <label className="mt-3 block text-sm font-medium">关联规格（可选）
                  <select className={`${inputClass} mt-1`} onChange={(event) => updatePending(index, { variantId: event.target.value })} value={image.variantId}>
                    <option value="">商品通用图</option>
                    {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
                  </select>
                </label>
              </article>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className={message.includes("失败") || message.includes("无法") || message.includes("必须") ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role="status">{message}</p>
          <button className="min-h-11 rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={isUploading || !pendingImages.length} onClick={() => void uploadSelectedImages()} type="button">{isUploading ? "上传并登记中…" : "上传所选图片"}</button>
        </div>
      </section>

      <form action={saveAction} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <input name="images" type="hidden" value={JSON.stringify(images.map((image) => ({ id: image.id, altText: image.altText, altTextEn: image.altTextEn, variantId: image.variantId })))} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-semibold">已登记图片</h3><p className="mt-1 text-sm text-slate-600">第一张始终是封面。调整后需保存；删除会立即执行并进行一致性补偿。</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{images.length} / 100</span>
        </div>
        {images.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">尚未上传图片。可以先上传现有商品照片，之后逐步替换。</div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {images.map((image, index) => (
              <article className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[128px_1fr]" key={image.id}>
                <div>
                  <div className="relative">
                    <img alt={image.altText} className="aspect-[4/5] w-full rounded-xl bg-slate-100 object-cover" src={image.signedUrl} />
                    {index === 0 ? <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-1 text-xs font-bold text-slate-900">封面</span> : null}
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-500">位置 {index + 1}</p>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium">替代文字
                    <input className={`${inputClass} mt-1`} maxLength={300} onChange={(event) => updateImage(index, { altText: event.target.value })} value={image.altText} />
                  </label>
                  <label className="mt-3 block text-sm font-medium">English alt text
                    <input className={`${inputClass} mt-1`} lang="en" maxLength={300} onChange={(event) => updateImage(index, { altTextEn: event.target.value })} value={image.altTextEn} />
                    <span className="mt-1 block text-xs font-normal text-slate-500">留空时，有图片的商品不会进入英文站。</span>
                  </label>
                  <label className="mt-3 block text-sm font-medium">关联规格（可选）
                    <select className={`${inputClass} mt-1`} onChange={(event) => updateImage(index, { variantId: event.target.value || null })} value={image.variantId ?? ""}>
                      <option value="">商品通用图</option>
                      {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
                    </select>
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50" disabled={index === 0} onClick={() => moveImage(index, -1)} type="button">上移</button>
                    <button className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold disabled:opacity-50" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)} type="button">下移</button>
                    <button className="min-h-11 rounded-xl border border-amber-400 px-3 text-sm font-semibold disabled:opacity-50" disabled={index === 0} onClick={() => setCover(index)} type="button">设为封面</button>
                    <button className="min-h-11 rounded-xl border border-rose-300 px-3 text-sm font-semibold text-rose-700 disabled:opacity-50" disabled={isDeleting} onClick={() => void deleteImage(image)} type="button">删除</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p aria-live="polite" className={saveState.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role={saveState.status === "error" ? "alert" : "status"}>{saveState.message}</p>
          <SubmitButton pendingLabel="保存图片设置中…">保存图片设置</SubmitButton>
        </div>
      </form>
    </div>
  );
}
