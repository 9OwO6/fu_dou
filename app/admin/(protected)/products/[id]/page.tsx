import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageManager } from "@/components/admin/image-manager";
import { AdminDisclosure } from "@/components/admin/admin-disclosure";
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
          <Link className="text-sm font-semibold text-[#24697a] hover:underline" href="/admin/products">← 返回商品列表</Link>
          <div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight sm:text-4xl" id="edit-product-heading">{product.title || "未命名商品"}</h1><span className="rounded-full bg-[#fff7c2] px-3 py-1 text-xs font-semibold text-[#8a5c00]">{statusLabels[product.status]}</span></div>
          <p className="mt-2 font-mono text-sm text-[#62676d]">/{product.slug}</p>
        </div>
        <ProductActions product={product} />
      </div>
      {saved ? (
        <p
          className={`rounded-xl border p-4 ${saved === "created_image_failed" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
          role="status"
        >
          {saved === "duplicated"
            ? "副本已创建为草稿；规格和图片没有被复制。"
            : saved === "created_with_images"
              ? "商品草稿与首批图片已创建。请继续完善分类、规格、价格和库存。"
              : saved === "created_image_failed"
                ? "商品草稿已创建，但首批图片没有完成上传。请在下方“商品图片”区域重新选择并上传。"
                : "商品草稿已创建。"}
        </p>
      ) : null}
      <ProductForm product={product} />
      <ProductCategorySelector productId={product.id} selection={categorySelection} />
      <AdminDisclosure description="批量上传后可调整顺序、封面、替代文字和规格关联。" title="商品图片">
        <ImageManager initialImages={productImages} key={productImages.map((image) => `${image.id}:${image.sortOrder}`).join("|")} productId={product.id} productTitle={product.title} variants={variantChoices} />
      </AdminDisclosure>
      <AdminDisclosure description="维护规格和值并生成完整组合；每个组合独立管理 SKU、价格和库存。" title="规格、价格和库存">
        <VariantEditor initialConfiguration={variantConfiguration} productId={product.id} />
      </AdminDisclosure>
      <AdminDisclosure description="维护新品发布时间和推荐开关；特价时间在规格区独立维护。" title="运营状态">
        <ProductOperationsEditor initialFeatured={product.isFeatured} initialPublishedAt={product.publishedAt} productId={product.id} productStatus={product.status} />
      </AdminDisclosure>
    </section>
  );
}
