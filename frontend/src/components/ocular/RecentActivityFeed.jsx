export function RecentActivityFeed({ rows }) {
  return (
    <div className="flex max-h-[360px] flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h3>
        <p className="text-xs text-slate-500">Latest check-ins from attendance log</p>
      </div>
      <div className="custom-scrollbar flex-1 space-y-0 overflow-y-auto">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No activity yet.</p>
        ) : (
          rows.map((r, i) => {
            const label = String(r.name || "").replaceAll("_", " ").trim() || "Unknown";
            const initials = label
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div
                key={`${r.id ?? i}-${r.date}-${r.time}`}
                className="flex items-center gap-3 border-b border-slate-100 px-5 py-3 last:border-0 dark:border-slate-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-slate-100">{label}</p>
                  <p className="text-xs text-slate-500">
                    {r.date} · {r.time || "—"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Recognized
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
