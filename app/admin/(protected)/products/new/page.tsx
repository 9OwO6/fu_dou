import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "新建商品 | Happy Beans" };

export default function NewProductPage() {
  return (
    <section className="space-y-6" aria-labelledby="new-product-heading">
      <div>
        <Link className="text-sm font-semibold text-sky-800 hover:underline" href="/admin/products">← 返回商品列表</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight" id="new-product-heading">新建商品</h1>
        <p className="mt-2 text-slate-600">商品会先保存为草稿；规格、价格、库存和图片将在 Phase 5B/5C 添加。</p>
      </div>
      <ProductForm />
    </section>
  );
}
