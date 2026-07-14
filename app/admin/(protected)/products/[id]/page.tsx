import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageManager } from "@/components/admin/image-manager";
import { ProductActions } from "@/components/admin/product-actions";
import { ProductForm } from "@/components/admin/product-form";
import { ProductOperationsEditor } from "@/components/admin/product-operations-editor";
import { ProductCategorySelector } from "@/components/admin/product-category-selector";
import { VariantEditor } from "@/components/admin/variant-editor";
import { getAdminProduct, getAdminProductCategorySelection } from "@/lib/catalog/admin-data";
import { getAdminProductImages } from "@/lib/catalog/admin-images";
import { getAdminVariantConfiguration } from "@/lib/catalog/admin-variants";
import { isUuid } from "@/lib/catalog/admin-validation";

const statusLabels = { draft: "草稿", published: "已发布", archived: "已归档" } as const;

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [product, variantConfiguration, productImages, categorySelection] = await Promise.all([
    getAdminProduct(id),
    getAdminVariantConfiguration(id),
    getAdminProductImages(id),
    getAdminProductCategorySelection(id),
  ]);
  if (!product) notFound();
  const { saved } = await searchParams;
  const valueLabels = new Map(variantConfiguration.options.flatMap((option) => option.values.map((value) => [value.id, value.label])));
  const variantChoices = variantConfiguration.variants.map((variant) => ({
    id: variant.id,
    label: `${variant.optionValueIds.map((valueId) => valueLabels.get(valueId)).filter(Boolean).join(" / ") || "默认商品"} · ${variant.sku}`,
  }));

  return (
    <section className="space-y-6" aria-labelledby="edit-product-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-semibold text-sky-800 hover:underline" href="/admin/products">← 返回商品列表</Link>
          <div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-tight" id="edit-product-heading">{product.title || "未命名商品"}</h1><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{statusLabels[product.status]}</span></div>
          <p className="mt-2 font-mono text-sm text-slate-500">/{product.slug}</p>
        </div>
        <ProductActions product={product} />
      </div>
      {saved ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800" role="status">{saved === "duplicated" ? "副本已创建为草稿；规格和图片没有被复制。" : "商品草稿已创建。"}</p> : null}
      <ProductForm product={product} />
      <ProductCategorySelector productId={product.id} selection={categorySelection} />
      <div className="border-t border-slate-200 pt-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-sky-800">Phase 5C</p>
          <h2 className="mt-1 text-2xl font-semibold">商品图片</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">批量上传后可调整顺序、封面、替代文字和规格关联。Storage 与数据库写入使用补偿清理，失败时不会静默留下半完成记录。</p>
        </div>
        <ImageManager initialImages={productImages} key={productImages.map((image) => `${image.id}:${image.sortOrder}`).join("|")} productId={product.id} productTitle={product.title} variants={variantChoices} />
      </div>
      <div className="border-t border-slate-200 pt-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-sky-800">Phase 5B</p>
          <h2 className="mt-1 text-2xl font-semibold">规格、价格和库存</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">先维护规格和值，再生成完整组合。每个组合都需要唯一 SKU、有效 CAD 价格和非负库存；不销售的组合请禁用。</p>
        </div>
        <VariantEditor initialConfiguration={variantConfiguration} productId={product.id} />
      </div>
      <div className="border-t border-slate-200 pt-6">
        <div className="mb-5">
          <p className="text-sm font-semibold text-sky-800">Phase 5C</p>
          <h2 className="mt-1 text-2xl font-semibold">运营状态</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">维护新品发布时间和推荐开关；每个规格组合的原价与特价时间在上方规格区独立维护。</p>
        </div>
        <ProductOperationsEditor initialFeatured={product.isFeatured} initialPublishedAt={product.publishedAt} productId={product.id} productStatus={product.status} />
      </div>
    </section>
  );
}
