"use client";

export default function HomepageError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h1 className="text-xl font-semibold text-rose-950">首页配置暂时无法加载</h1>
      <p className="mt-2 text-rose-900">请检查本地 Supabase 连接后重试；现有公开首页配置不会因此被修改。</p>
      <button className="mt-4 rounded-xl bg-rose-900 px-4 py-2 font-semibold text-white" onClick={reset} type="button">重试</button>
    </section>
  );
}

