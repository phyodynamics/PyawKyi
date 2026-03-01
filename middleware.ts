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
  // BYPASS: Always allow these routes
  // ═══════════════════════════════════════════════════
  if (pathname.startsWith("/auth/callback") || pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // ═══════════════════════════════════════════════════
  // Fetch app settings (maintenance, waitlist modes)
  // ═══════════════════════════════════════════════════
  const { data: settings } = await supabase
    .from("app_settings")
    .select("maintenance_mode, waitlist_mode")
    .eq("id", "global")
    .single();

  const maintenanceMode = settings?.maintenance_mode ?? false;
  const waitlistMode = settings?.waitlist_mode ?? false;
  const isAdmin = user?.email === process.env.ADMIN_EMAIL;

  // ═══════════════════════════════════════════════════
  // MAINTENANCE MODE — only admin can use the app
  // Everyone else sees /maintenance
  // ═══════════════════════════════════════════════════
  if (maintenanceMode && !isAdmin) {
    // Allow /maintenance and /welcome (for login)
    if (pathname === "/maintenance") {
      return supabaseResponse;
    }
    // If not logged in, allow /welcome so they can see something
    if (!user && pathname === "/welcome") {
      return supabaseResponse;
    }
    // Redirect everything else to /maintenance
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  // If admin and maintenance is on, don't show /maintenance to admin
  if (!maintenanceMode && pathname === "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/" : "/welcome";
    return NextResponse.redirect(url);
  }

  // ═══════════════════════════════════════════════════
  // UNAUTHENTICATED users
  // ═══════════════════════════════════════════════════
  if (!user) {
    if (pathname === "/welcome") {
      return supabaseResponse;
    }
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

  const isPaid = profile?.payment_status === "paid" || isAdmin;
  const hasGeminiKey = !!profile?.gemini_api_key;

  // ═══════════════════════════════════════════════════
  // WAITLIST MODE — users can sign up & pay, but
  // paid users see /waitlist instead of the main app
  // Admin is exempt.
  // ═══════════════════════════════════════════════════
  if (waitlistMode && !isAdmin) {
    // Not paid → allow /pending (payment flow)
    if (!isPaid) {
      if (pathname === "/welcome") {
        const url = request.nextUrl.clone();
        url.pathname = "/pending";
        return NextResponse.redirect(url);
      }
      if (pathname === "/pending") {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }

    // Paid but waitlist on → show /waitlist
    if (pathname === "/waitlist") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
  }

  // If waitlist mode OFF but user visits /waitlist → redirect away
  if (!waitlistMode && pathname === "/waitlist") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ─── Logged-in users must NEVER see /welcome ───
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
