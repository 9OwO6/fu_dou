import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "新建商品 | Happy Beans" };

export default function NewProductPage() {
  return (
    <section className="space-y-6" aria-labelledby="new-product-heading">
      <div>
        <Link className="text-sm font-semibold text-sky-800 hover:underline" href="/admin/products">← 返回商品列表</Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight" id="new-product-heading">新建商品</h1>
        <p className="mt-2 text-slate-600">填写基础内容并选择商品图片；提交后会先安全创建草稿，再自动上传图片。规格、价格和库存可在商品详情中继续完善。</p>
      </div>
      <ProductForm />
    </section>
  );
}
