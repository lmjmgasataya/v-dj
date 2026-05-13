import Link from "next/link";
import { NewForm } from "./NewForm";

export default function NewVGLeaderPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Add VG Leader</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create a new Victory Group leader record</p>
        </div>
        <Link href="/vg-leaders" className="text-sm text-indigo-600 hover:underline">
          ← Back to list
        </Link>
      </div>
      <NewForm />
    </div>
  );
}
