import { Cpu, RefreshCcw, Save, SlidersHorizontal, Sparkles } from "lucide-react";

export function AiModelSettingsPage({
  policy,
  setPolicy,
  savePolicy,
  loadPolicy,
  mlStatus,
  postMl,
  refreshMlStatus,
  aiMsg,
}) {
  const updateField = (field, value) => {
    setPolicy({ ...policy, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-500/40 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.22),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.95))] p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">AI Model Settings</h2>
            <p className="mt-1 text-sm text-indigo-100/80">
              Configure attendance threshold policy and run model maintenance tasks.
            </p>
          </div>
          <Sparkles className="h-6 w-6 text-indigo-300" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Live Session</p>
            <p className="mt-1 text-sm font-medium text-white">
              {mlStatus?.session_running ? "Running" : "Stopped"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Training</p>
            <p className="mt-1 text-sm font-medium text-white">
              {mlStatus?.training_running ? "In Progress" : "Idle"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Capture</p>
            <p className="mt-1 text-sm font-medium text-white">
              {mlStatus?.capture_running ? "Active" : "Idle"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
        <div className="mb-4 flex items-center gap-2 text-slate-100">
          <SlidersHorizontal className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Attendance Policy</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Class minutes</span>
            <input
              type="number"
              min="1"
              max="240"
              value={policy.period_minutes}
              onChange={(e) => updateField("period_minutes", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Required %</span>
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={policy.required_percentage}
              onChange={(e) => updateField("required_percentage", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Recognition cooldown (sec)</span>
            <input
              type="number"
              min="1"
              max="120"
              value={policy.recognition_cooldown_seconds}
              onChange={(e) => updateField("recognition_cooldown_seconds", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">Gap tolerance (sec)</span>
            <input
              type="number"
              min="1"
              max="120"
              value={policy.session_gap_tolerance_seconds}
              onChange={(e) => updateField("session_gap_tolerance_seconds", e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={savePolicy}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Save className="h-4 w-4" />
            Save Policy
          </button>
          <button
            type="button"
            onClick={loadPolicy}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload Policy
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
        <div className="mb-4 flex items-center gap-2 text-slate-100">
          <Cpu className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Model Maintenance</h3>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => postMl("/api/train")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Train Model
          </button>
          <button
            type="button"
            onClick={refreshMlStatus}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Refresh Runtime Status
          </button>
        </div>

        {aiMsg && <p className="mt-3 text-sm text-indigo-200">{aiMsg}</p>}
      </div>
    </div>
  );
}
