import Link from "next/link";

export default function ProductNotFound() {
  return <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-xl font-semibold">找不到这个商品</h1><p className="mt-2 text-slate-600">商品可能不存在，或链接已经失效。</p><Link className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white" href="/admin/products">返回商品列表</Link></section>;
}
