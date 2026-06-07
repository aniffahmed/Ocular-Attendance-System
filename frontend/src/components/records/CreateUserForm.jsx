export function CreateUserForm({ isOpen, newUser, setNewUser, createUser, departments = [] }) {
  return (
    <div
      data-create-user-form
      className={`overflow-hidden rounded-xl border transition-all duration-300 ${
        isOpen ? "max-h-[520px] border-emerald-500 bg-emerald-950/20 p-4 opacity-100" : "max-h-0 border-transparent p-0 opacity-0"
      }`}
    >
      {isOpen && (
        <form onSubmit={createUser} className="grid gap-2 md:grid-cols-2">
          <p className="md:col-span-2 text-sm font-semibold text-emerald-200">Create account</p>
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="Password"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
          />
          <input
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            placeholder="Full name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
          />
          <select
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="staff">Staff</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
          <select
            className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white"
            value={newUser.department_code || ""}
            onChange={(e) => setNewUser({ ...newUser, department_code: e.target.value })}
          >
            <option value="">Department (optional)</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.code}
              </option>
            ))}
          </select>
          {newUser.role === "student" && (
            <input
              className="rounded border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white md:col-span-2"
              placeholder="attendance_name"
              value={newUser.attendance_name}
              onChange={(e) => setNewUser({ ...newUser, attendance_name: e.target.value })}
              required
            />
          )}
          <button
            type="submit"
            className="md:col-span-2 rounded bg-emerald-200 px-3 py-2 text-sm font-semibold text-slate-900"
          >
            Create User
          </button>
        </form>
      )}
    </div>
  );
}
