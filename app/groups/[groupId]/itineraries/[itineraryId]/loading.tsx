import { AppShell } from "@/components/ui/AppShell";

export default function ItineraryLoading() {
  return (
    <AppShell>
      <div className="mb-10">
        <div className="skeleton h-4 w-28 rounded-full" />
        <div className="skeleton mt-5 h-9 w-64 rounded-lg" />
        <div className="skeleton mt-4 h-6 w-40 rounded-full" />
      </div>
      <div className="card mb-8 h-20 p-6">
        <div className="skeleton h-full w-full" />
      </div>
      <ul className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i} className="card overflow-hidden">
            <div className="skeleton h-40 w-full rounded-none rounded-t-xl2" />
            <div className="space-y-2 p-5">
              <div className="skeleton h-5 w-2/3 rounded-lg" />
              <div className="skeleton h-4 w-1/3 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
