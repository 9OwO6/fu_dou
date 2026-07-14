import { CategoryManager } from "@/components/admin/category-manager";
import { listAdminCategories } from "@/lib/catalog/admin-data";

export const metadata = { title: "分类管理 | Happy Beans" };

export default async function AdminCategoriesPage() {
  const categories = await listAdminCategories();
  return <section className="space-y-6" aria-labelledby="categories-heading"><div><p className="text-sm font-semibold text-sky-700">Phase 5A</p><h1 className="mt-2 text-3xl font-semibold tracking-tight" id="categories-heading">分类管理</h1><p className="mt-2 text-slate-600">创建、编辑、显示或隐藏分类，并用排序值控制顺序。</p></div><CategoryManager categories={categories} /></section>;
}
