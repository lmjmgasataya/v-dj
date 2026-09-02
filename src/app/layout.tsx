import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { getSession } from "@/lib/auth";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { FlashToastBridge } from "@/components/toast/FlashToastBridge";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Victory Iloilo Discipleship Database",
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
          <SiteHeader session={session ? { name: session.name, role: session.role } : null} />
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
