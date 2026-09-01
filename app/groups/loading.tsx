import { AppShell } from "@/components/ui/AppShell";

// Renders the real AppShell rather than a skeleton of it: the persistent
// header is chrome, and chrome that dissolves into a shimmering bar on every
// navigation is worse than chrome that simply stays put.
export default function GroupsLoading() {
  return (
    <AppShell>
      <div className="mb-10">
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton mt-3 h-4 w-full max-w-md rounded-full" />
      </div>
      <div className="card mb-8 h-28 p-6">
        <div className="skeleton h-full w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-[68px] rounded-xl2" />
        ))}
      </div>
    </AppShell>
  );
}
