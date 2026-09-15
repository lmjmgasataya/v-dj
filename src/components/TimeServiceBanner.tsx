export function TimeServiceBanner({ timeService }: { timeService?: string }) {
  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800">
      Showing data for: <span className="font-semibold">{timeService ?? "No service assigned"}</span>
    </div>
  );
}
