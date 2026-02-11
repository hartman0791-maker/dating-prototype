import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Server-side Supabase client for Next.js App Router (Route Handlers / Server Components).
 * Uses cookies for auth session.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Use ANON key for normal server calls (session via cookies)
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // In some server contexts (e.g., Server Components), setting cookies is not allowed.
            // That's okay for read-only operations.
          }
        },
      },
    }
  );
}

/**
 * Admin client (service role) — ONLY use on the server.
 * Useful for auth admin operations like deleting a user.
 */
export function createAdminClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: admin ops don't need to write auth cookies.
        },
      },
    }
  );
}
