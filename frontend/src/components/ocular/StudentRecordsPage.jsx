import { AccountsRecordsPage } from "../records/AccountsRecordsPage.jsx";
import { useMemo } from "react";

export function StudentRecordsPage(props) {
  const { attendance, loading, loadAttendance } = props;
  const departmentBuckets = useMemo(() => {
    const acc = new Map();
    for (const row of attendance || []) {
      const key = String(row.department_code || "UNASSIGNED").toUpperCase();
      if (!acc.has(key)) {
        acc.set(key, { department_code: key, total: 0, present: 0, partial_review: 0, absent: 0 });
      }
      const item = acc.get(key);
      item.total += 1;
      const status = String(row.status || "present").toLowerCase();
      if (status === "present") item.present += 1;
      else if (status === "partial_review") item.partial_review += 1;
      else if (status === "absent") item.absent += 1;
    }
    return [...acc.values()].sort((a, b) => a.department_code.localeCompare(b.department_code));
  }, [attendance]);

  return (
    <div className="space-y-6">
      <AccountsRecordsPage {...props} />

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Attendance Records</h2>
          <button
            type="button"
            onClick={loadAttendance}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
        {!loading && departmentBuckets.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {departmentBuckets.map((bucket) => (
              <div key={bucket.department_code} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-xs text-slate-200">
                <p className="font-semibold text-sky-200">{bucket.department_code}</p>
                <p className="mt-1 text-slate-300">Total: {bucket.total}</p>
                <p className="text-emerald-300">Present: {bucket.present}</p>
                <p className="text-amber-300">Review: {bucket.partial_review}</p>
                <p className="text-rose-300">Absent: {bucket.absent}</p>
              </div>
            ))}
          </div>
        )}
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : attendance.length === 0 ? (
          <p className="text-sm text-slate-500">No rows.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">First seen</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Tracked mins</th>
                  <th className="px-4 py-3">Required mins</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                    <td className="px-4 py-3">{row.id}</td>
                    <td className="px-4 py-3">{String(row.name || "").replaceAll("_", " ")}</td>
                    <td className="px-4 py-3">{row.date}</td>
                    <td className="px-4 py-3">{row.time || "-"}</td>
                    <td className="px-4 py-3">{row.period_number || "-"}</td>
                    <td className="px-4 py-3">{row.department_code || "-"}</td>
                    <td className="px-4 py-3">{row.duration_minutes ?? "-"}</td>
                    <td className="px-4 py-3">{row.required_minutes ?? "-"}</td>
                    <td className="px-4 py-3">{String(row.status || "present").replaceAll("_", " ")}</td>
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
