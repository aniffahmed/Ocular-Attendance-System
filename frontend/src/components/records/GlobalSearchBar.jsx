export function GlobalSearchBar({ value, onChange }) {
  return (
    <input
      className="w-full min-w-[260px] rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
      placeholder="Search by name, ID, role, or email..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
