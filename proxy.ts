import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const locale = request.nextUrl.pathname.match(/^\/(en|zh)(?:\/|$)/)?.[1]
    ?? (request.nextUrl.pathname.startsWith("/admin") ? "zh" : "en");
  request.headers.set("x-happy-beans-locale", locale);
  if (request.nextUrl.pathname.startsWith("/admin")) return updateSupabaseSession(request);
  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
