export function RecordsTable({ title, rows, onOpen, onEdit, onDelete, showEdit }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <p className="mb-3 text-sm font-semibold text-slate-100">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">No records.</p>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Email</th>
                <th className="px-2 py-2">Department</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-2 py-2">
                    <button type="button" className="text-cyan-300 hover:underline" onClick={() => onOpen(u.id)}>
                      {u.user_code || u.id}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <button type="button" className="text-cyan-200 hover:underline" onClick={() => onOpen(u.id)}>
                      {u.full_name || "-"}
                    </button>
                  </td>
                  <td className="px-2 py-2">{u.email}</td>
                  <td className="px-2 py-2">{u.department_code || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      {showEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
                          className="rounded bg-indigo-700 px-2 py-1 text-white hover:bg-indigo-600"
                        >
                          Edit
                        </button>
                      )}
                      {showEdit && u.role !== "institution" && (
                        <button
                          type="button"
                          onClick={() => {
                            const ok = window.confirm(`Delete user ${u.user_code || u.id}? This cannot be undone.`);
                            if (ok) onDelete?.(u.id);
                          }}
                          className="rounded bg-rose-700 px-2 py-1 text-white hover:bg-rose-600"
                        >
                          Delete
                        </button>
                      )}
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
