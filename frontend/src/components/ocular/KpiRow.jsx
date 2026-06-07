import { Activity, ClipboardList, Flag, Percent, Users } from "lucide-react";

export function KpiRow({
  liveActive,
  liveLabel = "CS101 — Computer Vision",
  presentFraction,
  overallRate,
  reviewQueue = 0,
  flagged = 0,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-lg shadow-emerald-900/20">
        <div className="flex items-center gap-2 text-emerald-100">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Live status</span>
        </div>
        <p className="mt-3 text-sm font-semibold leading-snug">
          {liveActive ? `System active: ${liveLabel}` : "Idle — start a live session"}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-500">
          <Users className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Students present</span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{presentFraction}</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-500">
          <Percent className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Overall rate</span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{overallRate}%</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-500">
          <ClipboardList className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Review queue</span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{reviewQueue}</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-500">
          <Flag className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Flagged</span>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{flagged}</p>
      </div>
    </div>
  );
}
