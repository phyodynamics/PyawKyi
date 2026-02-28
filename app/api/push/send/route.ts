import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configure VAPID
webPush.setVapidDetails(
  "mailto:bababoi134459@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// Admin-only: Send push notification to all subscribers
export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, type } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Missing title or message" },
        { status: 400 },
      );
    }

    const notifType = type || "info";

    // Get all push subscriptions
    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: subscriptions } = await service
      .from("push_subscriptions")
      .select("*");

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No subscribers found",
      });
    }

    // Also save to notifications table for in-app history
    await service.from("notifications").insert({
      title,
      message,
      type: notifType,
    });

    // Send push to all subscribers
    const payload = JSON.stringify({
      title,
      body: message,
      message,
      type: notifType,
      id: `notif-${Date.now()}`,
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys_p256dh,
                auth: sub.keys_auth,
              },
            },
            payload,
          );
        } catch (err: unknown) {
          // If subscription expired/invalid, remove it
          const error = err as { statusCode?: number };
          if (error.statusCode === 410 || error.statusCode === 404) {
            await service
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw err;
        }
      }),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ success: true, sent, failed });
  } catch {
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 },
    );
  }
}
