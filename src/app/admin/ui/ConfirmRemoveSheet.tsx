"use client";

import { useId } from "react";
import { Sheet, SheetBody } from "./Sheet";
import { Spinner } from "./icons";

/** In-app replacement for the browser's confirm() before removing a check-in. */
export function ConfirmRemoveSheet({
  name,
  sessionName,
  pending = false,
  onCancel,
  onConfirm,
}: {
  name: string;
  sessionName?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  return (
    <Sheet labelledBy={titleId} onClose={pending ? undefined : onCancel} dismissOnBackdrop={!pending}>
      <SheetBody className="flex flex-col gap-4">
        <div>
          <h3 id={titleId} className="text-xl font-semibold text-balance text-gray-900">
            Remove {name}&rsquo;s check-in?
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {sessionName ? `They'll need to be checked in to ${sessionName} again.` : "They'll need to be checked in again."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-12 rounded-xl px-5 text-base font-semibold text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00428E] disabled:opacity-50 sm:h-10 sm:text-sm"
          >
            Keep check-in
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-700 px-6 text-base font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50 sm:h-10 sm:text-sm"
          >
            {pending && <Spinner className="size-4" />}
            Remove check-in
          </button>
        </div>
      </SheetBody>
    </Sheet>
  );
}
