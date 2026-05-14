import { NewForm } from "./NewForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function NewVGLeaderPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leaders", href: "/vg-leaders" }, { label: "Add Leader" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Add VG Leader</h2>
        <p className="text-sm text-gray-500 mt-0.5">Create a new Victory Group leader record</p>
      </div>
      <NewForm />
    </div>
  );
}
