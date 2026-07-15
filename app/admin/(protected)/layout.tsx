import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";

import brandLogo from "@/assets/brand/happy-beans-logo-primary.jpg";
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
    <div className="min-h-screen bg-[#fffdf8] text-[#292c30]">
      <header className="border-b border-[#e5e0d7] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Image alt="" className="size-10 rounded-full object-cover" height={40} priority src={brandLogo} width={40} />
            <div>
              <p className="text-lg font-bold tracking-tight">Happy Beans / 福豆</p>
              <p className="text-xs font-medium text-[#62676d]">管理后台</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{admin.displayName}</p>
              {admin.email ? <p className="text-xs text-[#62676d]">{admin.email}</p> : null}
            </div>
            <form action={logoutAction}>
              <button
                className="min-h-11 rounded-xl border border-[#c9c3b8] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[#fff7c2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16758a]"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full min-w-0 max-w-[1440px] lg:min-h-[calc(100vh-65px)] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 max-w-full overflow-hidden border-b border-[#e5e0d7] bg-white px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
          <AdminNavigation />
        </aside>
        <main className="min-w-0 px-5 py-7 sm:px-8 lg:px-10 lg:py-9 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
