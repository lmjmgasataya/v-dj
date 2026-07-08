"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { registerParticipant } from "./actions";
import { Section, Field, RadioOption, CheckboxOption, inputCls, selectCls, SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";
import { DatePickerField } from "@/components/DatePickerField";
import { VgLeaderFields } from "@/components/VgLeaderFields";
import { DisciplerFields } from "@/components/DisciplerFields";
import { Breadcrumbs } from "@/components/Breadcrumbs";

function getDefaultService(): string {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Manila" }).format(new Date()),
    10,
  );
  if (hour === 10) return "9AM - Mandurriao";
  if (hour === 11) return "10AM - Lapaz";
  if (hour === 12) return "11AM - Mandurriao";
  if (hour === 14) return "1PM - Lapaz";
  if (hour === 15) return "2PM - Mandurriao";
  if (hour === 17) return "4PM - Mandurriao";
  if (hour === 19) return "6PM - Mandurriao";
  return "";
}

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

function ReviewRow({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h3 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h3>
      </div>
      <dl className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</dl>
    </div>
  );
}

const STUDENT_LIFESTAGES = ["Student (JHS/SHS)", "Student (College)"];

export function RegisterForm({ vgLeaderAutocomplete, disciplerAutocomplete, newDatePicker }: Props) {
  const [previousChurch, setPreviousChurch] = useState("");
  const [registrationFee, setRegistrationFee] = useState("");
  const [lifestage, setLifestage] = useState("");
  const [isDoneWithVictoryWeekend, setIsDoneWithVictoryWeekend] = useState<boolean | null>(null);
  const [worshipService, setWorshipService] = useState(() => getDefaultService());
  const [step, setStep] = useState<"form" | "review">("form");
  const [captured, setCaptured] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const needsVictoryDate = registrationFee === "C" || registrationFee === "D";
  const isAB = registrationFee === "A" || registrationFee === "B";
  const showVgLeader = needsVictoryDate || isDoneWithVictoryWeekend === true;

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

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(formRef.current!);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { data[k] = v as string; });
    setCaptured(data);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleConfirm() {
    isDirty.current = false;
    const fd = new FormData();
    Object.entries(captured).forEach(([k, v]) => fd.set(k, v));
    startTransition(() => registerParticipant(fd));
  }

  // Derived values for review display
  const rCat = FEE_CATEGORIES.find((f) => f.value === captured.registrationFee);
  const rIsAB = captured.registrationFee === "A" || captured.registrationFee === "B";
  const rNeedsVictoryDate = captured.registrationFee === "C" || captured.registrationFee === "D";
  const rIsDoneVW = rIsAB && captured.isDoneWithVictoryWeekend === "yes";
  const rShowVgLeader = rNeedsVictoryDate || rIsDoneVW;
  const rPreviousChurch =
    captured.previousChurch === "Others" ? captured.previousChurchOther : captured.previousChurch;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Register" }]} />
        <h2 className="text-2xl font-bold text-gray-900">
          {step === "review" ? "Review Registration" : "Participant Registration"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {step === "form" ? (
            <>All fields marked with <span className="text-red-500">*</span> are required.</>
          ) : (
            "Please review the information below before confirming."
          )}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 text-sm select-none">
        <span className={`flex items-center gap-1.5 font-medium ${step === "form" ? "text-[#00428E]" : "text-gray-400"}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === "form" ? "bg-[#00428E] text-white" : "bg-gray-300 text-gray-500"}`}>1</span>
          Fill Out Form
        </span>
        <span className="text-gray-300">›</span>
        <span className={`flex items-center gap-1.5 font-medium ${step === "review" ? "text-[#00428E]" : "text-gray-400"}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${step === "review" ? "bg-[#00428E] text-white" : "bg-gray-300 text-gray-500"}`}>2</span>
          Review
        </span>
        <span className="text-gray-300">›</span>
        <span className="flex items-center gap-1.5 font-medium text-gray-400">
          <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold bg-gray-300 text-gray-500">3</span>
          Done
        </span>
      </div>

      {/* ---- FORM (always mounted; hidden while reviewing so values are preserved) ---- */}
      <div className={step === "review" ? "hidden" : ""}>
        <form
          ref={formRef}
          onSubmit={handleFormSubmit}
          onChange={() => { isDirty.current = true; }}
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
                setIsDoneWithVictoryWeekend(null);
              }}
            >
              <option value="">-- Select --</option>
              {FEE_CATEGORIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label} — {f.amount}</option>
              ))}
            </select>
            {isAB && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-gray-700">Have you gone through Victory Weekend before?</span>
                <div className="flex gap-4">
                  <RadioOption name="isDoneWithVictoryWeekend" value="yes" label="Yes" required checked={isDoneWithVictoryWeekend === true} onChange={() => setIsDoneWithVictoryWeekend(true)} />
                  <RadioOption name="isDoneWithVictoryWeekend" value="no" label="No" checked={isDoneWithVictoryWeekend === false} onChange={() => setIsDoneWithVictoryWeekend(false)} />
                </div>
              </div>
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
            <Field label="Facebook / Messenger Name" required>
              <input name="facebookMessengerName" required className={inputCls} />
            </Field>
            <Field label="Email Address">
              <input name="email" type="email" className={inputCls} />
            </Field>
            <Field label="Lifestage" required>
              <select
                name="lifestage"
                required
                className={selectCls}
                value={lifestage}
                onChange={(e) => setLifestage(e.target.value)}
              >
                <option value="">-- Select --</option>
                {LIFESTAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            {STUDENT_LIFESTAGES.includes(lifestage) && (
              <Field label="School" required>
                <input name="school" required className={inputCls} />
              </Field>
            )}
            <Field label="Age" required>
              <input
                name="age"
                required
                type="number"
                min={13}
                max={120}
                className={inputCls}
                onInvalid={(e) => {
                  const input = e.currentTarget;
                  if (input.validity.rangeUnderflow) {
                    input.setCustomValidity("Participants must be at least 13 years old.");
                  } else {
                    input.setCustomValidity("");
                  }
                }}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
              />
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
            <Field label="Worship Service Registered" required>
              <select
                name="worshipServiceRegistered"
                required
                className={selectCls}
                value={worshipService}
                onChange={(e) => setWorshipService(e.target.value)}
              >
                <option value="">-- Select --</option>
                {SERVICE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Acknowledgement Receipt Number" required>
              <input name="acknowledgementReceiptNumber" required autoComplete="off" className={inputCls} />
            </Field>
            <Field label="Name of Admin Service Team Member" required className="sm:col-span-2">
              <input name="adminVolunteerName" required className={inputCls} />
            </Field>
          </Section>

          <button
            type="submit"
            className="w-full sm:w-auto self-end bg-[#00428E] hover:bg-[#003578] text-white font-semibold py-3 px-10 rounded-xl transition"
          >
            Review Registration →
          </button>
        </form>
      </div>

      {/* ---- REVIEW PANEL ---- */}
      {step === "review" && (
        <div className="flex flex-col gap-6">
          <ReviewSection title="Registration Category">
            <ReviewRow
              label="Registering for"
              value={rCat ? `${rCat.label} — ${rCat.amount}` : captured.registrationFee}
              span
            />
            {rIsAB && (
              <ReviewRow
                label="Gone through Victory Weekend before"
                value={captured.isDoneWithVictoryWeekend === "yes" ? "Yes" : "No"}
                span
              />
            )}
          </ReviewSection>

          <ReviewSection title="Participant Information">
            {rNeedsVictoryDate && (
              <ReviewRow label="Victory Weekend Date" value={captured.victoryDate} span />
            )}
            <ReviewRow label="Last Name" value={captured.lastName} />
            <ReviewRow label="First Name" value={captured.firstName} />
            {captured.middleInitial && (
              <ReviewRow label="Middle Initial" value={captured.middleInitial} />
            )}
            <ReviewRow label="Mobile Number" value={captured.mobileNumber} />
            <ReviewRow label="Facebook / Messenger Name" value={captured.facebookMessengerName} />
            {captured.email && <ReviewRow label="Email Address" value={captured.email} />}
            <ReviewRow label="Lifestage" value={captured.lifestage} />
            {STUDENT_LIFESTAGES.includes(captured.lifestage) && (
              <ReviewRow label="School" value={captured.school} />
            )}
            <ReviewRow label="Age" value={captured.age} />
            <ReviewRow label="Gender" value={captured.gender} />
            <ReviewRow label="Service Attending" value={captured.serviceAttending} />
            {!rShowVgLeader && (
              <ReviewRow
                label="Completed One2One"
                value={captured.completedOne2One === "yes" ? "Yes" : "No, will complete before Victory Day"}
              />
            )}
            {rIsAB && (
              <ReviewRow
                label="Will undergo water baptism"
                value={captured.willUndergoWaterBaptism === "yes" ? "Yes" : "No"}
              />
            )}
            {!rShowVgLeader && (
              <ReviewRow label="Previous Church" value={rPreviousChurch} />
            )}
            <ReviewRow label="Preferred Name on ID" value={captured.preferredNameOnId} span />
          </ReviewSection>

          {rShowVgLeader ? (
            <ReviewSection title="Victory Group Leader Information">
              <ReviewRow label="Last Name" value={captured.vgLeaderLastName} />
              <ReviewRow label="First Name" value={captured.vgLeaderFirstName} />
              <ReviewRow label="Mobile Number" value={captured.vgLeaderMobileNumber} />
              <ReviewRow label="Facebook / Messenger Name" value={captured.vgLeaderMessengerName} />
            </ReviewSection>
          ) : (
            <ReviewSection title="One2One Discipler Information">
              <ReviewRow label="Last Name" value={captured.disciplerLastName} />
              <ReviewRow label="First Name" value={captured.disciplerFirstName} />
              <ReviewRow label="Mobile Number" value={captured.disciplerMobileNumber} />
              <ReviewRow label="Facebook / Messenger Name" value={captured.disciplerMessengerName} />
            </ReviewSection>
          )}

          <ReviewSection title="Payment &amp; Admin">
            <ReviewRow
              label="Fee Category"
              value={rCat ? `${rCat.label} — ${rCat.amount}` : captured.registrationFee}
            />
            <ReviewRow label="Worship Service Registered" value={captured.worshipServiceRegistered} />
            <ReviewRow label="AR Number" value={captured.acknowledgementReceiptNumber} />
            <ReviewRow label="Admin Service Team Member" value={captured.adminVolunteerName} span />
          </ReviewSection>

          <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep("form")}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-5 py-2.5 rounded-xl border border-gray-300 hover:border-gray-400 transition"
            >
              ← Back to Edit
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full sm:w-auto bg-[#00428E] hover:bg-[#003578] disabled:opacity-70 text-white font-semibold py-3 px-10 rounded-xl transition"
            >
              {isPending ? "Registering..." : "Confirm & Register"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
