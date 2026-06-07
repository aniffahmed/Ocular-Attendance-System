function badgeClasses(status) {
  if (status === "P") {
    return "border-emerald-500/50 bg-emerald-500/15 text-emerald-200";
  }
  return "border-rose-500/40 bg-rose-500/10 text-rose-200";
}

export function LedgerGrid({ periods = [], rows = [] }) {
  return (
    <div className="overflow-auto rounded-2xl border border-slate-700 bg-slate-900/60">
      <table className="min-w-[960px] table-fixed text-left text-xs text-slate-200">
        <thead className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur">
          <tr>
            <th className="w-36 px-3 py-3 font-semibold text-slate-100">Student ID</th>
            <th className="w-60 px-3 py-3 font-semibold text-slate-100">Student Name</th>
            <th className="w-28 px-3 py-3 font-semibold text-slate-100">Dept</th>
            {periods.map((p) => (
              <th key={p.period_number} className="w-28 px-3 py-3 text-center font-semibold text-slate-100">
                {p.label || `P${p.period_number}`}
              </th>
            ))}
            <th className="w-24 px-3 py-3 text-center font-semibold text-slate-100">Present</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.student_user_id} className="border-t border-slate-800 hover:bg-slate-800/40">
              <td className="truncate px-3 py-2.5 text-slate-300">{row.user_code || "-"}</td>
              <td className="truncate px-3 py-2.5 text-slate-100">{row.full_name || row.attendance_name || "-"}</td>
              <td className="truncate px-3 py-2.5 text-slate-300">{row.department_code || "-"}</td>
              {periods.map((p) => {
                const key = `P${p.period_number}`;
                const cell = row.periods?.[key] || { status: "A" };
                return (
                  <td key={`${row.student_user_id}-${key}`} className="px-3 py-2.5 text-center align-middle">
                    <span
                      className={`inline-flex min-w-8 items-center justify-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeClasses(cell.status)}`}
                      title={cell.status_raw || cell.status}
                    >
                      {cell.status}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-center text-slate-200">{row.present_count}</td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td colSpan={periods.length + 4} className="px-3 py-8 text-center text-sm text-slate-500">
                No students found for the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

