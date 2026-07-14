export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">后台内容加载中</span>
      <div className="h-9 w-48 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            className="h-28 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
            key={item}
          />
        ))}
      </div>
    </div>
  );
}
