"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "./actions";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "正在验证…" : "登录后台"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="email">
          管理员邮箱
        </label>
        <input
          aria-describedby={state.error ? "login-error" : undefined}
          autoComplete="username"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-3 focus:ring-sky-100"
          id="email"
          inputMode="email"
          maxLength={320}
          name="email"
          placeholder="name@example.com"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="password">
          密码
        </label>
        <input
          aria-describedby={state.error ? "login-error" : undefined}
          autoComplete="current-password"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-3 focus:ring-sky-100"
          id="password"
          maxLength={1024}
          minLength={6}
          name="password"
          required
          type="password"
        />
      </div>

      {state.error ? (
        <p
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          id="login-error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
