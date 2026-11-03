import Link from "next/link";

type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 new-ui:mb-2 new-ui:text-gray-600">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="select-none">/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-indigo-600 transition-colors new-ui:hover:text-[#00428E]">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-700 font-medium new-ui:text-gray-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
