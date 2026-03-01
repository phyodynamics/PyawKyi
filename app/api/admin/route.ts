import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import webPush from "web-push";

// Configure VAPID for push notifications
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    "mailto:bababoi134459@gmail.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// ═══════════════════════════════════════════════════
// Admin-only API route — uses service role key
// for operations that bypass RLS (viewing all users, etc.)
// ═══════════════════════════════════════════════════

function errorResponse(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

// Verify the caller is the admin
async function verifyAdmin(request: NextRequest) {
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
    return null;
  }
  return user;
}

// Service role client — bypasses RLS for admin operations
function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET: Fetch all data for admin dashboard + analytics
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return errorResponse("Unauthorized", 401);

  const service = getServiceClient();

  const [usersRes, subsRes, savedRes, apiKeysRes, notifsRes, settingsRes] =
    await Promise.all([
      service
        .from("users")
        .select("*")
        .order("created_at", { ascending: false }),
      service
        .from("payment_submissions")
        .select("*")
        .order("created_at", { ascending: false }),
      service.from("saved_items").select("user_id, mode, created_at"),
      service
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false }),
      service
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false }),
      service.from("app_settings").select("*").eq("id", "global").single(),
    ]);

  return NextResponse.json({
    users: usersRes.data || [],
    submissions: subsRes.data || [],
    savedItems: savedRes.data || [],
    apiKeys: apiKeysRes.data || [],
    notifications: notifsRes.data || [],
    settings: settingsRes.data || {
      maintenance_mode: false,
      waitlist_mode: false,
      price: 20000,
      currency: "MMK",
    },
  });
}

// POST: Admin actions (approve, reject, update status, delete, revoke key)
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) return errorResponse("Unauthorized", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request", 400);
  }

  const { action, userId, submissionId, status } = body;

  if (!action) return errorResponse("Missing action", 400);

  const service = getServiceClient();

  switch (action) {
    case "approve_submission": {
      if (!submissionId || !userId) return errorResponse("Missing IDs", 400);
      // Fetch current price to record what the user paid
      const { data: currentSettings } = await service
        .from("app_settings")
        .select("price")
        .eq("id", "global")
        .single();
      const currentPrice = currentSettings?.price ?? 20000;
      await Promise.all([
        service
          .from("payment_submissions")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: admin.email,
          })
          .eq("id", submissionId),
        service
          .from("users")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            price_paid: currentPrice,
          })
          .eq("id", userId),
      ]);
      break;
    }

    case "reject_submission": {
      if (!submissionId) return errorResponse("Missing submission ID", 400);
      await service
        .from("payment_submissions")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: admin.email,
        })
        .eq("id", submissionId);
      break;
    }

    case "update_payment_status": {
      if (!userId || !status) return errorResponse("Missing fields", 400);
      await service
        .from("users")
        .update({
          payment_status: status,
          ...(status === "paid" ? { paid_at: new Date().toISOString() } : {}),
        })
        .eq("id", userId);
      break;
    }

    case "revoke_api_key": {
      if (!userId) return errorResponse("Missing user ID", 400);
      await service
        .from("users")
        .update({ gemini_api_key: null })
        .eq("id", userId);
      break;
    }

    case "delete_user": {
      if (!userId) return errorResponse("Missing user ID", 400);
      await service.from("users").delete().eq("id", userId);
      break;
    }

    case "send_notification": {
      const { title, message, type } = body;
      if (!title || !message)
        return errorResponse("Missing title or message", 400);
      const notifType = type || "info";
      if (!["info", "update", "promo", "alert"].includes(notifType)) {
        return errorResponse(
          "Invalid type. Must be: info, update, promo, alert",
          400,
        );
      }
      await service.from("notifications").insert({
        title,
        message,
        type: notifType,
      });
      break;
    }

    case "delete_notification": {
      const { notificationId } = body;
      if (!notificationId) return errorResponse("Missing notification ID", 400);
      await service.from("notifications").delete().eq("id", notificationId);
      break;
    }

    case "toggle_maintenance": {
      const { enabled } = body;
      const isEnabling = enabled === true || enabled === "true";
      await service
        .from("app_settings")
        .update({
          maintenance_mode: isEnabling,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");

      // Auto-send push notification when maintenance is turned ON
      if (isEnabling) {
        try {
          const { data: subscriptions } = await service
            .from("push_subscriptions")
            .select("*");

          if (subscriptions && subscriptions.length > 0) {
            const payload = JSON.stringify({
              title: "🔧 Maintenance Mode",
              body: "Pyaw Kyi is under maintenance. We'll be back shortly!",
              message: "Pyaw Kyi is under maintenance. We'll be back shortly!",
              type: "alert",
              id: `maint-${Date.now()}`,
            });

            await Promise.allSettled(
              subscriptions.map(async (sub: any) => {
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
                  const error = err as { statusCode?: number };
                  if (error.statusCode === 410 || error.statusCode === 404) {
                    await service
                      .from("push_subscriptions")
                      .delete()
                      .eq("endpoint", sub.endpoint);
                  }
                }
              }),
            );
          }
        } catch {
          // Push failure shouldn't block the toggle
        }
      }
      break;
    }

    case "toggle_waitlist": {
      const { enabled: wlEnabled } = body;
      await service
        .from("app_settings")
        .update({
          waitlist_mode: wlEnabled === true || wlEnabled === "true",
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
      break;
    }

    case "update_price": {
      const { price: newPrice } = body;
      const priceNum = parseInt(newPrice, 10);
      if (isNaN(priceNum) || priceNum < 0)
        return errorResponse("Invalid price", 400);
      await service
        .from("app_settings")
        .update({
          price: priceNum,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "global");
      break;
    }

    default:
      return errorResponse("Unknown action", 400);
  }

  return NextResponse.json({ success: true });
}
