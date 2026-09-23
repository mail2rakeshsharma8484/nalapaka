"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/Logo";

const primaryLinks = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/inventory", label: "Pantry", icon: "🫙" },
  { href: "/shopping", label: "Shopping", icon: "🛒" },
  { href: "/recipes", label: "Recipes", icon: "📖" },
  { href: "/plan", label: "Plan", icon: "🗓️" },
];

const secondaryLinks = [
  { href: "/receipts", label: "Receipts", icon: "🧾" },
  { href: "/prices", label: "Prices", icon: "💰" },
  { href: "/activity", label: "Activity", icon: "📋" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/onboarding" || pathname.startsWith("/auth/")) {
    return null;
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-bark-900/[0.08] bg-cream-50/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-xl"
            aria-label="Nalapaka home"
          >
            <LogoMark className="h-9 w-9 transition-transform duration-200 group-hover:scale-105" />
            <span className="font-display text-[1.375rem] font-semibold tracking-tight text-bark-900">
              Nalapaka
            </span>
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg px-3 py-2 text-sm font-medium text-bark-500 transition hover:bg-cream-200/70 hover:text-bark-800"
          >
            Sign out
          </button>
        </div>
        {/* desktop nav */}
        <nav aria-label="Primary" className="mx-auto hidden w-full max-w-5xl flex-wrap items-center gap-1 px-4 pb-3 sm:flex sm:px-6">
          {[...primaryLinks, ...secondaryLinks].map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-150 ${
                  active
                    ? "bg-sage-700 text-white shadow-[0_2px_8px_rgb(65_86_54/0.3)]"
                    : "text-bark-500 hover:bg-cream-200/70 hover:text-bark-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* bottom tab bar (mobile) */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-bark-900/[0.08] bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden"
      >
        <div className="grid grid-cols-5 px-1">
          {primaryLinks.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition-colors ${
                  active ? "text-sage-700" : "text-bark-400 hover:text-bark-700"
                }`}
              >
                {active && (
                  <span className="absolute top-1 h-1 w-8 rounded-full bg-sage-600" aria-hidden />
                )}
                <span className="text-[1.35rem] leading-none" aria-hidden>
                  {l.icon}
                </span>
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
