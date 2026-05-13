"use client";

import { useState, useEffect, useRef } from "react";
import { registerParticipant } from "./actions";
import { Section, Field, inputCls, selectCls, SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";
// import { DisciplerAutocomplete } from "@/components/DisciplerAutocomplete";
import { SubmitButton } from "@/components/SubmitButton";
// import type { Discipler } from "@/db/schema";

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

export default function RegisterPage() {
  const [previousChurch, setPreviousChurch] = useState("Roman Catholic");
  const [discipler, setDiscipler] = useState({ lastName: "", firstName: "", mobileNumber: "", messengerName: "" });
  const [registrationFee, setRegistrationFee] = useState("");
  const needsVictoryDate = registrationFee === "C" || registrationFee === "D";

  const isDirty = useRef(false);
  useEffect(() => {
    // Tab close / refresh / external navigation
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Next.js Link clicks — intercept in capture phase before the router acts
    function handleClick(e: MouseEvent) {
      if (!isDirty.current) return;
      const anchor = (e.target as Element).closest("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!confirm("You have unsaved changes. Are you sure you want to leave?")) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        isDirty.current = false;
      }
    }
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);
  const today = new Date().toISOString().slice(0, 10);

  // function handleDisciplerSelect(d: Discipler) {
  //   setDiscipler({ lastName: d.lastName, firstName: d.firstName, mobileNumber: d.mobileNumber, messengerName: d.messengerName ?? "" });
  // }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participant Registration</h2>
          <p className="text-sm text-gray-500 mt-1">
            All fields marked with <span className="text-red-500">*</span> are required.
          </p>
        </div>
        <a href="/" className="text-sm text-indigo-600 hover:underline shrink-0">← Home</a>
      </div>

      <form
        action={registerParticipant}
        onChange={() => { isDirty.current = true; }}
        onSubmit={() => { isDirty.current = false; }}
        className="flex flex-col gap-6"
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-700">
            I will register for: <span className="text-red-500">*</span>
            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Important</span>
          </p>
          <select
            name="registrationFee"
            required
            className={selectCls}
            value={registrationFee}
            onChange={(e) => setRegistrationFee(e.target.value)}
          >
            <option value="">-- Select --</option>
            {FEE_CATEGORIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
            ))}
          </select>
        </div>

        <Section title="Participant Information">
          {needsVictoryDate && (
            <div className="sm:col-span-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex flex-col gap-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Required</p>
              <p className="text-xs text-amber-600 mb-2">Please enter the date when the participant completed Victory Weekend.</p>
              <Field label="Victory Weekend Date" required>
                <input name="victoryDate" required type="date" max={today} className={inputCls} />
              </Field>
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
          <Field label="Mobile Number" required>
            <input name="mobileNumber" required type="tel" className={inputCls} />
          </Field>
          <Field label="Facebook / Messenger Name" className="sm:col-span-2">
            <input name="facebookMessengerName" className={inputCls} />
          </Field>
          <Field label="Lifestage" required>
            <select name="lifestage" required className={selectCls}>
              <option value="">-- Select --</option>
              {LIFESTAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
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
              {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="I have completed One2One" required className="sm:col-span-2">
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="completedOne2One" value="yes" required className="mt-0.5" />
                Yes
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="radio" name="completedOne2One" value="no" className="mt-0.5" />
                No, but I will complete it before Victory Day
              </label>
            </div>
          </Field>

          <Field label="I will undergo water baptism" required className="sm:col-span-2">
            <div className="flex gap-6 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="willUndergoWaterBaptism" value="yes" required />
                Yes
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="willUndergoWaterBaptism" value="no" />
                No
              </label>
            </div>
          </Field>

          <Field label="Previous Church" required className="sm:col-span-2">
            <div className="flex flex-col gap-2 mt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="previousChurch"
                  value="Roman Catholic"
                  checked={previousChurch === "Roman Catholic"}
                  onChange={() => setPreviousChurch("Roman Catholic")}
                />
                Roman Catholic
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="previousChurch"
                  value="Others"
                  checked={previousChurch === "Others"}
                  onChange={() => setPreviousChurch("Others")}
                />
                Others
              </label>
              {previousChurch === "Others" && (
                <input
                  name="previousChurchOther"
                  required
                  placeholder="Please specify your previous church"
                  className={`${inputCls} mt-1 ml-5`}
                />
              )}
            </div>
          </Field>

          <Field label="Preferred Name on ID" required className="sm:col-span-2">
            <input name="preferredNameOnId" required className={inputCls} />
          </Field>
        </Section>

        <Section title="One2One Discipler Information" description="To be filled up by the One2One discipler">
          {/* <DisciplerAutocomplete onSelect={handleDisciplerSelect} /> */}
          <Field label="Discipler's Last Name" required>
            <input name="disciplerLastName" required className={inputCls}
              value={discipler.lastName} onChange={(e) => setDiscipler((p) => ({ ...p, lastName: e.target.value }))} />
          </Field>
          <Field label="Discipler's First Name" required>
            <input name="disciplerFirstName" required className={inputCls}
              value={discipler.firstName} onChange={(e) => setDiscipler((p) => ({ ...p, firstName: e.target.value }))} />
          </Field>
          <Field label="Discipler's Mobile Number" required>
            <input name="disciplerMobileNumber" required type="tel" className={inputCls}
              value={discipler.mobileNumber} onChange={(e) => setDiscipler((p) => ({ ...p, mobileNumber: e.target.value }))} />
          </Field>
          <Field label="Discipler's Messenger / Facebook Name">
            <input name="disciplerMessengerName" className={inputCls}
              value={discipler.messengerName} onChange={(e) => setDiscipler((p) => ({ ...p, messengerName: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="confirmedReadiness"
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">
                I am confirming that the participant is ready to join Victory Day, that we will
                complete/have completed One2One and Preparing for Victory before the day of the event.
              </span>
            </label>
          </div>
        </Section>

        <Section title="Payment &amp; Admin">
          <Field label="Registration Fee" required>
            <select
              disabled
              className={`${selectCls} opacity-60 cursor-not-allowed bg-gray-50`}
              value={registrationFee}
            >
              <option value="">-- Select --</option>
              {FEE_CATEGORIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
              ))}
            </select>
          </Field>
          <Field label="Acknowledgement Receipt Number" required>
            <input name="acknowledgementReceiptNumber" required className={inputCls} />
          </Field>
          <Field label="Name of Admin Volunteer" required className="sm:col-span-2">
            <input name="adminVolunteerName" required className={inputCls} />
          </Field>
        </Section>

        <SubmitButton
          label="Register Participant"
          pendingLabel="Registering..."
          className="w-full sm:w-auto self-end bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3 px-10 rounded-xl transition"
        />
      </form>
    </div>
  );
}
