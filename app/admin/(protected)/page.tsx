export const metadata = {
  title: "后台概览 | Happy Beans",
};

export default function AdminOverviewPage() {
  return (
    <section aria-labelledby="admin-overview-title" className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-sky-700">安全管理后台</p>
        <h1 id="admin-overview-title" className="mt-2 text-3xl font-semibold tracking-tight">
          后台概览
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          管理员认证、服务端会话和权限复核已启用。商品、订单请求与受控首页运营已经开放。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["认证状态", "已验证管理员身份"],
          ["公众注册", "已关闭"],
          ["首页运营", "Phase 9 已启用"],
        ].map(([label, value]) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5" key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <h2 className="font-semibold text-sky-950">当前范围</h2>
        <p className="mt-2 leading-7 text-sky-900">
          可维护固定首页模块的内容、显隐、顺序和选品；所有字段按模块 schema 校验，不支持任意 HTML、JavaScript 或自由页面搭建。
        </p>
      </div>
    </section>
  );
}
