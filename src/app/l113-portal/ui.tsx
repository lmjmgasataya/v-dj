import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const l113Input =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400";

export const l113PrimaryButton =
  "px-4 py-2 bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60";

export function L113Header({ title, description, crumbs = [] }: { title: string; description?: string; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "L113 Portal", href: "/l113-portal" }, ...crumbs, { label: title }]}
      />
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap justify-end">{children}</div>}
    </div>
  );
}

export function NoBatches() {
  return (
    <Card>
      <p className="px-6 py-8 text-sm text-gray-500 text-center">
        No L113 batches yet.{" "}
        <Link href="/l113-portal/batches" className="text-indigo-600 font-medium hover:underline">
          Create a batch
        </Link>{" "}
        first.
      </p>
    </Card>
  );
}
