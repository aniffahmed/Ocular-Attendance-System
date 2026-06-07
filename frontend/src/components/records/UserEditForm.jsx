export function UserEditForm({ isOpen, editUser, setEditUser, saveEditUser, departments = [] }) {
  return (
    <div
      data-edit-form
      className={`overflow-hidden rounded-xl border transition-all duration-300 ${
        isOpen ? "max-h-[520px] border-indigo-500 bg-indigo-950/20 p-4 opacity-100" : "max-h-0 border-transparent p-0 opacity-0"
      }`}
    >
      {isOpen && (
        <form onSubmit={saveEditUser} className="grid gap-2 md:grid-cols-2">
          <p className="md:col-span-2 text-sm font-semibold text-indigo-200">Edit account</p>
          <p className="md:col-span-2 text-xs text-slate-400">Role hierarchy: authorised admin, staff, student, parent.</p>
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="User ID"
            value={editUser.user_code}
            onChange={(e) => setEditUser({ ...editUser, user_code: e.target.value.toUpperCase() })}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="Email"
            type="email"
            value={editUser.email}
            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="Full name"
            value={editUser.full_name}
            onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
          />
          <select
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            value={editUser.role}
            onChange={(e) => {
              const role = e.target.value;
              setEditUser({
                ...editUser,
                role,
                attendance_name: role === "student" ? editUser.attendance_name : "",
              });
            }}
          >
            <option value="staff">Staff</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="attendance_name"
            value={editUser.attendance_name}
            onChange={(e) => setEditUser({ ...editUser, attendance_name: e.target.value })}
            disabled={editUser.role !== "student"}
          />
          <select
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            value={editUser.department_code || ""}
            onChange={(e) => setEditUser({ ...editUser, department_code: e.target.value })}
          >
            <option value="">Department (optional)</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code}
              </option>
            ))}
          </select>
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="New password"
            type="password"
            value={editUser.password}
            onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
          />
          <button
            type="submit"
            className="md:col-span-2 rounded bg-indigo-200 px-3 py-2 text-sm font-semibold text-slate-900"
          >
            Save Changes
          </button>
        </form>
      )}
    </div>
  );
}
