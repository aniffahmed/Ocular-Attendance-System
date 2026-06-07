export function PlaceholderPage({ title, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{subtitle || "This module will ship in a future iteration."}</p>
    </div>
  );
}
