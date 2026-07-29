import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { FlashToastBridge } from "@/components/toast/FlashToastBridge";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Discipleship Journey",
  description: "Registration and check-in for Discipleship Journey",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} min-h-full bg-gray-50 antialiased`}>
        <ToastProvider>
          <Suspense fallback={null}>
            <FlashToastBridge />
          </Suspense>
          <NavigationProgress />
          <header className="text-white shadow" style={{ backgroundColor: "#00428E" }}>
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link href={session?.role === "vg_leader" ? "/vg-portal" : "/"} className="hover:opacity-80 transition">
                <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Victory Iloilo</p>
                <h1 className="text-lg font-bold leading-tight">
                  {session?.role === "vg_leader" ? "VG Portal" : "Discipleship Journey"}
                </h1>
              </Link>
              {session && (
                <div className="flex items-center gap-4">
                  {session.role === "developer" && (
                    <Link href="/settings" aria-label="Settings" className="text-indigo-300 hover:text-white transition">
                      <SettingsIcon />
                    </Link>
                  )}
                  <span className="text-xs text-indigo-200 capitalize">{session.name}</span>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="text-xs text-indigo-300 hover:text-white underline underline-offset-2 transition"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
