import { QuickShowcaseUploader } from "@/components/admin/quick-showcase-uploader";
import { listShowcaseTags } from "@/lib/showcase/data";

export const metadata = { title: "快速发布新品 | Happy Beans" };

export default async function NewQuickListingPage() {
  const tags = await listShowcaseTags("zh", true);
  return (
    <section aria-labelledby="quick-listing-new-heading" className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-sky-700">无 AI 快速上新</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" id="quick-listing-new-heading">上传图片，填价格，就能发布</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">一次选择最多 50 张图片，默认一图一商品；同一商品有多张图时再勾选合并。系统会自动补上安全的中英文名称、说明和图片文字，不需要 AI、SKU、规格或精确库存。</p>
      </div>
      <QuickShowcaseUploader tags={tags} />
    </section>
  );
}
