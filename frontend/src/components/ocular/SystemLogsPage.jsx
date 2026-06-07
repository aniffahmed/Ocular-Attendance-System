import { AlertTriangle, Database, RefreshCcw, ShieldCheck } from "lucide-react";

const LEVEL_STYLE = {
  info: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-500/30",
  warn: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
  error: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
  debug: "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30",
};

export function SystemLogsPage({ logs, logsLoading, loadSystemLogs }) {
  const warnCount = logs.filter((x) => x.level === "warn").length;
  const errorCount = logs.filter((x) => x.level === "error").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">System Logs</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Unified operational timeline from attendance engine, parent alerts, and account lifecycle.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSystemLogs}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh Logs
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/70">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Database className="h-4 w-4" />
              <span className="text-xs">Total Entries</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{logs.length}</p>
          </div>
          <div className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Warnings</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-amber-200">{warnCount}</p>
          </div>
          <div className="rounded-xl border border-rose-700/50 bg-rose-900/20 p-4">
            <div className="flex items-center gap-2 text-rose-200">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs">Errors</span>
            </div>
            <p className="mt-1 text-2xl font-semibold text-rose-200">{errorCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
        {logsLoading ? (
          <p className="text-sm text-slate-400">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-400">No log entries found yet.</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-300 dark:border-slate-700">
            <table className="min-w-full text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="sticky top-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row, idx) => (
                  <tr key={`${row.ts}-${idx}`} className="border-t border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.ts || "-"}</td>
                    <td className="px-4 py-3 uppercase tracking-wide text-slate-500 dark:text-slate-400">{row.source || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${LEVEL_STYLE[row.level] || LEVEL_STYLE.debug}`}
                      >
                        {row.level || "debug"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{row.message || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
