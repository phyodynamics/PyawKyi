import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint — returns app settings (price, modes) for all pages
// No auth required since this data is non-sensitive
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("app_settings")
      .select("maintenance_mode, waitlist_mode, price, currency")
      .eq("id", "global")
      .single();

    if (error || !data) {
      // Return defaults if table doesn't exist yet
      return NextResponse.json({
        maintenance_mode: false,
        waitlist_mode: false,
        price: 20000,
        currency: "MMK",
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      maintenance_mode: false,
      waitlist_mode: false,
      price: 20000,
      currency: "MMK",
    });
  }
}
