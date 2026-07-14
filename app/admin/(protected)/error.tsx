"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-2xl border border-rose-200 bg-white p-6" role="alert">
      <h1 className="text-xl font-semibold text-slate-950">后台暂时无法加载</h1>
      <p className="mt-2 text-slate-600">请稍后重试；如果问题持续存在，请联系网站维护人员。</p>
      <button
        className="mt-5 rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        onClick={reset}
        type="button"
      >
        重试
      </button>
    </section>
  );
}
