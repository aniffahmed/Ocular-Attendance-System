export function LedgerFilters({
  departments = [],
  departmentCode,
  setDepartmentCode,
  dateValue,
  setDateValue,
  refreshLedger,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Department</span>
            <select
              value={departmentCode}
              onChange={(e) => setDepartmentCode(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Date</span>
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={refreshLedger}
          disabled={loading}
          className="rounded-lg border border-sky-500/70 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}

