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
          管理员认证、服务端会话和权限复核已启用。快速上新、正式商品、订单请求与受控首页运营已经开放。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["认证状态", "已验证管理员身份"],
          ["公众注册", "已关闭"],
          ["快速上新", "轻量新品墙试验已启用"],
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
          快速上新与正式商品保持独立：前者只管理图片、标签、可选文字/价格和咨询状态；后者继续承载 SKU、规格、库存、购物车与订单请求。
        </p>
      </div>
    </section>
  );
}
