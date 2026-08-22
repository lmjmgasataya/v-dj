"use client";

import { useState, useTransition } from "react";
import { addWalkIn } from "./actions";
import { Field, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";
import { DatePickerField } from "@/components/DatePickerField";
import { useToast } from "@/components/toast/ToastProvider";
import { useOnlineStatus } from "@/lib/useOnlineStatus";

export function WalkInForm({ sessionId, newDatePicker, offlineCheckin = false }: { sessionId: number; newDatePicker: boolean; offlineCheckin?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const toast = useToast();
  const onlineStatus = useOnlineStatus();
  const isOnline = !offlineCheckin || onlineStatus;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isOnline) {
      toast.show("Walk-in registration requires an internet connection.", "error");
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      let result;
      try {
        result = await addWalkIn(sessionId, formData);
      } catch {
        toast.show("Walk-in registration failed — check your connection and try again.", "error");
        return;
      }
      setFormKey((k) => k + 1);
      toast.show(
        <>
          Walk-in participant has been added —{" "}
          {result.tableNumber ? <strong>Table {result.tableNumber}</strong> : "no table available"}.
        </>,
        "success",
        20000
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        key={formKey}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
      >
        {!isOnline && (
          <div className="sm:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            Walk-in registration requires an internet connection.
          </div>
        )}
        <Field label="Last Name" required>
          <input name="lastName" required className={inputCls} />
        </Field>
        <Field label="First Name" required>
          <input name="firstName" required className={inputCls} />
        </Field>
        <Field label="Middle Initial">
          <input name="middleInitial" maxLength={3} className={inputCls} />
        </Field>
        <Field label="Mobile Number">
          <input name="mobileNumber" type="tel" className={inputCls} />
        </Field>
        <Field label="Lifestage" required>
          <select name="lifestage" required className={selectCls}>
            <option value="">-- Select --</option>
            <option>Student (JHS/SHS)</option>
            <option>Student (College)</option>
            <option>Single</option>
            <option>Married</option>
            <option>Single Parent</option>
            <option>Widow/Widower</option>
            <option>Senior</option>
          </select>
        </Field>
        <Field label="Age" required>
          <input name="age" required type="number" min={1} max={120} className={inputCls} />
        </Field>
        <Field label="Gender" required>
          <select name="gender" required className={selectCls}>
            <option value="">-- Select --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Service Attending" required>
          <select name="serviceAttending" required className={selectCls}>
            <option value="">-- Select --</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Facebook / Messenger Name" className="sm:col-span-2">
          <input name="facebookMessengerName" className={inputCls} />
        </Field>
        <Field label="VG Leader's Last Name" required>
          <input name="vgLeaderLastName" required className={inputCls} />
        </Field>
        <Field label="VG Leader's First Name" required>
          <input name="vgLeaderFirstName" required className={inputCls} />
        </Field>
        <Field label="Victory Weekend / Victory Day Date" required className="sm:col-span-2">
          <DatePickerField name="victoryDate" required max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" })} className={inputCls} newDatePicker={newDatePicker} />
        </Field>
        <Field label="Remarks (optional)" className="sm:col-span-2">
          <textarea name="remarks" rows={2} placeholder="e.g. arrived late, missed first 30 minutes" className={inputCls + " resize-none"} />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={pending || !isOnline}
            className="bg-[#00428E] hover:bg-[#003578] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {pending ? "Adding..." : "Add Walk-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
