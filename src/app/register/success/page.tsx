import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function SuccessPage() {
  const [flag] = await db.select().from(featureFlags).where(eq(featureFlags.key, "new_ui_register")).limit(1);

  if (flag?.enabled) {
    return (
      <div data-new-ui className="mx-auto flex max-w-xl flex-col gap-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Register", href: "/register" }, { label: "Success" }]} />
        <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-gray-200">
          <div className="animate-result-pop flex size-16 items-center justify-center rounded-full bg-green-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-9">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance text-gray-900">Registration Successful!</h2>
          <p className="mt-2 max-w-sm text-gray-600">
            The participant has been registered for Discipleship Journey. See you on the Discipleship Journey Classes!
          </p>
          <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-[#00428E] px-6 font-semibold text-white hover:bg-[#003578] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E]"
            >
              Register Another
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-xl px-6 font-semibold text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E]"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Register", href: "/register" }, { label: "Success" }]} />
      <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
      <p className="text-gray-500 max-w-sm">
        The participant has been registered for Discipleship Journey. See you on the Discipleship Journey Classes!
      </p>
      <div className="flex gap-4 mt-2">
        <Link
          href="/register"
          className="bg-[#00428E] hover:bg-[#003578] text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Register Another
        </Link>
        <Link
          href="/"
          className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 transition"
        >
          Home
        </Link>
      </div>
      </div>
    </div>
  );
}
