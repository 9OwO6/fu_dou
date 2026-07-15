"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/admin/(protected)/products/actions";
import type { AdminProductDetail } from "@/lib/catalog/admin-data";
import {
  readImageDimensions,
  releasePendingImagePreviews,
  type PendingProductImage,
  uploadPendingProductImages,
} from "@/lib/catalog/client-image-upload";
import { MAX_IMAGE_BATCH, validateClientImageFile } from "@/lib/catalog/media-validation";

import { SubmitButton } from "./submit-button";

const initialState: ProductActionState = { status: "idle", message: "", fieldErrors: {} };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="mt-1 text-sm text-rose-700" id={id}>{message}</p> : null;
}

const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100";

export function ProductForm({ product }: { product?: AdminProductDetail }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const completionStarted = useRef(false);
  const pendingImagesRef = useRef<PendingProductImage[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [imageMessage, setImageMessage] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => () => releasePendingImagePreviews(pendingImagesRef.current), []);

  useEffect(() => {
    if (product || state.status !== "success" || !state.productId || completionStarted.current) return;
    completionStarted.current = true;
    setIsCompleting(true);
    const productId = state.productId;
    const selectedImages = pendingImagesRef.current;

    if (selectedImages.length === 0) {
      router.replace(`/admin/products/${productId}?saved=created`);
      return;
    }

    setImageMessage(`草稿已创建，正在上传 ${selectedImages.length} 张图片…`);
    void (async () => {
      try {
        const result = await uploadPendingProductImages(productId, selectedImages);
        router.replace(`/admin/products/${productId}?saved=${result.status === "success" ? "created_with_images" : "created_image_failed"}`);
      } catch {
        router.replace(`/admin/products/${productId}?saved=created_image_failed`);
      }
    })();
  }, [product, router, state.productId, state.status]);

  function replacePendingImages(next: PendingProductImage[]) {
    releasePendingImagePreviews(pendingImagesRef.current);
    pendingImagesRef.current = next;
    setPendingImages(next);
  }

  async function selectInitialImages(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files);
    if (selected.length > MAX_IMAGE_BATCH) {
      setImageMessage(`每次最多选择 ${MAX_IMAGE_BATCH} 张图片。`);
      return;
    }

    const formValues = formRef.current ? new FormData(formRef.current) : null;
    const title = formValues?.get("title");
    const titlePrefix = typeof title === "string" && title.trim() ? title.trim() : "商品";
    const next: PendingProductImage[] = [];
    for (const [index, file] of selected.entries()) {
      const validation = validateClientImageFile(file);
      if (!validation.success) {
        releasePendingImagePreviews(next);
        setImageMessage(validation.message);
        return;
      }
      const dimensions = await readImageDimensions(file);
      next.push({
        file,
        previewUrl: URL.createObjectURL(file),
        altText: `${titlePrefix} 图片 ${index + 1}`,
        altTextEn: "",
        variantId: "",
        ...dimensions,
      });
    }
    replacePendingImages(next);
    setImageMessage("");
  }

  function updatePendingImage(index: number, field: "altText" | "altTextEn", altText: string) {
    setPendingImages((current) => {
      const next = current.map((image, imageIndex) => imageIndex === index ? { ...image, [field]: altText } : image);
      pendingImagesRef.current = next;
      return next;
    });
  }

  function removePendingImage(index: number) {
    setPendingImages((current) => {
      URL.revokeObjectURL(current[index].previewUrl);
      const next = current.filter((_, imageIndex) => imageIndex !== index);
      pendingImagesRef.current = next;
      if (fileInput.current && next.length === 0) fileInput.current.value = "";
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-8" ref={formRef}>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="product-basic-heading">
        <h2 className="text-lg font-semibold" id="product-basic-heading">基础内容</h2>
        <p className="mt-1 text-sm text-slate-600">网址标识中英文共用；中文内容必填，英文可分阶段补齐。英文缺失的商品不会出现在英文站。</p>
        <div className="mt-5 grid gap-5">
          <label className="block font-medium" htmlFor="slug">
            网址标识 <span className="text-rose-600" aria-hidden="true">*</span>
            <input aria-describedby={state.fieldErrors.slug ? "slug-error" : "slug-help"} aria-invalid={Boolean(state.fieldErrors.slug)} autoCapitalize="none" className={inputClass} defaultValue={product?.slug} id="slug" maxLength={160} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            <span className="mt-1 block text-sm font-normal text-slate-500" id="slug-help">仅使用小写字母、数字和连字符，例如 cat-mug。</span>
            <FieldError id="slug-error" message={state.fieldErrors.slug} />
          </label>
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="block font-medium" htmlFor="title">
              中文标题 <span className="text-rose-600" aria-hidden="true">*</span>
              <input aria-describedby={state.fieldErrors.title ? "title-error" : undefined} aria-invalid={Boolean(state.fieldErrors.title)} className={inputClass} defaultValue={product?.title} id="title" maxLength={200} name="title" required />
              <FieldError id="title-error" message={state.fieldErrors.title} />
            </label>
            <label className="block font-medium" htmlFor="titleEn">
              English title
              <input aria-describedby={state.fieldErrors.titleEn ? "title-en-error" : "title-en-help"} aria-invalid={Boolean(state.fieldErrors.titleEn)} className={inputClass} defaultValue={product?.titleEn} id="titleEn" lang="en" maxLength={200} name="titleEn" />
              <span className="mt-1 block text-sm font-normal text-slate-500" id="title-en-help">填写任意英文内容时必填；留空则英文站隐藏此商品。</span>
              <FieldError id="title-en-error" message={state.fieldErrors.titleEn} />
            </label>
            <label className="block font-medium" htmlFor="shortDescription">
              中文简短描述
              <textarea aria-describedby={state.fieldErrors.shortDescription ? "short-description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.shortDescription)} className={inputClass} defaultValue={product?.shortDescription} id="shortDescription" maxLength={300} name="shortDescription" rows={3} />
              <FieldError id="short-description-error" message={state.fieldErrors.shortDescription} />
            </label>
            <label className="block font-medium" htmlFor="shortDescriptionEn">
              English short description
              <textarea aria-describedby={state.fieldErrors.shortDescriptionEn ? "short-description-en-error" : undefined} aria-invalid={Boolean(state.fieldErrors.shortDescriptionEn)} className={inputClass} defaultValue={product?.shortDescriptionEn} id="shortDescriptionEn" lang="en" maxLength={300} name="shortDescriptionEn" rows={3} />
              <FieldError id="short-description-en-error" message={state.fieldErrors.shortDescriptionEn} />
            </label>
            <label className="block font-medium" htmlFor="description">
              中文商品描述
              <textarea aria-describedby={state.fieldErrors.description ? "description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.description)} className={inputClass} defaultValue={product?.description} id="description" maxLength={10000} name="description" rows={9} />
              <FieldError id="description-error" message={state.fieldErrors.description} />
            </label>
            <label className="block font-medium" htmlFor="descriptionEn">
              English description
              <textarea aria-describedby={state.fieldErrors.descriptionEn ? "description-en-error" : undefined} aria-invalid={Boolean(state.fieldErrors.descriptionEn)} className={inputClass} defaultValue={product?.descriptionEn} id="descriptionEn" lang="en" maxLength={10000} name="descriptionEn" rows={9} />
              <FieldError id="description-en-error" message={state.fieldErrors.descriptionEn} />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="product-seo-heading">
        <h2 className="text-lg font-semibold" id="product-seo-heading">SEO</h2>
        <p className="mt-1 text-sm text-slate-500">留空时，公开页面会使用商品标题与描述生成默认值。</p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="block font-medium" htmlFor="seoTitle">
            中文 SEO 标题
            <input aria-describedby={state.fieldErrors.seoTitle ? "seo-title-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoTitle)} className={inputClass} defaultValue={product?.seoTitle} id="seoTitle" maxLength={70} name="seoTitle" />
            <FieldError id="seo-title-error" message={state.fieldErrors.seoTitle} />
          </label>
          <label className="block font-medium" htmlFor="seoTitleEn">
            English SEO title
            <input aria-describedby={state.fieldErrors.seoTitleEn ? "seo-title-en-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoTitleEn)} className={inputClass} defaultValue={product?.seoTitleEn} id="seoTitleEn" lang="en" maxLength={70} name="seoTitleEn" />
            <FieldError id="seo-title-en-error" message={state.fieldErrors.seoTitleEn} />
          </label>
          <label className="block font-medium" htmlFor="seoDescription">
            中文 SEO 描述
            <textarea aria-describedby={state.fieldErrors.seoDescription ? "seo-description-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoDescription)} className={inputClass} defaultValue={product?.seoDescription} id="seoDescription" maxLength={160} name="seoDescription" rows={3} />
            <FieldError id="seo-description-error" message={state.fieldErrors.seoDescription} />
          </label>
          <label className="block font-medium" htmlFor="seoDescriptionEn">
            English SEO description
            <textarea aria-describedby={state.fieldErrors.seoDescriptionEn ? "seo-description-en-error" : undefined} aria-invalid={Boolean(state.fieldErrors.seoDescriptionEn)} className={inputClass} defaultValue={product?.seoDescriptionEn} id="seoDescriptionEn" lang="en" maxLength={160} name="seoDescriptionEn" rows={3} />
            <FieldError id="seo-description-en-error" message={state.fieldErrors.seoDescriptionEn} />
          </label>
        </div>
      </section>

      {!product ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="initial-images-heading">
          <h2 className="text-lg font-semibold" id="initial-images-heading">商品图片</h2>
          <p className="mt-1 text-sm text-slate-600">可以在创建商品时一起选择图片。系统会先创建草稿，再将图片上传为商品通用图；创建后仍可调整封面、顺序和规格关联。</p>
          <label className="mt-5 block font-medium" htmlFor="initialProductImages">
            选择商品图片
            <input
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-900`}
              id="initialProductImages"
              multiple
              onChange={(event) => void selectInitialImages(event.target.files)}
              ref={fileInput}
              type="file"
            />
          </label>
          <p className="mt-2 text-sm text-slate-500">每次最多 20 张 JPEG、PNG 或 WebP；单张不超过 10 MiB。上传前请检查预览和替代文字。</p>

          {pendingImages.length ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingImages.map((image, index) => (
                <article className="rounded-xl border border-slate-200 p-4" key={`${image.file.name}-${image.file.lastModified}`}>
                  <img alt="待上传预览" className="aspect-[4/5] w-full rounded-xl bg-slate-100 object-cover" src={image.previewUrl} />
                  <p className="mt-2 truncate text-xs text-slate-500">{image.file.name} · {(image.file.size / 1024 / 1024).toFixed(2)} MiB</p>
                  <label className="mt-3 block text-sm font-medium">
                    替代文字 <span className="text-rose-600" aria-hidden="true">*</span>
                    <input
                      className={`${inputClass} mt-1`}
                      maxLength={300}
                      onChange={(event) => updatePendingImage(index, "altText", event.target.value)}
                      required
                      value={image.altText}
                    />
                  </label>
                  <label className="mt-3 block text-sm font-medium">
                    English alt text
                    <input
                      className={`${inputClass} mt-1`}
                      lang="en"
                      maxLength={300}
                      onChange={(event) => updatePendingImage(index, "altTextEn", event.target.value)}
                      value={image.altTextEn}
                    />
                  </label>
                  <button
                    className="mt-3 min-h-11 rounded-xl border border-rose-300 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                    onClick={() => removePendingImage(index)}
                    type="button"
                  >
                    移除此图片
                  </button>
                </article>
              ))}
            </div>
          ) : null}
          <p
            aria-live="polite"
            className={`mt-4 text-sm ${imageMessage.includes("失败") || imageMessage.includes("必须") || imageMessage.includes("最多") ? "text-rose-700" : "text-sky-800"}`}
            role="status"
          >
            {imageMessage}
          </p>
        </section>
      ) : null}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
        <p aria-live="polite" className={state.status === "error" ? "text-sm text-rose-700" : "text-sm text-emerald-700"} role={state.status === "error" ? "alert" : undefined}>
          {isCompleting && imageMessage ? imageMessage : state.message}
        </p>
        <SubmitButton disabled={isCompleting || Boolean(state.productId)} pendingLabel={product ? "保存中…" : "正在创建草稿…"}>
          {product ? "保存商品" : pendingImages.length ? "创建草稿并上传图片" : "创建草稿"}
        </SubmitButton>
      </div>
    </form>
  );
}
