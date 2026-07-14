import { redirect } from "next/navigation";

import { getAdminSessionState } from "@/lib/auth/admin";
import zhMessages from "@/messages/zh.json";

import { LoginForm } from "./login-form";

export const metadata = {
  title: `${zhMessages.adminLogin.title} | Happy Beans`,
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const { admin } = await getAdminSessionState();
  if (admin) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-amber-50/70 px-5 py-12">
      <section
        aria-labelledby="admin-login-title"
        className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-9"
      >
        <div className="mb-8 space-y-3">
          <p className="text-sm font-semibold tracking-wide text-sky-700">
            {zhMessages.shared.phaseLabel}
          </p>
          <h1 id="admin-login-title" className="text-3xl font-semibold tracking-tight text-slate-950">
            {zhMessages.adminLogin.title}
          </h1>
          <p className="leading-7 text-slate-600">{zhMessages.adminLogin.description}</p>
        </div>
        {reason ? (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            {reason === "forbidden"
              ? "当前账号没有后台管理员权限。"
              : "请先登录管理员账号。"}
          </p>
        ) : null}
        <LoginForm />
        <p className="mt-6 text-sm leading-6 text-slate-500">
          本站不提供公众注册。账号由店主通过受控流程建立。
        </p>
      </section>
    </main>
  );
}
