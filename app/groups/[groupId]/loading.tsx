import { AppShell } from "@/components/ui/AppShell";

export default function GroupLoading() {
  return (
    <AppShell>
      <div className="mb-10">
        <div className="skeleton h-4 w-24 rounded-full" />
        <div className="skeleton mt-5 h-9 w-56 rounded-lg" />
        <div className="skeleton mt-3 h-4 w-24 rounded-full" />
      </div>
      <div className="card mb-8 h-36 p-6">
        <div className="skeleton h-full w-full" />
      </div>
      <div className="card mb-8 p-6">
        <div className="skeleton mb-5 h-5 w-20 rounded-full" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl2" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
