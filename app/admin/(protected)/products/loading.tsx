export default function ProductsLoading() {
  return <div aria-busy="true" aria-live="polite" className="space-y-4"><span className="sr-only">商品内容加载中</span><div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" /><div className="h-24 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" /><div className="h-80 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" /></div>;
}
