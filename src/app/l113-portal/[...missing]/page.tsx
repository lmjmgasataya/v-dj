import { notFound } from "next/navigation";

/** Any other /l113-portal/... URL shows the portal's own 404 (not-found.tsx) inside its layout. */
export default function L113MissingPage() {
  notFound();
}
