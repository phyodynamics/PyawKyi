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
  // BYPASS: Always allow these routes through
  // ═══════════════════════════════════════════════════
  if (pathname.startsWith("/auth/callback") || pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // ═══════════════════════════════════════════════════
  // ADMIN CHECK — case-insensitive email comparison
  // ═══════════════════════════════════════════════════
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const userEmail = (user?.email || "").trim().toLowerCase();
  const isAdmin = !!user && adminEmail !== "" && userEmail === adminEmail;

  // ═══════════════════════════════════════════════════
  // ADMIN EARLY BYPASS — admin can access EVERYTHING
  // regardless of maintenance/waitlist mode.
  // Only redirect admin away from mode-specific pages
  // when those modes are OFF.
  // ═══════════════════════════════════════════════════
  if (isAdmin) {
    // Admin should never see /welcome
    if (pathname === "/welcome") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // Let admin access everything: /, /admin, /pending, /setup, etc.
    return supabaseResponse;
  }

  // ═══════════════════════════════════════════════════
  // Fetch app settings (maintenance, waitlist modes)
  // Only needed for non-admin users
  // ═══════════════════════════════════════════════════
  const { data: settings } = await supabase
    .from("app_settings")
    .select("maintenance_mode, waitlist_mode")
    .eq("id", "global")
    .single();

  const maintenanceMode = settings?.maintenance_mode ?? false;
  const waitlistMode = settings?.waitlist_mode ?? false;

  // ═══════════════════════════════════════════════════
  // MAINTENANCE MODE — ALL non-admin users blocked
  // ═══════════════════════════════════════════════════
  if (maintenanceMode) {
    if (pathname === "/maintenance") {
      return supabaseResponse;
    }
    // Allow unauthenticated to see /welcome so they know the app exists
    if (!user && pathname === "/welcome") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }

  // Maintenance is OFF — redirect away from /maintenance page
  if (pathname === "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/" : "/welcome";
    return NextResponse.redirect(url);
  }

  // ═══════════════════════════════════════════════════
  // UNAUTHENTICATED users — can only see /welcome
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
  // AUTHENTICATED NON-ADMIN users — fetch profile
  // ═══════════════════════════════════════════════════
  const { data: profile } = await supabase
    .from("users")
    .select("payment_status, gemini_api_key")
    .eq("id", user.id)
    .single();

  const isPaid = profile?.payment_status === "paid";
  const hasGeminiKey = !!profile?.gemini_api_key;

  // ═══════════════════════════════════════════════════
  // WAITLIST MODE — all registered users see /waitlist
  // No payment needed, just sign up and wait
  // ═══════════════════════════════════════════════════
  if (waitlistMode) {
    if (pathname === "/waitlist") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/waitlist";
    return NextResponse.redirect(url);
  }

  // Waitlist OFF → redirect away from /waitlist
  if (pathname === "/waitlist") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ─── Logged-in users must NEVER see /welcome ───
  if (pathname === "/welcome") {
    const url = request.nextUrl.clone();
    if (!isPaid) {
      url.pathname = "/pending";
    } else if (!hasGeminiKey) {
      url.pathname = "/setup";
    } else {
      url.pathname = "/";
    }
    return NextResponse.redirect(url);
  }

  // ─── /admin is admin-only (already handled above) ───
  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ─── Payment gating ───
  if (!isPaid) {
    if (pathname !== "/pending") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Paid but no Gemini key → /setup only
  if (!hasGeminiKey) {
    if (pathname !== "/setup") {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Paid user visiting /pending → redirect to main app
  if (pathname === "/pending") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Paid user with key visiting /setup → redirect to main app
  if (pathname === "/setup") {
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
