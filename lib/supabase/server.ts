import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for ROUTE HANDLERS + SERVER COMPONENTS.
 * Uses anon key. For auth, we attach Authorization if a session exists in cookies.
 */
export function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // NOTE: This is a simple server client. If you're using @supabase/ssr, your setup may differ.
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        // If you store access token in cookies, you can wire it here.
        // Many apps using supabase auth helpers manage this automatically.
      },
    },
  });
}

/**
 * Admin client (service role) – ONLY use on server.
 * Requires SUPABASE_SERVICE_ROLE_KEY in Vercel env.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createSupabaseClient(supabaseUrl, serviceKey);
}
