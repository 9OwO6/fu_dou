import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminNavigation } from "@/components/admin/admin-navigation";
import { AdminAuthorizationError, requireAdmin } from "@/lib/auth/admin";

import { logoutAction } from "./actions";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      redirect(
        error.reason === "forbidden"
          ? "/admin/login?reason=forbidden"
          : "/admin/login?reason=session_required",
      );
    }
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-sky-700">Happy Beans / 福豆</p>
            <p className="text-lg font-semibold">管理后台</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{admin.displayName}</p>
              {admin.email ? <p className="text-xs text-slate-500">{admin.email}</p> : null}
            </div>
            <form action={logoutAction}>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <AdminNavigation />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
