mport { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * DELETE /api/delete-user
 * Deletes the currently logged-in user's profile row (if present)
 * and deletes the auth user via admin API (service role).
 */
export async function DELETE() {
  const supabase = createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = user.id;

  // OPTIONAL: delete related data first (uncomment and adjust table/column names)
  // await supabase.from("swipes").delete().or(`swiper_id.eq.${userId},swiped_id.eq.${userId}`);
  // await supabase.from("matches").delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  // await supabase.from("messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  // Delete profile (common pattern: profiles.id == auth.users.id)
  const { error: profErr } = await supabase.from("profiles").delete().eq("id", userId);
  if (profErr) {
    // If RLS blocks deletion, you can delete profiles using the admin client instead:
    // const { error: profAdminErr } = await admin.from("profiles").delete().eq("id", userId);
    // if (profAdminErr) return NextResponse.json({ error: profAdminErr.message }, { status: 500 });

    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // Delete auth user (requires service role)
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
