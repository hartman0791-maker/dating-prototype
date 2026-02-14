import { NextResponse } from "next/server";
/**
 * DELETE /api/delete-user
 * Deletes the currently logged-in user's profile row (if present)
 * and deletes the auth user via admin API (service role / secret key).
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

  // Delete profile row (common pattern: profiles.id == auth.users.id)
  const { error: profErr } = await supabase.from("profiles").delete().eq("id", userId);
  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // Delete auth user (requires secret/service role key on server)
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
