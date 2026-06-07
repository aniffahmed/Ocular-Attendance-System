import { useMemo, useState } from "react";

export function ParentStudentLinkPanel({
  studentUsers,
  parentUsers,
  linkStudentId,
  setLinkStudentId,
  linkParentId,
  setLinkParentId,
  linkParent,
  links,
  unlinkParent,
}) {
  const [studentQuery, setStudentQuery] = useState("");
  const [parentQuery, setParentQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const q = String(studentQuery || "").trim().toLowerCase();
    if (!q) return studentUsers;
    return studentUsers.filter((u) =>
      [u.user_code, u.full_name, u.email, u.department_code, u.id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [studentUsers, studentQuery]);

  const filteredParents = useMemo(() => {
    const q = String(parentQuery || "").trim().toLowerCase();
    if (!q) return parentUsers;
    return parentUsers.filter((u) =>
      [u.user_code, u.full_name, u.email, u.department_code, u.id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [parentUsers, parentQuery]);

  const selectedStudent = useMemo(
    () => studentUsers.find((u) => String(u.id) === String(linkStudentId)) || null,
    [studentUsers, linkStudentId]
  );
  const selectedParent = useMemo(
    () => parentUsers.find((u) => String(u.id) === String(linkParentId)) || null,
    [parentUsers, linkParentId]
  );

  const linkKeySet = useMemo(
    () => new Set((links || []).map((l) => `${l.student_user_id}-${l.parent_user_id}`)),
    [links]
  );

  const alreadyLinked =
    selectedStudent && selectedParent
      ? linkKeySet.has(`${selectedStudent.id}-${selectedParent.id}`)
      : false;

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-semibold text-slate-100">Parent-Student Linking</p>
        <p className="text-xs text-slate-400">Pick a student and parent, then click link.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
          <p className="mb-2 text-xs font-medium text-sky-200">1) Select Student</p>
          <input
            className="mb-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
            placeholder="Search student by code, name, email"
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
          />
          <div className="max-h-40 space-y-1 overflow-auto">
            {filteredStudents.map((u) => {
              const active = String(linkStudentId) === String(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setLinkStudentId(String(u.id))}
                  className={`w-full rounded border px-2 py-1.5 text-left text-xs ${
                    active
                      ? "border-sky-400 bg-sky-500/15 text-sky-100"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <p className="font-medium">{u.user_code || u.id} - {u.full_name || "-"}</p>
                  <p className="text-[11px] text-slate-400">{u.email} | {u.department_code || "No dept"}</p>
                </button>
              );
            })}
            {!filteredStudents.length && <p className="text-xs text-slate-500">No student match.</p>}
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-2">
          <p className="mb-2 text-xs font-medium text-emerald-200">2) Select Parent</p>
          <input
            className="mb-2 w-full rounded border border-slate-600 bg-slate-950 px-2 py-1.5 text-xs text-white"
            placeholder="Search parent by code, name, email"
            value={parentQuery}
            onChange={(e) => setParentQuery(e.target.value)}
          />
          <div className="max-h-40 space-y-1 overflow-auto">
            {filteredParents.map((u) => {
              const active = String(linkParentId) === String(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setLinkParentId(String(u.id))}
                  className={`w-full rounded border px-2 py-1.5 text-left text-xs ${
                    active
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  <p className="font-medium">{u.user_code || u.id} - {u.full_name || "-"}</p>
                  <p className="text-[11px] text-slate-400">{u.email}</p>
                </button>
              );
            })}
            {!filteredParents.length && <p className="text-xs text-slate-500">No parent match.</p>}
          </div>
        </div>
      </div>

      <form onSubmit={linkParent} className="grid gap-2 rounded-lg border border-slate-700 bg-slate-950/40 p-3 md:grid-cols-3">
        <div className="text-xs text-slate-300">
          <p className="text-slate-400">Student</p>
          <p>{selectedStudent ? `${selectedStudent.user_code || selectedStudent.id} - ${selectedStudent.full_name || selectedStudent.email}` : "Not selected"}</p>
        </div>
        <div className="text-xs text-slate-300">
          <p className="text-slate-400">Parent</p>
          <p>{selectedParent ? `${selectedParent.user_code || selectedParent.id} - ${selectedParent.full_name || selectedParent.email}` : "Not selected"}</p>
        </div>
        <div className="flex items-center gap-2 md:justify-end">
          <button
            type="submit"
            disabled={!selectedStudent || !selectedParent || alreadyLinked}
            className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {alreadyLinked ? "Already linked" : "Link selected pair"}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkStudentId("");
              setLinkParentId("");
            }}
            className="rounded border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="max-h-52 overflow-auto rounded border border-slate-700">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-800">
            <tr>
              <th className="px-2 py-2">Student</th>
              <th className="px-2 py-2">Parent</th>
              <th className="px-2 py-2">Linked at</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(links || []).length === 0 ? (
              <tr><td className="px-2 py-2 text-slate-500" colSpan={4}>No links.</td></tr>
            ) : (
              (links || []).map((l) => (
                <tr key={`${l.student_user_id}-${l.parent_user_id}`} className="border-t border-slate-800">
                  <td className="px-2 py-2">
                    <p>{l.student_user_code || l.student_user_id}</p>
                    <p className="text-[11px] text-slate-500">{l.student_full_name || l.student_email || "-"}</p>
                  </td>
                  <td className="px-2 py-2">
                    <p>{l.parent_user_code || l.parent_user_id}</p>
                    <p className="text-[11px] text-slate-500">{l.parent_full_name || l.parent_email || "-"}</p>
                  </td>
                  <td className="px-2 py-2">{l.linked_at || "-"}</td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => unlinkParent(l.student_user_id, l.parent_user_id)}
                      className="rounded bg-rose-700 px-2 py-1 text-white hover:bg-rose-600"
                    >
                      Unlink
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
