import "server-only";

import { createClient } from "@supabase/supabase-js";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function verifyAdminRequest(request: Request): Promise<boolean> {
  const token = getBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!token || !supabaseUrl || !publishableKey) {
    return false;
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  return !error && Boolean(user);
}
