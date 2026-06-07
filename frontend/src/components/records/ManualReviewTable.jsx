export function ManualReviewTable({ reviewLoading, reviewQueue, loadReviewQueue, onDecision }) {
  return (
    <div className="rounded-2xl border border-amber-700/70 bg-amber-950/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-100">Manual Review Queue</p>
        <button
          type="button"
          onClick={loadReviewQueue}
          className="rounded-lg border border-amber-500/70 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-900/50"
        >
          Refresh queue
        </button>
      </div>
      {reviewLoading ? (
        <p className="text-xs text-amber-100/70">Loading...</p>
      ) : reviewQueue.length === 0 ? (
        <p className="text-xs text-amber-100/70">No sessions are pending review.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-amber-700/60">
          <table className="min-w-full text-left text-xs text-amber-50">
            <thead className="bg-amber-900/40 text-amber-100">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Tracked</th>
                <th className="px-3 py-2">Required</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((row) => (
                <tr key={row.id} className="border-t border-amber-700/50 hover:bg-amber-900/25">
                  <td className="px-3 py-2">{String(row.student_full_name || row.name || "").replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.duration_minutes ?? "-"} min</td>
                  <td className="px-3 py-2">{row.required_minutes ?? "-"} min</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => onDecision(row.id, "present")} className="rounded bg-emerald-600 px-2 py-1 text-white">Approve</button>
                      <button type="button" onClick={() => onDecision(row.id, "absent")} className="rounded bg-rose-700 px-2 py-1 text-white">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
