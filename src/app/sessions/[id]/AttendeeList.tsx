"use client";

import { useState } from "react";
import Link from "next/link";

export interface Attendee {
  checkInId: number;
  checkedInAt: Date;
  participantId: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  mobileNumber: string;
  facebookMessengerName: string | null;
  lifestage: string;
  birthday: string;
  gender: string;
  serviceAttending: string;
  preferredNameOnId: string;
  registrationFee: string;
  acknowledgementReceiptNumber: string;
  completedOne2One: boolean;
  willUndergoWaterBaptism: boolean;
  previousChurch: string;
  disciplerLastName: string;
  disciplerFirstName: string;
  disciplerMobileNumber: string;
  disciplerMessengerName: string | null;
}

function getAge(birthday: string): number {
  const today = new Date();
  const birth = new Date(birthday + "T00:00:00");
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function AttendeeList({ attendees }: { attendees: Attendee[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
      {attendees.map((a, i) => {
        const isExpanded = expandedId === a.checkInId;
        const fullName = `${a.lastName}, ${a.firstName}${a.middleInitial ? ` ${a.middleInitial}.` : ""}`;
        const checkInTime = new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
        const birthdayDisplay = new Date(a.birthday + "T00:00:00").toLocaleDateString("en-PH", {
          month: "short", day: "numeric", year: "numeric",
        });

        return (
          <div key={a.checkInId}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : a.checkInId)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{i + 1}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.mobileNumber} · {a.lifestage} · checked in at {checkInTime}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  a.registrationFee === "Discounted"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {a.registrationFee}
                </span>
                <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detail label="Preferred ID Name" value={a.preferredNameOnId} />
                  <Detail label="Birthday" value={`${birthdayDisplay} (age ${getAge(a.birthday)})`} />
                  <Detail label="Gender" value={a.gender} />
                  <Detail label="Service" value={a.serviceAttending} />
                  <Detail label="Facebook / Messenger" value={a.facebookMessengerName} />
                  <Detail label="Previous Church" value={a.previousChurch} />
                  <Detail label="Completed One2One" value={a.completedOne2One ? "Yes" : "No (will complete before Victory Day)"} />
                  <Detail label="Water Baptism" value={a.willUndergoWaterBaptism ? "Yes" : "No"} />
                  <Detail label="Receipt No." value={a.acknowledgementReceiptNumber} />
                </div>
                <div className="border-t border-gray-200 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Detail label="Discipler" value={`${a.disciplerLastName}, ${a.disciplerFirstName}`} />
                  <Detail label="Discipler Mobile" value={a.disciplerMobileNumber} />
                  <Detail label="Discipler Messenger" value={a.disciplerMessengerName} />
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-end">
                  <Link
                    href={`/participants/${a.participantId}/edit`}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Edit participant →
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
