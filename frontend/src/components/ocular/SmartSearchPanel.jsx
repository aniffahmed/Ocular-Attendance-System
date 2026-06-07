import { Sparkles } from "lucide-react";

export function SmartSearchPanel({
  question,
  setQuestion,
  onSubmit,
  chatLoading,
  chatError,
  chatResult,
}) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-slate-900 to-slate-900/80 p-5 shadow-lg shadow-blue-950/40">
      <div className="mb-3 flex items-center gap-2 text-blue-300">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Smart search</span>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          id="ocular-smart-search"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='Try: "Who attended on 2026-03-16?"'
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={chatLoading}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {chatLoading ? "Thinking…" : "Ask Ocular"}
        </button>
      </form>
      {chatError && (
        <div className="mt-3 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{chatError}</div>
      )}
      {chatResult && (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-sm">
          <p className="text-slate-300">{chatResult.answer}</p>
        </div>
      )}
    </div>
  );
}
