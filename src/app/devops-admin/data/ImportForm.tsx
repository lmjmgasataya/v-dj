"use client";

import { useActionState } from "react";
import { importTable } from "./actions";

export function ImportForm({ table }: { table: string }) {
  const [state, action, pending] = useActionState(importTable, null);

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
      {state && (
        <span className={`text-xs font-medium ${state.success ? "text-green-600" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
