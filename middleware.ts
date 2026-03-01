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
  // BYPASS: Auth callback must always be accessible
  // ═══════════════════════════════════════════════════
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  // Allow API routes through — they enforce auth internally
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // ═══════════════════════════════════════════════════
  // UNAUTHENTICATED users
  // ═══════════════════════════════════════════════════
  if (!user) {
    // Unauthenticated users can ONLY access /welcome
    if (pathname === "/welcome") {
      return supabaseResponse;
    }
    // Everything else → redirect to /welcome
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  // ═══════════════════════════════════════════════════
  // AUTHENTICATED users — fetch profile for gating
  // ═══════════════════════════════════════════════════
  const { data: profile } = await supabase
    .from("users")
    .select("payment_status, gemini_api_key")
    .eq("id", user.id)
    .single();

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  const isPaid = profile?.payment_status === "paid" || isAdmin;
  const hasGeminiKey = !!profile?.gemini_api_key;

  // ─── Logged-in users must NEVER see /welcome ───
  // Redirect them to the appropriate page based on their status
  if (pathname === "/welcome") {
    const url = request.nextUrl.clone();
    if (!isPaid) {
      url.pathname = "/pending";
    } else if (!hasGeminiKey && !isAdmin) {
      url.pathname = "/setup";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

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

  // Not paid → can ONLY access /pending
  if (!isPaid) {
    if (pathname !== "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Paid but no Gemini key → can ONLY access /setup (unless admin)
  if (isPaid && !hasGeminiKey && !isAdmin) {
    if (pathname !== "/setup") {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Paid user trying to access /pending → redirect to main app
  if (isPaid && pathname === "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = hasGeminiKey ? "/" : "/setup";
    return NextResponse.redirect(url);
  }

  // Paid user with key trying to access /setup → redirect to main app
  if (isPaid && hasGeminiKey && pathname === "/setup") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
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
