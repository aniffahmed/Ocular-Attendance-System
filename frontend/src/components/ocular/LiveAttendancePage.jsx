export function LiveAttendancePage({
  regName,
  setRegName,
  postMl,
  mlStatus,
  mlMsg,
  periodMinutes,
  setPeriodMinutes,
  requiredPercentage,
  setRequiredPercentage,
  departments,
  sessionDepartmentCode,
  setSessionDepartmentCode,
}) {
  const captureOn = !!mlStatus?.capture_running;
  const sessionOn = !!mlStatus?.session_running;
  const trainingOn = !!mlStatus?.training_running;

  const statusCards = [
    {
      title: "Capture",
      active: captureOn,
      activeText: "Camera collecting faces",
      idleText: "Ready for registration",
      tone: captureOn ? "border-cyan-400/60 bg-cyan-500/10" : "border-slate-700 bg-slate-900/40",
    },
    {
      title: "Live Attendance",
      active: sessionOn,
      activeText: "Recognition in progress",
      idleText: "Session is stopped",
      tone: sessionOn ? "border-emerald-400/60 bg-emerald-500/10" : "border-slate-700 bg-slate-900/40",
    },
    {
      title: "Training",
      active: trainingOn,
      activeText: "Model update running",
      idleText: "Model is up to date",
      tone: trainingOn ? "border-amber-400/60 bg-amber-500/10" : "border-slate-700 bg-slate-900/40",
    },
  ];

  const stack = ["Flask API", "OpenCV", "RetinaFace", "FaceNet", "SVM Classifier", "SQLite"];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-700 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.18),_transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] p-6 shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Attendance Control Center</h2>
            <p className="text-sm text-slate-300">
              Manage capture, training, and live attendance with period-based threshold controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stack.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {statusCards.map((card) => (
            <div key={card.title} className={`rounded-xl border p-4 ${card.tone}`}>
              <p className="text-xs uppercase tracking-wide text-slate-300">{card.title}</p>
              <p className="mt-1 text-sm font-medium text-white">
                {card.active ? card.activeText : card.idleText}
              </p>
              <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs ${card.active ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"}`}>
                {card.active ? "Active" : "Idle"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Class minutes</label>
            <input
              type="number"
              min="1"
              max="240"
              value={periodMinutes}
              onChange={(e) => setPeriodMinutes(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Required %</label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={requiredPercentage}
              onChange={(e) => setRequiredPercentage(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Student folder name</label>
            <input
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              placeholder="e.g. john_doe"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Session department</label>
            <select
              value={sessionDepartmentCode || ""}
              onChange={(e) => setSessionDepartmentCode(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">All departments</option>
              {(departments || []).map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => postMl("/api/register", { student_name: regName })}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white"
          >
            Start Register
          </button>
          <button
            type="button"
            onClick={() => postMl("/api/stop_capture")}
            className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Stop Capture
          </button>
          <button
            type="button"
            onClick={() => postMl("/api/train")}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Train Model
          </button>
          <button
            type="button"
            onClick={() =>
              postMl("/api/start_session", {
                period_minutes: Number(periodMinutes),
                required_percentage: Number(requiredPercentage),
                department_code: sessionDepartmentCode || null,
              })
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Start Live Session
          </button>
          <button
            type="button"
            onClick={() => postMl("/api/stop_session")}
            className="rounded-lg border border-red-400/50 bg-red-950/40 px-4 py-2 text-sm text-red-200 hover:bg-red-950/60"
          >
            Stop Session
          </button>
        </div>

        {mlMsg && <p className="mt-2 text-sm text-amber-100">{mlMsg}</p>}
      </div>
    </div>
  );
}
