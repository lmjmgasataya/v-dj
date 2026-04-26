import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">Welcome</h2>
        <p className="mt-2 text-gray-500">Manage registrations and check-ins for Discipleship Journey</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
        <Link
          href="/register"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📋</span>
          <span className="text-lg font-semibold text-gray-900">Register</span>
          <span className="text-sm text-gray-500 text-center">Enroll a new participant</span>
        </Link>
        <Link
          href="/participants"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">👥</span>
          <span className="text-lg font-semibold text-gray-900">Participants</span>
          <span className="text-sm text-gray-500 text-center">View and edit all records</span>
        </Link>
        <Link
          href="/admin"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">✅</span>
          <span className="text-lg font-semibold text-gray-900">Check-in</span>
          <span className="text-sm text-gray-500 text-center">Search and record attendance</span>
        </Link>
        <Link
          href="/sessions"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 hover:border-indigo-400 hover:shadow-md transition"
        >
          <span className="text-4xl">📅</span>
          <span className="text-lg font-semibold text-gray-900">Sessions</span>
          <span className="text-sm text-gray-500 text-center">View attendance per session</span>
        </Link>
      </div>
    </div>
  );
}
