export function UserProfileDrawer({ details, loading, onClose }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3" data-profile-view>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">Profile view</p>
        {details && (
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-slate-400">Loading...</p>
      ) : !details ? (
        <p className="text-xs text-slate-500">Click a name or ID to open profile details.</p>
      ) : (
        <div className="space-y-3 text-xs text-slate-200">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">ID</p><p>{details.user?.user_code || details.user?.id}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Role</p><p>{details.user?.role || "-"}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Email</p><p>{details.user?.email || "-"}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Name</p><p>{details.user?.full_name || "-"}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Department</p><p>{details.user?.department_code || "-"}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Attendance name</p><p>{details.user?.attendance_name || "-"}</p></div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2"><p className="text-slate-400">Created at</p><p>{details.user?.created_at || "-"}</p></div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2">
              <p className="mb-1 text-slate-300">Linked parents</p>
              {(details.links?.parents || []).length === 0 ? (
                <p className="text-slate-500">No linked parents.</p>
              ) : (
                <ul className="space-y-1">{(details.links?.parents || []).map((p) => <li key={p.id}>{p.user_code || p.id} - {p.full_name || p.email}</li>)}</ul>
              )}
            </div>
            <div className="rounded border border-slate-700 bg-slate-950/50 p-2">
              <p className="mb-1 text-slate-300">Linked students</p>
              {(details.links?.students || []).length === 0 ? (
                <p className="text-slate-500">No linked students.</p>
              ) : (
                <ul className="space-y-1">{(details.links?.students || []).map((s) => <li key={s.id}>{s.user_code || s.id}</li>)}</ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
