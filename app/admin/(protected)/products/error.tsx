"use client";

export default function ProductsError({ reset }: { reset: () => void }) {
  return <section className="rounded-2xl border border-rose-200 bg-white p-6" role="alert"><h1 className="text-xl font-semibold">商品管理暂时无法加载</h1><p className="mt-2 text-slate-600">请检查连接后重试。</p><button className="mt-5 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white" onClick={reset} type="button">重试</button></section>;
}
