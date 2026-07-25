import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ToastType = "success" | "error" | "info";

function appendToastParams(path: string, message: string, type: ToastType): string {
  const [base, existingQuery] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("toast", message);
  params.set("toastType", type);
  return `${base}?${params.toString()}`;
}

export function toastRedirect(path: string, message: string, type: ToastType = "success"): never {
  redirect(appendToastParams(path, message, type));
}

export async function toastRedirectBack(message: string, type: ToastType = "success"): Promise<never> {
  const h = await headers();
  const referer = h.get("referer");
  let path = "/";
  if (referer) {
    const url = new URL(referer);
    path = url.pathname + url.search;
  }
  redirect(appendToastParams(path, message, type));
}
