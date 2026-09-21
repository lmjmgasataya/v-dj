"use client";

import { useContext, type MouseEvent, type ReactNode } from "react";
import { VgReportNavigationContext } from "./VgReportFilters";

export function TransitionLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const navigate = useContext(VgReportNavigationContext);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!navigate) return;
    e.preventDefault();
    navigate(href);
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
