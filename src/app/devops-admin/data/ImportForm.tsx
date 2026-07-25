"use client";

import { useActionState, useEffect } from "react";
import { importTable } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";

export function ImportForm({ table }: { table: string }) {
  const [state, action, pending] = useActionState(importTable, null);
  const toast = useToast();

  useEffect(() => {
    if (state) toast.show(state.message, state.success ? "success" : "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 mt-2">
      <input type="hidden" name="table" value={table} />
      <input
        type="file"
        name="file"
        accept=".csv"
        required
        className="text-xs text-gray-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 file:cursor-pointer hover:file:bg-gray-200 transition"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-xs px-3 py-1.5 bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white font-semibold rounded-lg transition whitespace-nowrap"
      >
        {pending ? "Importing…" : "Import"}
      </button>
    </form>
  );
}
