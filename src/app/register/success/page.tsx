import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
      <p className="text-gray-500 max-w-sm">
        The participant has been registered for Discipleship Journey. See you on Victory Day!
      </p>
      <div className="flex gap-4 mt-2">
        <Link
          href="/register"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Register Another
        </Link>
        <Link
          href="/"
          className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-6 rounded-lg border border-gray-300 transition"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
