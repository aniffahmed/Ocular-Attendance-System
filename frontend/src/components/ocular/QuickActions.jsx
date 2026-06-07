import { Camera, FileWarning, Play, UserPlus } from "lucide-react";

export function QuickActions({ onStartLive, onReport, onRegister, onReview }) {
  const btn =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-900/20 transition hover:bg-blue-500 active:scale-[0.99]";
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Quick actions</h3>
      <div className="flex flex-col gap-3">
        <button type="button" className={btn} onClick={onStartLive}>
          <Play className="h-4 w-4" />
          Start live session
        </button>
        <button type="button" className={btn} onClick={onReport}>
          <FileWarning className="h-4 w-4" />
          Generate report
        </button>
        <button type="button" className={btn} onClick={onRegister}>
          <UserPlus className="h-4 w-4" />
          Register new student
        </button>
        <button type="button" className={btn} onClick={onReview}>
          <Camera className="h-4 w-4" />
          Review flagged entries
        </button>
      </div>
    </div>
  );
}
