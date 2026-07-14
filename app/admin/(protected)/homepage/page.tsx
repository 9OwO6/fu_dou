import { HomepageManager } from "@/components/admin/homepage-manager";
import { getAdminHomepageConfiguration, getHomepageAdminChoices } from "@/lib/homepage/data";

export const metadata = { title: "首页运营 | Happy Beans" };

export default async function AdminHomepagePage() {
  const [configuration, choices] = await Promise.all([
    getAdminHomepageConfiguration(),
    getHomepageAdminChoices(),
  ]);
  return (
    <section aria-labelledby="homepage-heading" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">Phase 9</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" id="homepage-heading">首页内容与运营</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">维护固定模块的内容、显隐、顺序和选品。这里只接受受控字段，不支持 HTML、JavaScript、任意 CSS 或自由页面搭建。</p>
        </div>
        <a className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600" href="/zh" rel="noreferrer" target="_blank">查看公开首页 ↗</a>
      </div>
      <HomepageManager choices={choices} initialConfiguration={configuration} />
    </section>
  );
}

