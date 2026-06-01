import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 *
 * ⚠️ Never import this into a client component — the service role key
 * must never reach the browser. It bypasses Row Level Security, so all
 * data access through it happens on the server (server components /
 * server actions / route handlers) only.
 *
 * Returns null when env vars are missing, so pages can render a setup
 * notice instead of crashing.
 */
export function getServiceClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
