const TABS = [
  { id: "students", label: "Students" },
  { id: "staff", label: "Staff" },
  { id: "parents", label: "Parents" },
  { id: "manual-review", label: "Manual Review" },
];

export function RecordsTabs({ activeTab, setActiveTab }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/50 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={`rounded-lg px-4 py-2 text-sm transition ${
            activeTab === tab.id
              ? "bg-cyan-500/20 text-cyan-200"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
