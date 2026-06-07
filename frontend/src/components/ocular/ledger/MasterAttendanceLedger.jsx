import { useCallback, useEffect, useState } from "react";
import { LedgerFilters } from "./LedgerFilters.jsx";
import { LedgerGrid } from "./LedgerGrid.jsx";

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MasterAttendanceLedger({ authFetch, departments = [] }) {
  const [departmentCode, setDepartmentCode] = useState("");
  const [dateValue, setDateValue] = useState(todayIsoDate());
  const [rows, setRows] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLedger = useCallback(async () => {
    if (!authFetch) return;
    try {
      setLoading(true);
      setError("");
      const qs = new URLSearchParams({ date: dateValue });
      if (departmentCode) qs.set("department_code", departmentCode);
      const res = await authFetch(`/api/class/attendance/ledger?${qs.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to load ledger.");
        setRows([]);
        return;
      }
      setRows(data.rows || []);
      setPeriods(data.periods || []);
      setSummary(data.summary || null);
    } catch {
      setError("Backend unreachable.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [authFetch, dateValue, departmentCode]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  useEffect(() => {
    const id = window.setInterval(loadLedger, 5000);
    return () => window.clearInterval(id);
  }, [loadLedger]);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-700 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,0.8))] p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-white">Master Attendance Ledger</h3>
        <p className="text-xs text-slate-400">
          Student rows with period-wise attendance for the selected date and department.
        </p>
      </div>

      <LedgerFilters
        departments={departments}
        departmentCode={departmentCode}
        setDepartmentCode={setDepartmentCode}
        dateValue={dateValue}
        setDateValue={setDateValue}
        refreshLedger={loadLedger}
        loading={loading}
      />

      {summary && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          <span className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1">
            Students: <strong className="text-slate-100">{summary.total_students}</strong>
          </span>
          {Object.entries(summary.period_totals || {}).map(([p, v]) => (
            <span key={p} className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1">
              {p}: <strong className="text-emerald-300">{v.present}</strong> P /{" "}
              <strong className="text-rose-300">{v.absent}</strong> A
            </span>
          ))}
        </div>
      )}

      <LedgerGrid periods={periods} rows={rows} />

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}

