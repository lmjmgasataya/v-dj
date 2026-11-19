import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const CARDS = [
  { href: "/l113-portal/potential-students", icon: "🎓", title: "Potential L113 Students", text: "Active leaders ready for Leadership 113" },
  { href: "/l113-portal/batches", icon: "👥", title: "Batches", text: "Class batches and their students" },
  { href: "/l113-portal/schedule", icon: "🗓️", title: "Schedule", text: "Topics, dates and teachers" },
  { href: "/l113-portal/topics", icon: "📚", title: "Topics", text: "Topic names for the schedule" },
  { href: "/l113-portal/teachers", icon: "🧑‍🏫", title: "Teachers", text: "Teachers and facilitators for the schedule" },
  { href: "/l113-portal/check-in", icon: "📷", title: "Check In", text: "QR check-in with On Time / Late / Absent" },
  { href: "/l113-portal/qr-codes", icon: "🔳", title: "Student QR Codes", text: "Each student's check-in QR code" },
  { href: "/l113-portal/spiritual-disciplines", icon: "📖", title: "Spiritual Disciplines Calendar", text: "Students' monthly Bible reading, soul winning and prayer" },
  { href: "/l113-portal/student-evaluation", icon: "📝", title: "Student Evaluation", text: "Students' scores per topic, through a shared link" },
  { href: "/l113-portal/teacher-evaluation", icon: "⭐", title: "Teacher Evaluation", text: "Students' ratings of each teacher/facilitator" },
];

export default function L113PortalPage() {
  return (
    <>
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "L113 Portal" }]} />
        <h2 className="text-2xl font-bold text-gray-900">L113 Portal</h2>
        <p className="text-sm text-gray-500 mt-0.5">Leadership 113 students and candidates.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
          >
            <span className="text-4xl">{c.icon}</span>
            <span className="text-lg font-semibold text-gray-900 text-center">{c.title}</span>
            <span className="text-sm text-gray-500 text-center">{c.text}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
