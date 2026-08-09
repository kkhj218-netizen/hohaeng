import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let jhSupabaseAdmin: SupabaseClient | null = null;

export function getJhSupabaseAdmin(): SupabaseClient {
  if (jhSupabaseAdmin) {
    return jhSupabaseAdmin;
  }

  const url = process.env.JH_SUPABASE_URL;
  const secretKey = process.env.JH_SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error("JH_SUPABASE_URL 환경변수가 없습니다.");
  }

  if (!secretKey) {
    throw new Error("JH_SUPABASE_SECRET_KEY 환경변수가 없습니다.");
  }

  jhSupabaseAdmin = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return jhSupabaseAdmin;
}
