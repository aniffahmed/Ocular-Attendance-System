export function ParentAlertsPage({ parentAlerts, loadParentAlerts }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6">
      <h2 className="text-lg font-semibold text-white">Parent alerts (mock email)</h2>
      <p className="mt-1 text-sm text-rose-200/80">
        Triggered when linked student attendance falls below the server threshold.
      </p>
      <button
        type="button"
        onClick={loadParentAlerts}
        className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/40 px-4 py-2 text-sm text-rose-100 hover:bg-rose-950/60"
      >
        Refresh alerts
      </button>
      <ul className="mt-6 space-y-4">
        {parentAlerts.length === 0 ? (
          <li className="text-sm text-slate-400">No alerts yet.</li>
        ) : (
          parentAlerts.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 text-sm">
              <p className="font-medium text-white">{a.mock_email?.subject}</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{a.mock_email?.body}</p>
              <p className="mt-2 text-xs text-slate-500">
                {a.created_at} — {a.attendance_pct}%
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
