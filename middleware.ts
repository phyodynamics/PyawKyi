import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ═══════════════════════════════════════════════════
  // PUBLIC routes — always accessible (no auth needed)
  // Only the welcome page and auth callback are public.
  // API routes handle their own auth internally.
  // ═══════════════════════════════════════════════════
  const publicRoutes = ["/welcome", "/auth/callback"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // Allow API routes through — they enforce auth internally
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // ═══════════════════════════════════════════════════
  // AUTHENTICATED routes — require login
  // ═══════════════════════════════════════════════════
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  // Fetch user profile to check status
  const { data: profile } = await supabase
    .from("users")
    .select("payment_status, gemini_api_key")
    .eq("id", user.id)
    .single();

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  // ─── Admin route protection ───
  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // ─── Payment gating ───
  const isPaid = profile?.payment_status === "paid" || isAdmin;
  const hasGeminiKey = !!profile?.gemini_api_key;

  // Not paid → redirect to pending
  if (!isPaid && pathname !== "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = "/pending";
    return NextResponse.redirect(url);
  }

  // Paid but no Gemini key → redirect to setup
  if (isPaid && !hasGeminiKey && pathname !== "/setup" && !isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup";
    return NextResponse.redirect(url);
  }

  // Paid user trying to access /pending → redirect to main app
  if (isPaid && pathname === "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = hasGeminiKey ? "/" : "/setup";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
