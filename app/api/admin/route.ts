import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

  const [usersRes, subsRes, savedRes, apiKeysRes] = await Promise.all([
    service.from("users").select("*").order("created_at", { ascending: false }),
    service
      .from("payment_submissions")
      .select("*")
      .order("created_at", { ascending: false }),
    service.from("saved_items").select("user_id, mode, created_at"),
    service
      .from("api_keys")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    users: usersRes.data || [],
    submissions: subsRes.data || [],
    savedItems: savedRes.data || [],
    apiKeys: apiKeysRes.data || [],
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

    default:
      return errorResponse("Unknown action", 400);
  }

  return NextResponse.json({ success: true });
}
