"use client";

import { useState, useEffect, useRef } from "react";
import { registerParticipant } from "./actions";
import { Section, Field, RadioOption, CheckboxOption, inputCls, selectCls, SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";
import { DatePickerField } from "@/components/DatePickerField";
import { VgLeaderFields } from "@/components/VgLeaderFields";
import { DisciplerFields } from "@/components/DisciplerFields";
import { SubmitButton } from "@/components/SubmitButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

interface Props {
  vgLeaderAutocomplete: boolean;
  disciplerAutocomplete: boolean;
  newDatePicker: boolean;
}

export function RegisterForm({ vgLeaderAutocomplete, disciplerAutocomplete, newDatePicker }: Props) {
  const [previousChurch, setPreviousChurch] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [isDoneWithVictoryWeekend, setIsDoneWithVictoryWeekend] = useState(false);

  const needsVictoryDate = registrationFee === "C" || registrationFee === "D";
  const isAB = registrationFee === "A" || registrationFee === "B";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend;

  const isDirty = useRef(false);
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

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
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Register" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Participant Registration</h2>
        <p className="text-sm text-gray-500 mt-1">
          All fields marked with <span className="text-red-500">*</span> are required.
        </p>
      </div>

      <form
        action={registerParticipant}
        onChange={() => { isDirty.current = true; }}
        onSubmit={() => { isDirty.current = false; }}
        className="flex flex-col gap-6"
      >
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-700">
            I will register for: <span className="text-red-500">*</span>
            <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Important</span>
          </p>
          <select
            name="registrationFee"
            required
            className={selectCls}
            value={registrationFee}
            onChange={(e) => {
              setRegistrationFee(e.target.value);
              setIsDoneWithVictoryWeekend(false);
            }}
          >
            <option value="">-- Select --</option>
            {FEE_CATEGORIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
            ))}
          </select>
          {isAB && (
            <CheckboxOption
              name="isDoneWithVictoryWeekend"
              checked={isDoneWithVictoryWeekend}
              onChange={(e) => setIsDoneWithVictoryWeekend(e.target.checked)}
              align="center"
            >
              Have you gone through Victory Weekend before?
            </CheckboxOption>
          )}
        </div>

        <Section title="Participant Information">
          {needsVictoryDate && (
            <div className="sm:col-span-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-4 flex flex-col gap-1">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Required</p>
              <p className="text-xs text-amber-600 mb-2">Please enter the date when the participant completed Victory Weekend.</p>
              <Field label="Victory Weekend Date" required>
                <DatePickerField name="victoryDate" required max={today} className={inputCls} newDatePicker={newDatePicker} />
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
          <Field label="Facebook / Messenger Name" required className="sm:col-span-2">
            <input name="facebookMessengerName" required className={inputCls} />
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

          {!showVgLeader && (
            <Field label="I have completed One2One" required className="sm:col-span-2">
              <div className="flex flex-col gap-2 mt-1">
                <RadioOption name="completedOne2One" value="yes" label="Yes" required />
                <RadioOption name="completedOne2One" value="no" label="No, but I will complete it before Victory Day" />
              </div>
            </Field>
          )}

          {isAB && (
            <Field label="I will undergo water baptism" required className="sm:col-span-2">
              <div className="flex gap-6 mt-1">
                <RadioOption name="willUndergoWaterBaptism" value="yes" label="Yes" required />
                <RadioOption name="willUndergoWaterBaptism" value="no" label="No" />
              </div>
            </Field>
          )}

          {!showVgLeader && (
            <Field label="Previous Church" required className="sm:col-span-2">
              <div className="flex flex-col gap-2 mt-1">
                <RadioOption
                  name="previousChurch"
                  value="Roman Catholic"
                  label="Roman Catholic"
                  checked={previousChurch === "Roman Catholic"}
                  onChange={() => setPreviousChurch("Roman Catholic")}
                />
                <RadioOption
                  name="previousChurch"
                  value="Others"
                  label="Others"
                  checked={previousChurch === "Others"}
                  onChange={() => setPreviousChurch("Others")}
                />
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
          )}

          <Field label="Preferred Name on ID" required className="sm:col-span-2">
            <input name="preferredNameOnId" required className={inputCls} />
          </Field>
        </Section>

        {showVgLeader ? (
          <Section title="Victory Group Leader Information">
            <VgLeaderFields enabled={vgLeaderAutocomplete} />
          </Section>
        ) : isAB ? (
          <Section title="One2One Discipler Information" important="To be filled up by the One2One discipler">
            <DisciplerFields enabled={disciplerAutocomplete} />
            <div className="sm:col-span-2">
              <CheckboxOption name="confirmedReadiness" required align="start" labelClassName="text-red-800 font-bold">
                I am confirming that the participant is ready to join Victory Day, that we will
                complete/have completed One2One and Preparing for Victory before the day of the event.
              </CheckboxOption>
            </div>
          </Section>
        ) : null}

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
            <input name="acknowledgementReceiptNumber" required autoComplete="off" className={inputCls} />
          </Field>
          <Field label="Name of Admin Service Team Member" required className="sm:col-span-2">
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
