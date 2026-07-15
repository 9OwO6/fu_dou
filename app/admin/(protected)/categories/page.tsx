import { CategoryManager } from "@/components/admin/category-manager";
import { InfoIcon } from "@/components/admin/admin-icons";
import { listAdminCategories } from "@/lib/catalog/admin-data";

export const metadata = { title: "分类管理 | Happy Beans" };

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  return (
    <section className="space-y-7" aria-labelledby="categories-heading">
      <div className="grid items-start gap-5 xl:grid-cols-[1fr_440px]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" id="categories-heading">分类管理</h1>
          <p className="mt-3 leading-7 text-[#62676d]">创建、编辑、显示或隐藏分类，并用排序值控制顺序。</p>
        </div>
        <aside className="flex gap-3 rounded-2xl border border-[#cfecef] bg-[#e8f7f9] p-4 text-sm leading-6 text-[#24697a]">
          <InfoIcon className="mt-0.5 size-5 shrink-0" />
          <p>分类会在商品浏览和筛选中使用。仅勾选“在公开分类中显示”的分类会展示给顾客。</p>
        </aside>
      </div>
      <CategoryManager categories={categories} />
    </section>
  );
}
