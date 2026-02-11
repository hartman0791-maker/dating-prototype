import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Delete profile
  await supabase.from("profiles").delete().eq("id", user.id);

  // Delete auth user (admin only if using service role)
  await supabase.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true });
}
