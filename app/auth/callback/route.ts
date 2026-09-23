import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * OAuth callback: exchanges the `code` query param for a session, then sends
 * the user on their way. Users without a household yet are routed to
 * onboarding; everyone else continues to `next` (or `/`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // Scratch response used only to collect the session cookies set during the
  // code exchange, so they can be copied onto the final redirect.
  const scratch = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            scratch.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  let target = searchParams.get("next") ?? "/";
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: memberships } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .limit(1);
      if (!memberships || memberships.length === 0) {
        target = "/onboarding";
      }
    }
  } catch {
    // If the membership check fails, don't strand the user — the pages will
    // route them to onboarding themselves.
  }

  const response = NextResponse.redirect(`${origin}${target}`);
  scratch.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  return response;
}
