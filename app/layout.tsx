import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nalapaka — your kitchen, always stocked",
  description:
    "Nalapaka keeps your kitchen stocked: pantry inventory, grocery list, recipes with pantry-availability checks, and weekly meal planning.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nalapaka" },
};

export const viewport: Viewport = {
  themeColor: "#fdfbf7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-cream-50 text-bark-900 antialiased">
        <ToastProvider>
          <Nav />
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-16">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
