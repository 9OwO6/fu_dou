export default function CategoriesLoading() {
  return <div aria-busy="true" aria-live="polite" className="space-y-4"><span className="sr-only">分类内容加载中</span><div className="h-10 w-56 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" /><div className="h-72 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" /><div className="h-48 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" /></div>;
}
