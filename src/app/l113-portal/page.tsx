import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function L113PortalPage() {
  return (
    <>
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "L113 Portal" }]} />
        <h2 className="text-2xl font-bold text-gray-900">L113 Portal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Leadership 113 students and candidates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/l113-portal/potential-students"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">🎓</span>
          <span className="text-lg font-semibold text-gray-900 text-center">Potential L113 Students</span>
          <span className="text-sm text-gray-500 text-center">Active leaders ready for Leadership 113</span>
        </Link>
      </div>
    </>
  );
}
