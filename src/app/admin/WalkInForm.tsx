"use client";

import { useState, useTransition } from "react";
import { addWalkIn } from "./actions";
import { Field, inputCls, selectCls, SERVICE_OPTIONS } from "@/components/form";

export function WalkInForm({ sessionId }: { sessionId: number }) {
  const [pending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await addWalkIn(sessionId, formData);
      setFormKey((k) => k + 1);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        key={formKey}
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4"
      >
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
        <Field label="Lifestage">
          <select name="lifestage" className={selectCls}>
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
          <input name="victoryDate" required type="date" className={inputCls} />
        </Field>
        <Field label="Remarks (optional)" className="sm:col-span-2">
          <textarea name="remarks" rows={2} placeholder="e.g. arrived late, missed first 30 minutes" className={inputCls + " resize-none"} />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {pending ? "Adding..." : "Add Walk-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
