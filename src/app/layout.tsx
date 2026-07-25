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
              <Link href="/" className="hover:opacity-80 transition">
                <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Victory Iloilo</p>
                <h1 className="text-lg font-bold leading-tight">Discipleship Journey</h1>
              </Link>
              {session && (
                <div className="flex items-center gap-4">
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
