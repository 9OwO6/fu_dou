import { QuickShowcaseUploader } from "@/components/admin/quick-showcase-uploader";
import { listShowcaseTags } from "@/lib/showcase/data";

export const metadata = { title: "快速发布新品 | Happy Beans" };

export default async function NewQuickListingPage() {
  const tags = await listShowcaseTags("zh", true);
  return (
    <section aria-labelledby="quick-listing-new-heading" className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-sky-700">快速上新试验</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" id="quick-listing-new-heading">像发朋友圈一样上新</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">一次丢入大量图片，默认一图一商品；需要时合并多图、批量加标签。名称、说明和价格都可留空，不需要 SKU、规格或精确库存。</p>
      </div>
      <QuickShowcaseUploader tags={tags} />
    </section>
  );
}
